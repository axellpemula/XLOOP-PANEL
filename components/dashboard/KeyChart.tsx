"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { DashboardStats } from "@/lib/utils/types";

type ChartPoint = DashboardStats["chart"][number];

const RANGES = [7, 30, 90] as const;

function GlassTooltip({
  active,
  payload,
  total,
}: TooltipProps<number, string> & { total?: number }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ChartPoint;
  const value = typeof payload[0].value === "number" ? payload[0].value : point.count;
  const share = total && total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="glass-strong rounded-lg px-3 py-2" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
      <p className="text-label text-muted">{point.label}</p>
      <p className="text-body font-medium text-text tabular">{formatNumber(value)} key</p>
      {total !== undefined && total > 0 && (
        <p className="text-label text-muted tabular">{share}% dari rentang ini</p>
      )}
    </div>
  );
}

export function KeyChart({ data }: { data: DashboardStats["chart"] }) {
  const reduce = useReducedMotion();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);

  const visible = useMemo(() => data.slice(-range), [data, range]);
  const { total, average, peak, last } = useMemo(() => {
    const sum = visible.reduce((acc, point) => acc + point.count, 0);
    const peakPoint = visible.reduce<ChartPoint | null>(
      (best, point) => (best === null || point.count > best.count ? point : best),
      null
    );
    return {
      total: sum,
      average: visible.length > 0 ? sum / visible.length : 0,
      peak: peakPoint,
      last: visible[visible.length - 1] ?? null,
    };
  }, [visible]);

  const labelByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const point of visible) map.set(point.date, point.label);
    return map;
  }, [visible]);

  const metrics = [
    { label: "Total rentang", value: formatNumber(total) },
    { label: "Rata-rata / hari", value: average.toFixed(1).replace(".", ",") },
    { label: "Puncak", value: peak && peak.count > 0 ? `${formatNumber(peak.count)} · ${peak.label}` : "—" },
    { label: "Hari ini", value: last ? formatNumber(last.count) : "0" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-glass-border bg-white/[0.03] p-0.5" role="group" aria-label="Rentang hari chart">
          {RANGES.map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={range === days}
              disabled={data.length < days}
              onClick={() => setRange(days)}
              className={cn(
                "min-h-7 rounded-md px-2.5 text-label transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
                range === days ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:text-text"
              )}
            >
              {days} hari
            </button>
          ))}
        </div>
        <span className="text-label text-muted tabular">{formatNumber(total)} key dibuat</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-glass-border bg-white/[0.025] px-2.5 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.11em] text-muted">{metric.label}</p>
            <p className="mt-0.5 truncate text-body font-medium text-text tabular" title={metric.value}>{metric.value}</p>
          </div>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="flex h-[220px] items-center justify-center text-body text-muted">Belum ada data chart.</p>
      ) : (
        <div className="h-[220px] w-full" role="img" aria-label={`Chart key dibuat ${range} hari terakhir: total ${formatNumber(total)} key, rata-rata ${average.toFixed(1)} per hari`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visible} margin={{ top: 10, right: 8, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="key-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => labelByDate.get(value) ?? value}
                interval={range === 7 ? 0 : "preserveStartEnd"}
                minTickGap={24}
                stroke="rgba(255,255,255,0.18)"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                dy={4}
              />
              <YAxis
                stroke="rgba(255,255,255,0.18)"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={42}
              />
              <Tooltip content={<GlassTooltip total={total} />} cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "4 4" }} />
              {average > 0 && (
                <ReferenceLine
                  y={average}
                  stroke="rgba(255,255,255,0.28)"
                  strokeDasharray="4 4"
                  label={{ value: "Rata-rata", fill: "var(--muted)", fontSize: 10, position: "insideTopRight" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--accent)"
                strokeWidth={2.2}
                fill="url(#key-chart-fill)"
                dot={false}
                activeDot={{ r: 3.5, fill: "var(--accent)", stroke: "var(--bg)", strokeWidth: 1.5 }}
                isAnimationActive={!reduce}
                animationDuration={700}
              />
              {peak && peak.count > 0 && (
                <ReferenceDot x={peak.date} y={peak.count} r={3.5} fill="var(--bg)" stroke="var(--accent)" strokeWidth={2} />
              )}
              {last && <ReferenceDot x={last.date} y={last.count} r={3.5} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
