import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string; vid: string } }
) {
  try {
    const { admin } = await requireOwner();

    let body: { name?: string; is_active?: boolean };
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim().slice(0, 40);
      if (name.length < 1) throw new ApiError("Nama version wajib diisi.", 400);

      const { data: existing } = await admin
        .from("tool_versions")
        .select("id")
        .eq("tool_type_id", params.id)
        .eq("name", name)
        .neq("id", params.vid)
        .maybeSingle();
      if (existing) throw new ApiError(`Version "${name}" sudah ada di tool ini.`, 409);
      update.name = name;
    }

    if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
    if (Object.keys(update).length === 0) throw new ApiError("Tidak ada perubahan.", 400);

    const { data, error } = await admin
      .from("tool_versions")
      .update(update)
      .eq("id", params.vid)
      .eq("tool_type_id", params.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new ApiError("Version tidak ditemukan.", 404);

    return NextResponse.json({ version: data });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; vid: string } }
) {
  try {
    const { admin } = await requireOwner();

    const { count } = await admin
      .from("keys")
      .select("id", { count: "exact", head: true })
      .eq("tool_version_id", params.vid);

    if ((count ?? 0) > 0) {
      throw new ApiError(`Version masih punya ${count} key. Hapus key-nya dulu.`, 409);
    }

    const { error } = await admin
      .from("tool_versions")
      .delete()
      .eq("id", params.vid)
      .eq("tool_type_id", params.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
