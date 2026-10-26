import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireUser } from "@/lib/api/auth";
import { addDays } from "@/lib/utils/date";
import { KEY_SELECT } from "@/lib/utils/key-query";
import { getOwnedKey } from "@/lib/api/keys";
import type { DurationPreset, LicenseKey, Profile } from "@/lib/utils/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUser();
    const key = await getOwnedKey(ctx, params.id);

    const { data: devices } = await ctx.admin
      .from("device_logs")
      .select("id,key_id,hardware_id,first_seen,last_seen")
      .eq("key_id", key.id)
      .order("first_seen", { ascending: true });

    return NextResponse.json({ key: { ...key, device_count: devices?.length ?? 0 }, devices: devices ?? [] });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

interface EditBody {
  mode?: "extend" | "set";
  days?: number;
  expired_at?: string | null;
  duration_preset_id?: string;
  note?: string | null;
  max_device?: number;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUser();
    const key = await getOwnedKey(ctx, params.id);

    let body: EditBody;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const update: Record<string, unknown> = {};

    if (body.note !== undefined) {
      update.note = (body.note ?? "").trim().slice(0, 500) || null;
    }

    if (ctx.user.role === "owner" && body.max_device !== undefined) {
      const maxDevice = Number(body.max_device);
      if (!Number.isInteger(maxDevice) || maxDevice < 1 || maxDevice > 100) {
        throw new ApiError("Max device harus 1–100.", 400);
      }
      update.max_device = maxDevice;
    }

    const baseDate = key.expired_at ? new Date(key.expired_at) : new Date();
    const startFrom = baseDate.getTime() > Date.now() ? baseDate : new Date();

    if (ctx.user.role === "owner") {
      if (body.mode === "extend") {
        const days = Number(body.days ?? 0);
        if (!Number.isInteger(days) || days < 1 || days > 3650) {
          throw new ApiError("Jumlah hari harus 1–3650.", 400);
        }
        update.expired_at = addDays(startFrom, days).toISOString();
        update.duration_days = (key.duration_days ?? 0) + days;
      } else if (body.mode === "set") {
        if (!body.expired_at) throw new ApiError("Tanggal expired wajib diisi.", 400);
        const next = new Date(body.expired_at);
        if (Number.isNaN(next.getTime())) throw new ApiError("Tanggal expired tidak valid.", 400);
        update.expired_at = next.toISOString();
        update.duration_days = Math.max(
          0,
          Math.ceil((next.getTime() - Date.now()) / 86_400_000)
        );
      }
    } else {
      // Reseller: hanya perpanjang pakai preset, dan kena biaya credit.
      if (!body.duration_preset_id) throw new ApiError("Pilih preset durasi dulu.", 400);

      const { data: preset } = await ctx.admin
        .from("duration_presets")
        .select("*")
        .eq("id", body.duration_preset_id)
        .maybeSingle<DurationPreset>();

      if (!preset) throw new ApiError("Preset durasi tidak ditemukan.", 404);
      if (!preset.is_active) throw new ApiError("Preset durasi sedang nonaktif.", 400);

      const { data: profile } = await ctx.admin
        .from("profiles")
        .select("*")
        .eq("id", ctx.user.id)
        .maybeSingle<Profile>();

      if (!profile) throw new ApiError("Profil tidak ditemukan.", 404);
      if (profile.credit < preset.credit_cost) {
        throw new ApiError(`Credit tidak cukup (sisa ${profile.credit}).`, 400);
      }

      const balanceAfter = profile.credit - preset.credit_cost;

      if (preset.credit_cost > 0) {
        const { data: updated, error } = await ctx.admin
          .from("profiles")
          .update({ credit: balanceAfter })
          .eq("id", profile.id)
          .eq("credit", profile.credit)
          .select("credit")
          .maybeSingle();

        if (error) throw new Error(error.message);
        if (!updated) throw new ApiError("Credit sedang dipakai transaksi lain. Coba lagi.", 409);

        await ctx.admin.from("credit_logs").insert({
          user_id: profile.id,
          action: "generate",
          amount: -preset.credit_cost,
          balance_after: balanceAfter,
          note: `Perpanjang key ${key.key_value} (${preset.name})`,
          created_by: profile.id,
        });
      }

      update.expired_at = addDays(startFrom, preset.days).toISOString();
      update.duration_days = (key.duration_days ?? 0) + preset.days;
      update.note = update.note ?? key.note;
    }

    // Kalau tanggal expired diperpanjang dan key sedang expired → aktifkan lagi.
    if (update.expired_at) {
      const expiredTime = new Date(update.expired_at as string).getTime();
      if (key.status === "expired" && expiredTime > Date.now()) {
        update.status = "active";
      }
      if (key.status === "active" && expiredTime <= Date.now()) {
        update.status = "expired";
      }
    }

    if (Object.keys(update).length === 0) {
      throw new ApiError("Tidak ada perubahan yang dikirim.", 400);
    }

    const { data, error } = await ctx.admin
      .from("keys")
      .update(update)
      .eq("id", key.id)
      .select(KEY_SELECT)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return NextResponse.json({ key: data });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUser();
    const key = await getOwnedKey(ctx, params.id);

    const { error } = await ctx.admin.from("keys").delete().eq("id", key.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
