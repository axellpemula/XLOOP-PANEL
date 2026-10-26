import { NextResponse } from "next/server";
import { handleApiError, requireUser, ApiError } from "@/lib/api/auth";
import { generateUniqueKeys } from "@/lib/utils/keygen";
import { LIMITS } from "@/lib/utils/constants";
import { addDays } from "@/lib/utils/date";
import type { DurationPreset, Profile, ToolType, ToolVersion } from "@/lib/utils/types";

export const dynamic = "force-dynamic";

interface GenerateBody {
  tool_type_id?: string;
  tool_version_id?: string;
  duration_mode?: "preset" | "custom";
  duration_preset_id?: string | null;
  duration_days?: number | null;
  max_device?: number;
  quantity?: number;
  note?: string | null;
}

export async function POST(request: Request) {
  try {
    const { user, admin } = await requireUser();

    let body: GenerateBody;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const limits = LIMITS[user.role];
    const quantity = Number(body.quantity ?? 1);
    const maxDevice = Number(body.max_device ?? 1);
    const toolTypeId = (body.tool_type_id ?? "").trim();
    const toolVersionId = (body.tool_version_id ?? "").trim();
    const note = (body.note ?? "").trim().slice(0, 500) || null;

    // --- validasi field ---
    if (!toolTypeId) throw new ApiError("Tool Type wajib dipilih.", 400);
    if (!toolVersionId) throw new ApiError("Version wajib dipilih.", 400);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > limits.maxQty) {
      throw new ApiError(`Quantity harus 1–${limits.maxQty}.`, 400);
    }
    if (!Number.isInteger(maxDevice) || maxDevice < 1 || maxDevice > limits.maxDevice) {
      throw new ApiError(
        `Max device harus 1–${limits.maxDevice}${user.role === "reseller" ? " untuk Reseller" : ""}.`,
        400
      );
    }

    // --- tool type & version harus aktif & cocok ---
    const [{ data: tool }, { data: version }] = await Promise.all([
      admin.from("tool_types").select("*").eq("id", toolTypeId).maybeSingle<ToolType>(),
      admin.from("tool_versions").select("*").eq("id", toolVersionId).maybeSingle<ToolVersion>(),
    ]);

    if (!tool) throw new ApiError("Tool Type tidak ditemukan.", 404);
    if (!tool.is_active) throw new ApiError("Tool Type sedang nonaktif.", 400);
    if (!version || version.tool_type_id !== tool.id) {
      throw new ApiError("Version tidak cocok dengan Tool Type.", 400);
    }
    if (!version.is_active) throw new ApiError("Version sedang nonaktif.", 400);

    // --- durasi & biaya ---
    let durationDays: number | null = null;
    let creditCost = 0;

    if (user.role === "reseller") {
      if (!body.duration_preset_id) throw new ApiError("Durasi wajib dipilih.", 400);

      const { data: preset } = await admin
        .from("duration_presets")
        .select("*")
        .eq("id", body.duration_preset_id)
        .maybeSingle<DurationPreset>();

      if (!preset) throw new ApiError("Preset durasi tidak ditemukan.", 404);
      if (!preset.is_active) throw new ApiError("Preset durasi sedang nonaktif.", 400);

      durationDays = preset.days;
      creditCost = preset.credit_cost;
    } else if (body.duration_mode === "custom") {
      const days = Number(body.duration_days ?? 0);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        throw new ApiError("Custom durasi harus 1–3650 hari.", 400);
      }
      durationDays = days;
      creditCost = 0;
    } else {
      if (!body.duration_preset_id) throw new ApiError("Durasi wajib dipilih.", 400);

      const { data: preset } = await admin
        .from("duration_presets")
        .select("*")
        .eq("id", body.duration_preset_id)
        .maybeSingle<DurationPreset>();

      if (!preset) throw new ApiError("Preset durasi tidak ditemukan.", 404);
      durationDays = preset.days;
      creditCost = 0;
    }

    const totalCost = creditCost * quantity;

    // --- cek & potong credit (reseller) ---
    let balanceAfter: number | null = null;

    if (user.role === "reseller" && totalCost > 0) {
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle<Profile>();

      if (!profile) throw new ApiError("Profil tidak ditemukan.", 404);

      if (profile.credit < totalCost) {
        throw new ApiError(`Credit tidak cukup (sisa ${profile.credit}).`, 400);
      }

      balanceAfter = profile.credit - totalCost;

      // Optimistic locking: update hanya kalau saldo belum berubah.
      const { data: updated, error: updateError } = await admin
        .from("profiles")
        .update({ credit: balanceAfter })
        .eq("id", profile.id)
        .eq("credit", profile.credit)
        .select("credit")
        .maybeSingle();

      if (updateError) throw new Error(updateError.message);
      if (!updated) throw new ApiError("Credit sedang dipakai transaksi lain. Coba lagi.", 409);
    }

    // --- generate key unik + cek duplikat di database ---
    const now = new Date();
    const expiredAt = durationDays === null ? null : addDays(now, durationDays).toISOString();

    let inserted: { key_value: string }[] = [];
    let attempt = 0;

    while (attempt < 3) {
      attempt += 1;

      const existing = new Set<string>();
      // Ambil sampel key yang sudah ada untuk pola yang mirip tidak perlu — cek langsung setelah generate.
      const candidates = generateUniqueKeys(quantity, existing);

      const { data: dupeCheck } = await admin
        .from("keys")
        .select("key_value")
        .in("key_value", candidates);

      const dupes = new Set(((dupeCheck ?? []) as { key_value: string }[]).map((row) => row.key_value));
      const unique = candidates.filter((value) => !dupes.has(value));

      if (unique.length === 0) continue;

      // Kalau ada duplikat, generate ulang sisa slot supaya quantity tetap terpenuhi.
      let final = unique;
      if (final.length < quantity) {
        const extraNeeded = quantity - final.length;
        const taken = new Set<string>([...candidates, ...dupes]);
        const extra = generateUniqueKeys(extraNeeded, taken);
        final = [...final, ...extra];
      }

      const rows = final.slice(0, quantity).map((keyValue) => ({
        key_value: keyValue,
        tool_type_id: tool.id,
        tool_version_id: version.id,
        created_by: user.id,
        status: "active" as const,
        duration_days: durationDays,
        expired_at: expiredAt,
        max_device: maxDevice,
        note,
      }));

      const { data, error } = await admin.from("keys").insert(rows).select("key_value");
      if (error) {
        // Duplikat balapan dengan request lain → coba ulang.
        if (error.code === "23505" && attempt < 3) continue;
        // Gagal total: kembalikan credit yang sudah dipotong.
        if (balanceAfter !== null) {
          await admin.from("profiles").update({ credit: balanceAfter + totalCost }).eq("id", user.id);
        }
        throw new Error(error.message);
      }

      inserted = (data ?? []) as { key_value: string }[];
      break;
    }

    if (inserted.length === 0) {
      if (balanceAfter !== null) {
        await admin.from("profiles").update({ credit: balanceAfter + totalCost }).eq("id", user.id);
      }
      throw new ApiError("Gagal membuat key unik. Coba lagi.", 500);
    }

    // --- catat credit log ---
    if (user.role === "reseller" && totalCost > 0 && balanceAfter !== null) {
      await admin.from("credit_logs").insert({
        user_id: user.id,
        action: "generate",
        amount: -totalCost,
        balance_after: balanceAfter,
        note: `Generate ${quantity} key ${tool.name} ${version.name}`,
        created_by: user.id,
      });
    }

    return NextResponse.json({
      keys: inserted.map((row) => row.key_value),
      summary: {
        tool: tool.name,
        tool_slug: tool.slug,
        version: version.name,
        duration_days: durationDays,
        expired_at: expiredAt,
        max_device: maxDevice,
        quantity: inserted.length,
        credit_used: totalCost,
        credit_left: balanceAfter,
      },
    });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
