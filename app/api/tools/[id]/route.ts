import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner } from "@/lib/api/auth";
import { slugify } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface ToolBody {
  name?: string;
  slug?: string;
  is_active?: boolean;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requireOwner();

    let body: ToolBody;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim().slice(0, 80);
      if (name.length < 2) throw new ApiError("Nama tool minimal 2 karakter.", 400);
      update.name = name;
    }

    if (body.slug !== undefined) {
      const slug = slugify(body.slug);
      if (slug.length < 2) throw new ApiError("Slug tidak valid.", 400);
      const { data: existing } = await admin
        .from("tool_types")
        .select("id")
        .eq("slug", slug)
        .neq("id", params.id)
        .maybeSingle();
      if (existing) throw new ApiError(`Slug "${slug}" sudah dipakai.`, 409);
      update.slug = slug;
    }

    if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);

    if (Object.keys(update).length === 0) throw new ApiError("Tidak ada perubahan.", 400);

    const { data, error } = await admin
      .from("tool_types")
      .update(update)
      .eq("id", params.id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new ApiError("Tool tidak ditemukan.", 404);

    return NextResponse.json({ tool: data });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requireOwner();

    const { count } = await admin
      .from("keys")
      .select("id", { count: "exact", head: true })
      .eq("tool_type_id", params.id);

    if ((count ?? 0) > 0) {
      throw new ApiError(`Tool masih punya ${count} key. Hapus key-nya dulu.`, 409);
    }

    const { error } = await admin.from("tool_types").delete().eq("id", params.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
