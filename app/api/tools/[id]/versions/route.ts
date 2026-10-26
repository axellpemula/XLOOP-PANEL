import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requireOwner();

    let body: { name?: string; is_active?: boolean };
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const name = (body.name ?? "").trim().slice(0, 40);
    if (name.length < 1) throw new ApiError("Nama version wajib diisi.", 400);

    const { data: tool } = await admin.from("tool_types").select("id").eq("id", params.id).maybeSingle();
    if (!tool) throw new ApiError("Tool tidak ditemukan.", 404);

    const { data: existing } = await admin
      .from("tool_versions")
      .select("id")
      .eq("tool_type_id", params.id)
      .eq("name", name)
      .maybeSingle();
    if (existing) throw new ApiError(`Version "${name}" sudah ada di tool ini.`, 409);

    const { data, error } = await admin
      .from("tool_versions")
      .insert({ tool_type_id: params.id, name, is_active: body.is_active ?? true })
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return NextResponse.json({ version: data }, { status: 201 });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
