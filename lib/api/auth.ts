import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Profile, SessionUser } from "@/lib/utils/types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface AuthContext {
  user: SessionUser;
  supabase: ReturnType<typeof createServerSupabase>;
  admin: ReturnType<typeof createAdminSupabase>;
}

/**
 * Ambil user dari session Supabase + profile-nya.
 * Semua API route yang butuh login wajib lewat sini.
 */
export async function requireUser(options?: { allowInactive?: boolean }): Promise<AuthContext> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new ApiError("Sesi tidak ditemukan. Silakan login ulang.", 401);

  const admin = createAdminSupabase();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error) throw new ApiError("Gagal memuat profil.", 500);
  if (!profile) throw new ApiError("Profil tidak ditemukan.", 403);
  if (!profile.is_active && !options?.allowInactive) {
    throw new ApiError("Akun kamu dinonaktifkan", 403);
  }

  return {
    user: {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      role: profile.role,
      credit: profile.credit,
      is_active: profile.is_active,
    },
    supabase,
    admin,
  };
}

export async function requireOwner(options?: { allowInactive?: boolean }): Promise<AuthContext> {
  const ctx = await requireUser(options);
  if (ctx.user.role !== "owner") throw new ApiError("Hanya Owner yang bisa akses ini.", 403);
  return ctx;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof Error) {
    // Pesan generik ke client, detail tetap di server log tanpa data sensitif.
    console.error("[api]", error.message);
  }
  return { message: "Terjadi kesalahan di server.", status: 500 };
}
