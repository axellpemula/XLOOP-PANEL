import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireUser } from "@/lib/api/auth";
import { getOwnedKey } from "@/lib/api/keys";

export const dynamic = "force-dynamic";

/** Reset 1 device (hapus dari slot). */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; deviceId: string } }
) {
  try {
    const ctx = await requireUser();
    const key = await getOwnedKey(ctx, params.id);

    const { data, error } = await ctx.admin
      .from("device_logs")
      .delete()
      .eq("id", params.deviceId)
      .eq("key_id", key.id)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new ApiError("Device tidak ditemukan di key ini.", 404);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
