import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client dengan service role. HANYA untuk server.
 * Key ini melewati RLS — jangan pernah dipakai di komponen client.
 */
export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase env belum lengkap (URL / SERVICE_ROLE_KEY)");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
