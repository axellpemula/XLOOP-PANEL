import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/utils/types";

function translateError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Email atau password salah.";
  if (lower.includes("email not confirmed")) return "Email belum dikonfirmasi. Hubungi Owner.";
  if (lower.includes("rate limit") || lower.includes("too many")) return "Terlalu banyak percobaan. Coba lagi nanti.";
  if (lower.includes("invalid email")) return "Format email tidak valid.";
  return "Gagal login. Coba lagi.";
}

export async function POST(request: Request) {
  try {
    return await handleLogin(request);
  } catch (error) {
    console.error("[login]", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Server belum dikonfigurasi. Cek environment Supabase." },
      { status: 500 }
    );
  }
}

async function handleLogin(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const message = error?.message.startsWith("Email not confirmed")
      ? "Email belum dikonfirmasi. Hubungi Owner."
      : error?.message === "Email not confirmed"
        ? "Email belum dikonfirmasi. Hubungi Owner."
        : translateError(error?.message ?? "");
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle<Profile>();

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Profil tidak ditemukan. Hubungi Owner." }, { status: 403 });
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Akun kamu dinonaktifkan" }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      credit: profile.credit,
    },
  });
}
