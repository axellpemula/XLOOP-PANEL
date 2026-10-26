import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner } from "@/lib/api/auth";
import type { Profile } from "@/lib/utils/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { admin } = await requireOwner();

    const [{ data: profiles, error }, { data: keys }] = await Promise.all([
      admin.from("profiles").select("*").eq("role", "reseller").order("created_at", { ascending: false }),
      admin.from("keys").select("created_by"),
    ]);

    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const row of (keys ?? []) as { created_by: string }[]) {
      counts.set(row.created_by, (counts.get(row.created_by) ?? 0) + 1);
    }

    const data = ((profiles ?? []) as Profile[]).map((profile) => ({
      ...profile,
      key_count: counts.get(profile.id) ?? 0,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

interface CreateBody {
  username?: string;
  email?: string;
  password?: string;
  credit?: number;
}

export async function POST(request: Request) {
  try {
    const { user: owner, admin } = await requireOwner();

    let body: CreateBody;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const username = (body.username ?? "").trim().slice(0, 40);
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const credit = Number(body.credit ?? 0);

    if (username.length < 3) throw new ApiError("Username minimal 3 karakter.", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("Format email tidak valid.", 400);
    if (password.length < 6) throw new ApiError("Password minimal 6 karakter.", 400);
    if (!Number.isInteger(credit) || credit < 0) throw new ApiError("Credit awal tidak valid.", 400);

    const { data: usernameTaken } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (usernameTaken) throw new ApiError("Username sudah dipakai.", 409);

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !created.user) {
      const message = authError?.message.includes("already")
        ? "Email sudah terdaftar."
        : authError?.message ?? "Gagal membuat akun reseller.";
      throw new ApiError(message, 409);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .insert({
        id: created.user.id,
        username,
        email,
        role: "reseller",
        credit,
        is_active: true,
      })
      .select("*")
      .maybeSingle();

    if (profileError) {
      // Rollback user auth supaya tidak ada akun tanpa profil.
      await admin.auth.admin.deleteUser(created.user.id);
      throw new ApiError(
        profileError.message.includes("duplicate") ? "Username sudah dipakai." : profileError.message,
        409
      );
    }

    if (credit > 0) {
      await admin.from("credit_logs").insert({
        user_id: created.user.id,
        action: "topup",
        amount: credit,
        balance_after: credit,
        note: "Credit awal",
        created_by: owner.id,
      });
    }

    return NextResponse.json({ reseller: profile }, { status: 201 });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
