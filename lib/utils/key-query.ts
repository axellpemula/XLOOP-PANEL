import type { SupabaseClient } from "@supabase/supabase-js";

export interface KeyListParams {
  search: string;
  status: string;
  tool: string;
  version: string;
  reseller: string;
  sort: "created_at" | "expired_at" | "status";
  order: "asc" | "desc";
  page: number;
  perPage: number;
}

const SORTS = ["created_at", "expired_at", "status"] as const;

export function parseKeyListParams(url: URL): KeyListParams {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPageRaw = Number(url.searchParams.get("per_page") ?? "10") || 10;
  const perPage = Math.min(100, Math.max(5, perPageRaw));
  const sortParam = url.searchParams.get("sort") ?? "created_at";
  const sort = (SORTS as readonly string[]).includes(sortParam)
    ? (sortParam as KeyListParams["sort"])
    : "created_at";

  return {
    search: (url.searchParams.get("search") ?? "").trim().slice(0, 64),
    status: url.searchParams.get("status") ?? "",
    tool: url.searchParams.get("tool") ?? "",
    version: url.searchParams.get("version") ?? "",
    reseller: url.searchParams.get("reseller") ?? "",
    sort,
    order: url.searchParams.get("order") === "asc" ? "asc" : "desc",
    page,
    perPage,
  };
}

/** Filter status harus sadar tanggal expired, bukan cuma kolom status. */
export function applyStatusFilter<T extends { eq: Function; or: Function }>(query: T, status: string): T {
  const now = new Date().toISOString();
  if (status === "active") {
    return query.eq("status", "active").or(`expired_at.is.null,expired_at.gt.${now}`) as T;
  }
  if (status === "expired") {
    return query.or(`status.eq.expired,and(status.eq.active,expired_at.lt.${now})`) as T;
  }
  if (status === "banned") {
    return query.eq("status", "banned") as T;
  }
  return query;
}

export const KEY_SELECT =
  "id,key_value,tool_type_id,tool_version_id,created_by,status,duration_days,expired_at,max_device,note,last_used,created_at,updated_at,tool_type:tool_types(id,name,slug),tool_version:tool_versions(id,name),creator:profiles(id,username)";

/** Hitung jumlah device terpakai per key (untuk kolom "0/2"). */
export async function attachDeviceCounts(
  admin: SupabaseClient,
  keys: { id: string }[]
): Promise<Record<string, number>> {
  if (keys.length === 0) return {};
  const { data } = await admin
    .from("device_logs")
    .select("key_id")
    .in(
      "key_id",
      keys.map((k) => k.id)
    );

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { key_id: string }[]) {
    counts[row.key_id] = (counts[row.key_id] ?? 0) + 1;
  }
  return counts;
}
