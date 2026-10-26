"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BanIcon,
  CalendarIcon,
  ChartIcon,
  KeyIcon,
  PlusIcon,
  RefreshIcon,
  ShieldIcon,
  UsersIcon,
  ZapIcon,
} from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/ui/Reveal";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { StatCard } from "./StatCard";
import { StatusSummary } from "./StatusSummary";
import { CreditCard } from "./CreditCard";
import { ActivityFeed } from "./ActivityFeed";
import { TopResellers } from "./TopResellers";
import { apiFetch } from "@/lib/api/client";
import { formatNumber } from "@/lib/utils/format";
import type { ActivityItem, DashboardStats, Role, TopReseller } from "@/lib/utils/types";

const KeyChart = dynamic(() => import("./KeyChart").then((mod) => mod.KeyChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />,
});

interface DashboardData {
  stats: DashboardStats;
  topResellers: TopReseller[];
  activity: ActivityItem[];
}

function percent(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function DashboardView({ role, credit }: { role: Role; credit: number }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = role === "owner";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<DashboardData>("/api/dashboard");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = data?.stats;
  const statusTotal = stats ? stats.keys_active + stats.keys_expired + stats.keys_banned : 0;
  const chartCounts = stats?.chart.map((point) => point.count) ?? [];
  const sparkline = chartCounts.slice(-14);
  const todayCount = chartCounts[chartCounts.length - 1] ?? stats?.keys_today ?? 0;
  const yesterdayCount = chartCounts[chartCounts.length - 2] ?? 0;
  const todayDiff = todayCount - yesterdayCount;
  const thisWeek = chartCounts.slice(-7).reduce((sum, value) => sum + value, 0);
  const previousWeek = chartCounts.slice(-14, -7).reduce((sum, value) => sum + value, 0);
  const weekDiff = previousWeek === 0 ? null : Math.round(((thisWeek - previousWeek) / previousWeek) * 100);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={isOwner ? "Ringkasan semua key, reseller, dan aktivitas panel." : "Ringkasan key dan credit milik kamu."}
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={load}
              loading={loading}
              icon={<RefreshIcon size={16} strokeWidth={1.5} />}
              aria-label="Muat ulang"
            >
              <span className="hidden sm:inline">Muat ulang</span>
            </Button>
            <Link
              href="/generate"
              className="primary-surface hidden h-9 items-center justify-center gap-2 rounded-lg px-3 text-label font-semibold text-[var(--accent-ink)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97] sm:inline-flex"
            >
              <PlusIcon size={15} strokeWidth={1.6} />
              Generate Key
            </Link>
          </div>
        }
      />

      {error && (
        <div className="glass mb-4 rounded-card px-4 py-3 text-body text-banned" role="alert">
          {error}
        </div>
      )}

      {!stats ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-12">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} className="h-full lg:col-span-3" />
          ))}
          <div className="glass col-span-2 h-[360px] rounded-card p-4 lg:col-span-8">
            <Skeleton className="h-full w-full" />
          </div>
          <SkeletonCard className="col-span-2 h-[360px] lg:col-span-4" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-12">
          {/* Baris utama: empat KPI dengan konteks tren/porsi */}
          <Reveal index={0} className="lg:col-span-3">
            <StatCard
              label="Total Key"
              value={stats.keys_all}
              icon={<KeyIcon size={17} strokeWidth={1.5} />}
              delta={{
                label: `${todayCount > 0 ? "+" : ""}${formatNumber(todayCount)} hari ini`,
                direction: todayCount > 0 ? "up" : "flat",
                tone: "neutral",
              }}
              sparkline={sparkline}
            />
          </Reveal>
          <Reveal index={1} className="lg:col-span-3">
            <StatCard
              label="Key Active"
              value={stats.keys_active}
              accent="active"
              icon={<ShieldIcon size={17} strokeWidth={1.5} />}
              hint={`${percent(stats.keys_active, statusTotal)}% dari total · bisa dipakai`}
            />
          </Reveal>
          <Reveal index={2} className="lg:col-span-3">
            <StatCard
              label="Expired"
              value={stats.keys_expired}
              accent="expired"
              icon={<CalendarIcon size={17} strokeWidth={1.5} />}
              hint={`${percent(stats.keys_expired, statusTotal)}% dari total · lewat masa aktif`}
            />
          </Reveal>
          <Reveal index={3} className="lg:col-span-3">
            <StatCard
              label="Banned"
              value={stats.keys_banned}
              accent="banned"
              icon={<BanIcon size={17} strokeWidth={1.5} />}
              hint={`${percent(stats.keys_banned, statusTotal)}% dari total · diblokir`}
            />
          </Reveal>

          {/* Baris sekunder */}
          {isOwner ? (
            <>
              <Reveal index={4} className="col-span-2 lg:col-span-4">
                <StatCard
                  label="Reseller Aktif"
                  value={stats.active_resellers}
                  icon={<UsersIcon size={17} strokeWidth={1.5} />}
                  hint="Akun reseller yang bisa login"
                />
              </Reveal>
              <Reveal index={5} className="lg:col-span-4">
                <StatCard
                  label="Key Hari Ini"
                  value={stats.keys_today}
                  icon={<ZapIcon size={17} strokeWidth={1.5} />}
                  delta={{
                    label: `${todayDiff > 0 ? "+" : ""}${formatNumber(todayDiff)} dari kemarin`,
                    direction: todayDiff > 0 ? "up" : todayDiff < 0 ? "down" : "flat",
                    tone: "neutral",
                  }}
                />
              </Reveal>
              <Reveal index={6} className="lg:col-span-4">
                <StatCard
                  label="Key 7 Hari"
                  value={stats.keys_week}
                  icon={<ChartIcon size={17} strokeWidth={1.5} />}
                  delta={
                    weekDiff === null
                      ? undefined
                      : {
                          label: `${weekDiff > 0 ? "+" : ""}${formatNumber(weekDiff)}% dari pekan sebelumnya`,
                          direction: weekDiff > 0 ? "up" : weekDiff < 0 ? "down" : "flat",
                          tone: "neutral",
                        }
                  }
                  hint={weekDiff === null ? "Termasuk hari ini" : undefined}
                  sparkline={sparkline}
                />
              </Reveal>
            </>
          ) : (
            <>
              <Reveal index={4} className="lg:col-span-6">
                <StatCard
                  label="Key Hari Ini"
                  value={stats.keys_today}
                  icon={<ZapIcon size={17} strokeWidth={1.5} />}
                  delta={{
                    label: `${todayDiff > 0 ? "+" : ""}${formatNumber(todayDiff)} dari kemarin`,
                    direction: todayDiff > 0 ? "up" : todayDiff < 0 ? "down" : "flat",
                    tone: "neutral",
                  }}
                />
              </Reveal>
              <Reveal index={5} className="lg:col-span-6">
                <StatCard
                  label="Key 7 Hari"
                  value={stats.keys_week}
                  icon={<ChartIcon size={17} strokeWidth={1.5} />}
                  hint="Termasuk hari ini"
                  sparkline={sparkline}
                />
              </Reveal>
            </>
          )}

          {/* Chart + donut status */}
          <Reveal index={7} className="col-span-2 lg:col-span-8">
            <GlassCard className="h-full">
              <div className="mb-4">
                <h2 className="text-body font-medium text-text">Aktivitas Key</h2>
                <p className="mt-0.5 text-label text-muted">Key yang dibuat per hari (WIB)</p>
              </div>
              <KeyChart data={stats.chart} />
            </GlassCard>
          </Reveal>

          <Reveal index={8} className="col-span-2 lg:col-span-4">
            <StatusSummary active={stats.keys_active} expired={stats.keys_expired} banned={stats.keys_banned} />
          </Reveal>

          {/* Ranking / credit + aktivitas */}
          {isOwner ? (
            <>
              <Reveal index={9} className="col-span-2 lg:col-span-5">
                <TopResellers items={data?.topResellers ?? []} />
              </Reveal>
              <Reveal index={10} className="col-span-2 lg:col-span-7">
                <ActivityFeed items={data?.activity ?? []} />
              </Reveal>
            </>
          ) : (
            <>
              <Reveal index={9} className="col-span-2 lg:col-span-4">
                <CreditCard credit={stats.credit ?? credit} />
              </Reveal>
              <Reveal index={10} className="col-span-2 lg:col-span-8">
                <ActivityFeed items={data?.activity ?? []} />
              </Reveal>
            </>
          )}
        </div>
      )}
    </div>
  );
}
