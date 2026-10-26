import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/** Simpan payload rahasia tool. Isi tidak pernah dikirim balik ke browser. */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requireOwner();

    let body: { secret_payload?: string | null };
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const { data: tool } = await admin.from("tool_types").select("id").eq("id", params.id).maybeSingle();
    if (!tool) throw new ApiError("Tool tidak ditemukan.", 404);

    const payload = typeof body.secret_payload === "string" ? body.secret_payload : "";
    if (payload.length > 8000) throw new ApiError("Payload terlalu panjang (maks 8000 karakter).", 400);

    const { error } = await admin
      .from("tool_secrets")
      .upsert(
        { tool_type_id: params.id, secret_payload: payload || null, updated_at: new Date().toISOString() },
        { onConflict: "tool_type_id" }
      );

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, has_secret: Boolean(payload) });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
