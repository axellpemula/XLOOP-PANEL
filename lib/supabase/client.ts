"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase client untuk browser — hanya untuk baca data (RLS) & auth. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
