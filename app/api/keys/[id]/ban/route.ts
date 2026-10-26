import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/api/auth";
import { getOwnedKey } from "@/lib/api/keys";

export const dynamic = "force-dynamic";

export async function PUT(_request: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireUser();
    const key = await getOwnedKey(ctx, params.id);

    const { data, error } = await ctx.admin
      .from("keys")
      .update({ status: "banned" })
      .eq("id", key.id)
      .select("id,status")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return NextResponse.json({ key: data });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
