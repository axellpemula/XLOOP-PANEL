import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireOwner, requireUser } from "@/lib/api/auth";
import { slugify } from "@/lib/utils/format";
import type { ToolType, ToolVersion } from "@/lib/utils/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { admin } = await requireUser();

    const [{ data: tools }, { data: versions }, { data: keys }, { data: secrets }] = await Promise.all([
      admin.from("tool_types").select("*").order("created_at", { ascending: true }),
      admin.from("tool_versions").select("*").order("created_at", { ascending: true }),
      admin.from("keys").select("tool_type_id,tool_version_id,status"),
      admin.from("tool_secrets").select("tool_type_id"),
    ]);

    const keyRows = (keys ?? []) as { tool_type_id: string; tool_version_id: string; status: string }[];
    const secretRows = (secrets ?? []) as { tool_type_id: string }[];

    const toolCounts = new Map<string, number>();
    const versionCounts = new Map<string, number>();
    for (const row of keyRows) {
      if (row.status !== "active") continue;
      toolCounts.set(row.tool_type_id, (toolCounts.get(row.tool_type_id) ?? 0) + 1);
      versionCounts.set(row.tool_version_id, (versionCounts.get(row.tool_version_id) ?? 0) + 1);
    }

    const versionList = (versions ?? []) as ToolVersion[];
    const secretSet = new Set(secretRows.map((row) => row.tool_type_id));

    const result = ((tools ?? []) as ToolType[]).map((tool) => {
      const toolVersions = versionList
        .filter((version) => version.tool_type_id === tool.id)
        .map((version) => ({ ...version, active_key_count: versionCounts.get(version.id) ?? 0 }));

      return {
        ...tool,
        tool_versions: toolVersions,
        version_count: toolVersions.length,
        active_key_count: toolCounts.get(tool.id) ?? 0,
        has_secret: secretSet.has(tool.id),
      };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

interface ToolBody {
  name?: string;
  slug?: string;
  is_active?: boolean;
}

export async function POST(request: Request) {
  try {
    const { user, admin } = await requireOwner();

    let body: ToolBody;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("Data tidak valid.", 400);
    }

    const name = (body.name ?? "").trim().slice(0, 80);
    if (name.length < 2) throw new ApiError("Nama tool minimal 2 karakter.", 400);

    const slug = slugify((body.slug ?? "").trim() || name);
    if (slug.length < 2) throw new ApiError("Slug tidak valid.", 400);

    const { data: existing } = await admin.from("tool_types").select("id").eq("slug", slug).maybeSingle();
    if (existing) throw new ApiError(`Slug "${slug}" sudah dipakai.`, 409);

    const { data, error } = await admin
      .from("tool_types")
      .insert({ name, slug, is_active: body.is_active ?? true, created_by: user.id })
      .select("*")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return NextResponse.json({ tool: data }, { status: 201 });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
