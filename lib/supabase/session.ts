import { redirect } from "next/navigation";
import { createServerSupabase } from "./server";
import type { Profile, SessionUser } from "@/lib/utils/types";

/** Ambil user yang sedang login (server side). Redirect ke /login kalau tidak ada. */
export async function getSessionUser(): Promise<SessionUser> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile) redirect("/login?error=profil");
  if (!profile.is_active) redirect("/login?error=nonaktif");

  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    role: profile.role,
    credit: profile.credit,
    is_active: profile.is_active,
  };
}
