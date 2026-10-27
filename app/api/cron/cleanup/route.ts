import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";

  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabase();

  const { error: cleanupError } = await admin.rpc("cleanup_validation_attempts");
  const { error: expireError } = await admin.rpc("update_expired_keys");

  if (cleanupError || expireError) {
    console.error("[cron] gagal:", cleanupError?.message ?? expireError?.message);
    return NextResponse.json({ error: "Cron gagal dijalankan." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ran_at: new Date().toISOString(),
    tasks: ["cleanup_validation_attempts", "update_expired_keys"],
  });
}
