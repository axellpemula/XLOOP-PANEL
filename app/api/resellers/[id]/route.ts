import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner } from "@/lib/api/auth";
import type { CreditLog, Profile } from "@/lib/utils/types";

export const dynamic = "force-dynamic";

async function getReseller(id: string) {
  const { admin } = await requireOwner();
  const { data, error } = await admin.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError("Reseller tidak ditemukan.", 404);
  if (data.role !== "reseller") throw new ApiError("Akun ini bukan reseller.", 400);
  return { profile: data, admin };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { profile, admin } = await getReseller(params.id);

    const [{ count: keyCount }, { data: logs }] = await Promise.all([
      admin.from("keys").select("id", { count: "exact", head: true }).eq("created_by", profile.id),
      admin
        .from("credit_logs")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      reseller: { ...profile, key_count: keyCount ?? 0 },
      credit_logs: (logs ?? []) as CreditLog[],
    });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

interface UpdateBody {
  action?: "topup" | "toggle" | "password" | "update";
  amount?: number;
  note?: string;
  is_active?: boolean;
  password?: string;
  username?: string;
  email?: string;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { profile, admin } = await getReseller(params.id);
    const { user: owner } = await requireOwner();

    let body: UpdateBody;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    if (body.action === "topup") {
      const amount = Number(body.amount ?? 0);
      if (!Number.isInteger(amount) || amount === 0) throw new ApiError("Jumlah topup tidak valid.", 400);
      if (amount < -1_000_000 || amount > 1_000_000) throw new ApiError("Jumlah topup di luar batas.", 400);

      const balanceAfter = profile.credit + amount;
      if (balanceAfter < 0) throw new ApiError(`Saldo tidak cukup (sisa ${profile.credit}).`, 400);

      const { data: updated, error } = await admin
        .from("profiles")
        .update({ credit: balanceAfter })
        .eq("id", profile.id)
        .eq("credit", profile.credit)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!updated) throw new ApiError("Saldo sedang berubah. Coba lagi.", 409);

      await admin.from("credit_logs").insert({
        user_id: profile.id,
        action: "topup",
        amount,
        balance_after: balanceAfter,
        note: (body.note ?? "").trim().slice(0, 200) || (amount > 0 ? "Topup credit" : "Penyesuaian credit"),
        created_by: owner.id,
      });

      return NextResponse.json({ reseller: updated });
    }

    if (body.action === "toggle") {
      if (typeof body.is_active !== "boolean") throw new ApiError("Status tidak valid.", 400);

      const { data: updated, error } = await admin
        .from("profiles")
        .update({ is_active: body.is_active })
        .eq("id", profile.id)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      return NextResponse.json({ reseller: updated });
    }

    if (body.action === "password") {
      const password = body.password ?? "";
      if (password.length < 6) throw new ApiError("Password minimal 6 karakter.", 400);

      const { error } = await admin.auth.admin.updateUserById(profile.id, { password });
      if (error) throw new ApiError(error.message, 400);

      return NextResponse.json({ ok: true });
    }

    if (body.action === "update") {
      const update: Record<string, unknown> = {};
      const authUpdate: Record<string, unknown> = {};

      if (body.username !== undefined) {
        const username = body.username.trim().slice(0, 40);
        if (username.length < 3) throw new ApiError("Username minimal 3 karakter.", 400);

        const { data: taken } = await admin
          .from("profiles")
          .select("id")
          .eq("username", username)
          .neq("id", profile.id)
          .maybeSingle();
        if (taken) throw new ApiError("Username sudah dipakai.", 409);

        update.username = username;
      }

      if (body.email !== undefined) {
        const email = body.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("Format email tidak valid.", 400);
        update.email = email;
        authUpdate.email = email;
        authUpdate.email_confirm = true;
      }

      if (Object.keys(update).length === 0) throw new ApiError("Tidak ada perubahan.", 400);

      if (Object.keys(authUpdate).length > 0) {
        const { error } = await admin.auth.admin.updateUserById(profile.id, authUpdate);
        if (error) throw new ApiError(error.message, 400);
      }

      const { data: updated, error } = await admin
        .from("profiles")
        .update(update)
        .eq("id", profile.id)
        .select("*")
        .maybeSingle();

      if (error) throw new Error(error.message);
      return NextResponse.json({ reseller: updated });
    }

    throw new ApiError("Aksi tidak dikenali.", 400);
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { profile, admin } = await getReseller(params.id);

    const { count } = await admin
      .from("keys")
      .select("id", { count: "exact", head: true })
      .eq("created_by", profile.id);

    if ((count ?? 0) > 0) {
      throw new ApiError(`Reseller masih punya ${count} key. Hapus key-nya dulu.`, 409);
    }

    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) throw new ApiError(error.message, 400);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
