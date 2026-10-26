import { NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/lib/api/auth";
import { lastNDates, startOfDaysAgoISO, startOfTodayISO } from "@/lib/utils/date";
import { formatDayLabel } from "@/lib/utils/format";
import type {
  ActivityItem,
  CreditLog,
  DashboardStats,
  LicenseKey,
  Profile,
  TopReseller,
} from "@/lib/utils/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, admin } = await requireUser();
    const isReseller = user.role === "reseller";
    const scope = <T extends { eq: Function }>(query: T): T =>
      isReseller ? (query.eq("created_by", user.id) as T) : query;

    const todayISO = startOfTodayISO();
    const weekISO = startOfDaysAgoISO(6);
    // Chart membawa 90 hari sekaligus; tab 7/30/90 hari di klien cukup
    // memotong array ini tanpa request tambahan.
    const chartISO = startOfDaysAgoISO(89);
    const days = lastNDates(90);

    const keysBase = () => admin.from("keys").select("id", { count: "exact", head: true });

    // Baris chart diambil per batch: satu select biasa bisa terpotong batas
    // baris PostgREST (umumnya 1000), yang untuk rentang 90 hari akan
    // membuat chart diam-diam menghitung kurang dari jumlah sebenarnya.
    const chartRowsPromise = (async (): Promise<{ created_at: string }[]> => {
      const rows: { created_at: string }[] = [];
      const batchSize = 1000;
      for (let from = 0; from < 100_000; from += batchSize) {
        let query = admin
          .from("keys")
          .select("id,created_at")
          .gte("created_at", chartISO)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + batchSize - 1);
        if (isReseller) query = query.eq("created_by", user.id);
        const { data } = await query;
        const batch = (data ?? []) as { created_at: string }[];
        rows.push(...batch);
        if (batch.length < batchSize) break;
      }
      return rows;
    })();

    const [all, active, expired, banned, today, week, chartRows, resellers] = await Promise.all([
      scope(keysBase()),
      scope(keysBase().eq("status", "active").or(`expired_at.is.null,expired_at.gt.${new Date().toISOString()}`)),
      scope(keysBase().or(`status.eq.expired,and(status.eq.active,expired_at.lt.${new Date().toISOString()})`)),
      scope(keysBase().eq("status", "banned")),
      scope(keysBase().gte("created_at", todayISO)),
      scope(keysBase().gte("created_at", weekISO)),
      chartRowsPromise,
      isReseller
        ? Promise.resolve({ count: 0 })
        : admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "reseller").eq("is_active", true),
    ]);

    const perDay = new Map<string, number>();
    for (const row of chartRows) {
      const day = new Date(row.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }

    const stats: DashboardStats = {
      keys_all: all.count ?? 0,
      keys_active: active.count ?? 0,
      keys_expired: expired.count ?? 0,
      keys_banned: banned.count ?? 0,
      active_resellers: isReseller ? 0 : resellers.count ?? 0,
      keys_today: today.count ?? 0,
      keys_week: week.count ?? 0,
      credit: user.credit,
      chart: days.map((date) => ({
        date,
        label: formatDayLabel(date),
        count: perDay.get(date) ?? 0,
      })),
    };

    // --- Top reseller (owner only) ---
    let topResellers: TopReseller[] = [];
    if (!isReseller) {
      const [{ data: profiles }, { data: keyRows }] = await Promise.all([
        admin.from("profiles").select("*").eq("role", "reseller"),
        admin.from("keys").select("created_by"),
      ]);

      const counts = new Map<string, number>();
      for (const row of (keyRows ?? []) as { created_by: string }[]) {
        counts.set(row.created_by, (counts.get(row.created_by) ?? 0) + 1);
      }

      topResellers = ((profiles ?? []) as Profile[])
        .map((profile) => ({
          id: profile.id,
          username: profile.username,
          email: profile.email,
          credit: profile.credit,
          key_count: counts.get(profile.id) ?? 0,
        }))
        .sort((a, b) => b.key_count - a.key_count)
        .slice(0, 5);
    }

    // --- Recent activity ---
    let logsQuery = admin
      .from("credit_logs")
      .select("*, user:profiles!credit_logs_user_id_fkey(id,username)")
      .order("created_at", { ascending: false })
      .limit(10);
    if (isReseller) logsQuery = logsQuery.eq("user_id", user.id);

    let keysQuery = admin
      .from("keys")
      .select("id,key_value,created_by,created_at,status,creator:profiles(id,username),tool_type:tool_types(name)")
      .order("created_at", { ascending: false })
      .limit(10);
    if (isReseller) keysQuery = keysQuery.eq("created_by", user.id);

    const [{ data: logs }, { data: recentKeys }] = await Promise.all([logsQuery, keysQuery]);

    const activity: ActivityItem[] = [
      ...((logs ?? []) as unknown as CreditLog[]).map((log) => ({
        id: `log-${log.id}`,
        type: log.action === "topup" ? ("topup" as const) : ("generate" as const),
        title:
          log.action === "topup"
            ? `Topup ${Math.abs(log.amount)} credit`
            : `Generate key (-${Math.abs(log.amount)} credit)`,
        detail: `${log.user?.username ?? "user"} · ${log.note ?? "tanpa catatan"}`,
        created_at: log.created_at,
      })),
      ...((recentKeys ?? []) as unknown as (LicenseKey & { tool_type: { name: string } | null })[]).map((key) => ({
        id: `key-${key.id}`,
        type: key.status === "banned" ? ("ban" as const) : ("generate" as const),
        title: `Key ${key.key_value}`,
        detail: `${key.tool_type?.name ?? "tool"} · ${key.creator?.username ?? "user"}`,
        created_at: key.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    return NextResponse.json({ stats, topResellers, activity });
  } catch (error) {
    const { message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
