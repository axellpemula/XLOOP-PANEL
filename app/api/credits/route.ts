import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/api/auth";
import type { CreditLog } from "@/lib/utils/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, admin } = await requireUser();
    const url = new URL(request.url);

    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const perPage = Math.min(100, Math.max(5, Number(url.searchParams.get("per_page") ?? "15") || 15));
    const action = url.searchParams.get("action") ?? "";
    const reseller = url.searchParams.get("reseller") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";

    let query = admin
      .from("credit_logs")
      .select("*, user:profiles!credit_logs_user_id_fkey(id,username)", { count: "exact" });

    if (user.role === "reseller") query = query.eq("user_id", user.id);
    else if (reseller) query = query.eq("user_id", reseller);

    if (action === "topup" || action === "generate") query = query.eq("action", action);
    if (from) query = query.gte("created_at", new Date(`${from}T00:00:00+07:00`).toISOString());
    if (to) query = query.lte("created_at", new Date(`${to}T23:59:59+07:00`).toISOString());

    const start = (page - 1) * perPage;
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(start, start + perPage - 1);

    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return NextResponse.json({
      data: (data ?? []) as unknown as CreditLog[],
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
