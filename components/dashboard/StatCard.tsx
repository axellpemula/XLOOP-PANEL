"use client";

import { useId } from "react";
import { MinusIcon, TrendDownIcon, TrendUpIcon } from "@/components/icons";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { cn } from "@/lib/utils/cn";

type StatAccent = "default" | "active" | "expired" | "banned";

interface StatDelta {
  label: string;
  direction: "up" | "down" | "flat";
  /** Makna perubahan: naik belum tentu baik (mis. key banned bertambah). */
  tone?: "good" | "bad" | "neutral";
}

interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  icon?: React.ReactNode;
  delta?: StatDelta;
  sparkline?: number[];
  className?: string;
  accent?: StatAccent;
}

const TILE: Record<StatAccent, string> = {
  default: "border-accent/20 bg-accent-soft text-accent",
  active: "border-active/20 bg-active-soft text-active",
  expired: "border-expired/20 bg-expired-soft text-expired",
  banned: "border-banned/20 bg-banned-soft text-banned",
};

const SPARK_STROKE: Record<StatAccent, string> = {
  default: "var(--accent)",
  active: "var(--active)",
  expired: "var(--expired)",
  banned: "var(--banned)",
};

const DELTA_TONE: Record<NonNullable<StatDelta["tone"]>, string> = {
  good: "border-active/20 bg-active-soft text-active",
  bad: "border-banned/20 bg-banned-soft text-banned",
  neutral: "border-glass-border bg-white/[0.03] text-muted",
};

/** Sparkline SVG mini (tanpa library) dari deret angka harian. */
function Sparkline({ values, accent }: { values: number[]; accent: StatAccent }) {
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const width = 120;
  const height = 30;
  const padding = 2;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return { x, y };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${(width - padding).toFixed(1)},${height} L${padding},${height} Z`;
  const last = points[points.length - 1];

  if (points.length === 0) return null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SPARK_STROKE[accent]} stopOpacity="0.28" />
          <stop offset="100%" stopColor={SPARK_STROKE[accent]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path d={line} fill="none" stroke={SPARK_STROKE[accent]} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last.x} cy={last.y} r="2.2" fill={SPARK_STROKE[accent]} stroke="var(--bg)" strokeWidth="0.8" />}
    </svg>
  );
}

export function StatCard({ label, value, hint, icon, delta, sparkline, className, accent = "default" }: StatCardProps) {
  const DeltaIcon = delta?.direction === "up" ? TrendUpIcon : delta?.direction === "down" ? TrendDownIcon : MinusIcon;

  return (
    <GlassCard spotlight className={cn("flex h-full flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-label font-medium text-muted">{label}</p>
        {icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", TILE[accent])}>
            {icon}
          </span>
        )}
      </div>

      <p className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-text tabular">
        <AnimatedNumber value={value} />
      </p>

      <div className="mt-auto flex flex-col gap-2">
        {(delta || hint) && (
          <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
            {delta && (
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium tabular", DELTA_TONE[delta.tone ?? "neutral"])}>
                <DeltaIcon size={12} strokeWidth={1.7} />
                {delta.label}
              </span>
            )}
            {hint && <span className="text-label text-muted">{hint}</span>}
          </div>
        )}
        {sparkline && sparkline.length > 1 && <Sparkline values={sparkline} accent={accent} />}
      </div>
    </GlassCard>
  );
}
