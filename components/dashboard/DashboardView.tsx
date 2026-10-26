"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PlusIcon, RefreshIcon } from "@/components/icons";
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
  loading: () => <Skeleton className="h-[220px] w-full" />,
});

interface DashboardData {
  stats: DashboardStats;
  topResellers: TopReseller[];
  activity: ActivityItem[];
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
  const summaryKeys = useMemo(() => (stats ? stats.keys_active + stats.keys_expired + stats.keys_banned : 0), [stats]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={isOwner ? "Ringkasan semua key, reseller, dan aktivitas panel." : "Ringkasan key dan credit milik kamu."}
        action={
          <Button
            onClick={load}
            loading={loading}
            icon={<RefreshIcon size={16} strokeWidth={1.5} />}
            aria-label="Muat ulang"
          >
            <span className="hidden sm:inline">Muat ulang</span>
          </Button>
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
            <SkeletonCard key={index} className="lg:col-span-3" />
          ))}
          <div className="glass col-span-2 h-[300px] rounded-card p-4 lg:col-span-8">
            <Skeleton className="h-full w-full" />
          </div>
          <SkeletonCard className="col-span-2 h-[300px] lg:col-span-4" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-12">
          {/* Baris 1: kartu statistik */}
          <Reveal index={0} className="lg:col-span-3">
            <StatCard label="Total Key" value={stats.keys_all} hint={`${formatNumber(summaryKeys)} tercatat`} />
          </Reveal>
          <Reveal index={1} className="lg:col-span-3">
            <StatCard label="Key Active" value={stats.keys_active} accent="active" hint="Bisa dipakai" />
          </Reveal>
          <Reveal index={2} className="lg:col-span-3">
            <StatCard label="Expired" value={stats.keys_expired} accent="expired" hint="Lewat masa aktif" />
          </Reveal>
          <Reveal index={3} className="lg:col-span-3">
            <StatCard label="Banned" value={stats.keys_banned} accent="banned" hint="Diblokir manual / auto" />
          </Reveal>

          {/* Baris 1b: metrik tambahan */}
          {isOwner ? (
            <>
              <Reveal index={4} className="col-span-2 lg:col-span-4">
                <StatCard label="Reseller Aktif" value={stats.active_resellers} hint="Akun reseller yang bisa login" />
              </Reveal>
              <Reveal index={5} className="lg:col-span-4">
                <StatCard label="Key Hari Ini" value={stats.keys_today} hint="Dibuat sejak 00:00 WIB" />
              </Reveal>
              <Reveal index={6} className="lg:col-span-4">
                <StatCard label="Key 7 Hari" value={stats.keys_week} hint="Termasuk hari ini" />
              </Reveal>
            </>
          ) : (
            <>
              <Reveal index={4} className="lg:col-span-6">
                <StatCard label="Key Hari Ini" value={stats.keys_today} hint="Dibuat sejak 00:00 WIB" />
              </Reveal>
              <Reveal index={5} className="lg:col-span-6">
                <StatCard label="Key 7 Hari" value={stats.keys_week} hint="Termasuk hari ini" />
              </Reveal>
            </>
          )}

          {/* Baris 2: chart + ringkasan status / credit */}
          <Reveal index={8} className="col-span-2 lg:col-span-8">
            <GlassCard className="h-full">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-body font-medium text-text">Key 7 Hari Terakhir</h2>
                <span className="text-label text-muted tabular">{formatNumber(stats.keys_week)} key</span>
              </div>
              <KeyChart data={stats.chart} />
            </GlassCard>
          </Reveal>

          <Reveal index={9} className="col-span-2 lg:col-span-4">
            {isOwner ? (
              <StatusSummary active={stats.keys_active} expired={stats.keys_expired} banned={stats.keys_banned} />
            ) : (
              <CreditCard credit={credit} />
            )}
          </Reveal>

          {/* Baris 3: top reseller + aktivitas */}
          {isOwner && (
            <Reveal index={10} className="col-span-2 lg:col-span-5">
              <TopResellers items={data?.topResellers ?? []} />
            </Reveal>
          )}
          <Reveal
            index={11}
            className={isOwner ? "col-span-2 lg:col-span-7" : "col-span-2 lg:col-span-12"}
          >
            <ActivityFeed items={data?.activity ?? []} />
          </Reveal>

          {!isOwner && (
            <Reveal index={12} className="col-span-2">
              <GlassCard className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-body text-muted">Butuh key baru? Generate pakai sisa credit kamu.</p>
                {/* Link bergaya tombol — <button> di dalam <a> adalah
                    elemen interaktif bersarang (HTML tidak valid). */}
                <Link
                  href="/generate"
                  className="inline-flex h-8 min-h-8 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-label font-semibold text-[var(--accent-ink)] transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-[0.97]"
                >
                  <PlusIcon size={16} strokeWidth={1.5} />
                  Buat Key
                </Link>
              </GlassCard>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
}
