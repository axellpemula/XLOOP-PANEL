import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/api/auth";
import {
  applyStatusFilter,
  attachDeviceCounts,
  KEY_SELECT,
  parseKeyListParams,
} from "@/lib/utils/key-query";
import type { LicenseKey } from "@/lib/utils/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, admin } = await requireUser();
    const params = parseKeyListParams(new URL(request.url));

    // Sinkronkan status expired sebelum dibaca.
    await admin.rpc("update_expired_keys");

    let query = admin.from("keys").select(KEY_SELECT, { count: "exact" });

    // Reseller hanya boleh melihat key miliknya — dipaksa di server.
    if (user.role === "reseller") query = query.eq("created_by", user.id);
    if (params.search) query = query.ilike("key_value", `%${params.search.toUpperCase()}%`);
    if (params.tool) query = query.eq("tool_type_id", params.tool);
    if (params.version) query = query.eq("tool_version_id", params.version);
    if (params.reseller && user.role === "owner") query = query.eq("created_by", params.reseller);
    if (params.status) query = applyStatusFilter(query, params.status);

    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;

    const { data, error, count } = await query
      .order(params.sort, { ascending: params.order === "asc", nullsFirst: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as LicenseKey[];
    const counts = await attachDeviceCounts(admin, rows);
    const result = rows.map((row) => ({ ...row, device_count: counts[row.id] ?? 0 }));
    const total = count ?? result.length;

    return NextResponse.json({
      data: result,
      page: params.page,
      perPage: params.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.perPage)),
    });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
