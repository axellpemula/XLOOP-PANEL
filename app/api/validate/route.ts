import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getClientIp, readLimitedJson } from "@/lib/api/validate";
import { HWID_REGEX, KEY_REGEX, NONCE_REGEX, VALIDATE_LIMITS } from "@/lib/utils/constants";
import { signPayload, SigningNotConfiguredError, getPrivateKey } from "@/lib/utils/signing";
import type { LicenseKey } from "@/lib/utils/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ValidateBody {
  key: string;
  tool_slug: string;
  tool_version: string;
  hardware_id: string;
  nonce: string;
}

type Reason =
  | "invalid_request"
  | "invalid_key"
  | "key_expired"
  | "key_banned"
  | "wrong_tool"
  | "wrong_version"
  | "device_limit_exceeded"
  | "rate_limited"
  | "signing_unavailable";

const MAX_BODY_BYTES = 2048;

function failure(reason: Reason, status = 200) {
  return NextResponse.json({ valid: false, reason }, { status, headers: { "Cache-Control": "no-store" } });
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

type Attempt = {
  ip: string;
  key_value: string | null;
  hardware_id: string | null;
  success: boolean;
  reason: string | null;
};

/** Catat percobaan validasi. Kegagalan logging tidak boleh menggagalkan response. */
async function logAttempt(
  admin: ReturnType<typeof createAdminSupabase>,
  attempt: Attempt
): Promise<void> {
  try {
    await admin.from("validation_attempts").insert(attempt);
  } catch {
    console.error("[validate] gagal mencatat attempt");
  }
}

export async function POST(request: Request) {
  const admin = createAdminSupabase();
  const ip = getClientIp(request);
  const body = (await readLimitedJson(request, MAX_BODY_BYTES)) as Partial<ValidateBody> | null;

  // ---- validasi input sebelum query apa pun ----
  const keyValue = typeof body?.key === "string" ? body.key.trim().toUpperCase() : "";
  const toolSlug = typeof body?.tool_slug === "string" ? body.tool_slug.trim() : "";
  const toolVersion = typeof body?.tool_version === "string" ? body.tool_version.trim() : "";
  const hardwareId = typeof body?.hardware_id === "string" ? body.hardware_id.trim() : "";
  const nonce = typeof body?.nonce === "string" ? body.nonce.trim() : "";

  const structurallyValid =
    body !== null &&
    KEY_REGEX.test(keyValue) &&
    HWID_REGEX.test(hardwareId) &&
    NONCE_REGEX.test(nonce) &&
    toolSlug.length > 0 &&
    toolSlug.length <= 64 &&
    toolVersion.length > 0 &&
    toolVersion.length <= 64;

  if (!structurallyValid) {
    await logAttempt(admin, {
      ip,
      key_value: keyValue || null,
      hardware_id: hardwareId || null,
      success: false,
      reason: "invalid_request",
    });
    return failure("invalid_request", 400);
  }

  // ---- 0. rate limit (dihitung dari database, bukan memori) ----
  const windowStart = minutesAgo(1);
  const [ipResult, keyResult] = await Promise.all([
    admin
      .from("validation_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", windowStart),
    admin
      .from("validation_attempts")
      .select("id", { count: "exact", head: true })
      .eq("key_value", keyValue)
      .gte("created_at", windowStart),
  ]);

  // Kalau query rate limit gagal (DB bermasalah), tolak dengan aman.
  if (ipResult.error || keyResult.error) {
    return failure("rate_limited", 429);
  }

  const ipCount = ipResult.count;
  const keyCount = keyResult.count;

  if ((ipCount ?? 0) >= VALIDATE_LIMITS.ipPerMinute || (keyCount ?? 0) >= VALIDATE_LIMITS.keyPerMinute) {
    await logAttempt(admin, {
      ip,
      key_value: keyValue,
      hardware_id: hardwareId,
      success: false,
      reason: "rate_limited",
    });
    return failure("rate_limited", 429);
  }

  // ---- anti-bruteforce: IP dengan terlalu banyak invalid_key ----
  const { count: invalidKeyCount } = await admin
    .from("validation_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("reason", "invalid_key")
    .gte("created_at", minutesAgo(VALIDATE_LIMITS.invalidKeyWindowMinutes));

  const maskFailures = (invalidKeyCount ?? 0) >= VALIDATE_LIMITS.invalidKeyPerIp;

  async function deny(reason: Reason) {
    const finalReason: Reason = maskFailures ? "invalid_key" : reason;
    await logAttempt(admin, {
      ip,
      key_value: keyValue,
      hardware_id: hardwareId,
      success: false,
      reason: finalReason,
    });
    return failure(finalReason);
  }

  // ---- 1-5. validasi key, status, tool, version, expired ----
  const { data: keyRow } = await admin
    .from("keys")
    .select(
      "*, tool_type:tool_types(id,name,slug,is_active), tool_version:tool_versions(id,name,is_active,tool_type_id)"
    )
    .eq("key_value", keyValue)
    .maybeSingle();

  if (!keyRow) return deny("invalid_key");

  const key = keyRow as unknown as LicenseKey & {
    tool_type: { id: string; name: string; slug: string; is_active: boolean } | null;
    tool_version: { id: string; name: string; is_active: boolean; tool_type_id: string } | null;
  };

  if (key.status === "banned") return deny("key_banned");

  if (key.status === "expired" || (key.expired_at && new Date(key.expired_at).getTime() < Date.now())) {
    return deny("key_expired");
  }

  if (!key.tool_type || !key.tool_type.is_active || key.tool_type.slug !== toolSlug) {
    return deny("wrong_tool");
  }

  if (!key.tool_version || !key.tool_version.is_active || key.tool_version.name !== toolVersion) {
    return deny("wrong_version");
  }

  // ---- 6. register device (atomic lewat fungsi SQL) ----
  const { data: registerData, error: registerError } = await admin.rpc("register_device", {
    p_key_id: key.id,
    p_hwid: hardwareId,
  });

  if (registerError) {
    console.error("[validate] register_device gagal");
    await logAttempt(admin, {
      ip,
      key_value: keyValue,
      hardware_id: hardwareId,
      success: false,
      reason: "device_limit_exceeded",
    });
    return failure("device_limit_exceeded");
  }

  const registerRow = (Array.isArray(registerData) ? registerData[0] : registerData) as
    | { result: string; current_devices: number }
    | null;

  if (!registerRow || registerRow.result !== "ok") {
    // Auto-ban: 5 HWID berbeda kena limit dalam 1 jam terakhir.
    const { data: rejects } = await admin
      .from("validation_attempts")
      .select("hardware_id")
      .eq("key_value", keyValue)
      .eq("reason", "device_limit_exceeded")
      .gte("created_at", minutesAgo(60));

    const distinctDevices = new Set(
      [...((rejects ?? []) as { hardware_id: string | null }[]).map((row) => row.hardware_id), hardwareId].filter(
        (value): value is string => Boolean(value)
      )
    );

    if (distinctDevices.size >= VALIDATE_LIMITS.deviceRejectPerHour) {
      await admin
        .from("keys")
        .update({
          status: "banned",
          note: "Auto-ban: terlalu banyak device berbeda",
        })
        .eq("id", key.id);
    }

    return deny("device_limit_exceeded");
  }

  // ---- 7. update last_used ----
  await admin.from("keys").update({ last_used: new Date().toISOString() }).eq("id", key.id);

  // ---- 8. bangun payload + tanda tangani ----
  if (!getPrivateKey()) {
    await logAttempt(admin, {
      ip,
      key_value: keyValue,
      hardware_id: hardwareId,
      success: false,
      reason: "signing_unavailable",
    });
    return failure("signing_unavailable", 500);
  }

  const { data: secret } = await admin
    .from("tool_secrets")
    .select("secret_payload")
    .eq("tool_type_id", key.tool_type.id)
    .maybeSingle<{ secret_payload: string | null }>();

  const payload = {
    valid: true,
    tool: key.tool_type.slug,
    version: key.tool_version.name,
    expired_at: key.expired_at ?? null,
    max_device: key.max_device,
    current_devices: registerRow.current_devices,
    hardware_id: hardwareId,
    nonce,
    server_time: new Date().toISOString(),
    secret_payload: secret?.secret_payload ?? null,
  };

  let signed: { payload: string; signature: string };
  try {
    signed = signPayload(payload);
  } catch (error) {
    if (error instanceof SigningNotConfiguredError) return failure("signing_unavailable", 500);
    throw error;
  }

  // ---- 9. catat hasil sukses ----
  await logAttempt(admin, {
    ip,
    key_value: keyValue,
    hardware_id: hardwareId,
    success: true,
    reason: null,
  });

  return NextResponse.json(signed, { headers: { "Cache-Control": "no-store" } });
}
