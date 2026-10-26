import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/api/auth";
import { getOwnedKey } from "@/lib/api/keys";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUser();
    const key = await getOwnedKey(ctx, params.id);

    const { data, error } = await ctx.admin
      .from("device_logs")
      .select("id,key_id,hardware_id,first_seen,last_seen")
      .eq("key_id", key.id)
      .order("first_seen", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ devices: data ?? [], max_device: key.max_device });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

/** Reset semua HWID pada key ini. */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUser();
    const key = await getOwnedKey(ctx, params.id);

    const { error } = await ctx.admin.from("device_logs").delete().eq("key_id", key.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, devices: [] });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
