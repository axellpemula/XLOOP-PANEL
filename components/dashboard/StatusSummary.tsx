"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { STATUS_BAR, STATUS_DOT } from "@/lib/utils/status";
import { STATUS_LABEL } from "@/lib/utils/constants";
import { formatNumber } from "@/lib/utils/format";
import type { KeyStatus } from "@/lib/utils/types";

interface StatusSummaryProps {
  active: number;
  expired: number;
  banned: number;
}

const STROKE: Record<KeyStatus, string> = {
  active: "var(--active)",
  expired: "var(--expired)",
  banned: "var(--banned)",
};

export function StatusSummary({ active, expired, banned }: StatusSummaryProps) {
  const total = active + expired + banned;
  const rows: Array<{ key: KeyStatus; count: number }> = [
    { key: "active", count: active },
    { key: "expired", count: expired },
    { key: "banned", count: banned },
  ];

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;
  const segments = rows.map((row) => {
    const fraction = total === 0 ? 0 : row.count / total;
    const length = fraction * circumference;
    const gap = total > 0 && row.count > 0 ? Math.min(3, length / 2) : 0;
    const segment = {
      ...row,
      fraction,
      dash: Math.max(length - gap, 0),
      offset: -consumed,
    };
    consumed += length;
    return segment;
  });

  const summaryLabel = `Status key: ${formatNumber(active)} active, ${formatNumber(expired)} expired, ${formatNumber(banned)} banned, total ${formatNumber(total)} key.`;

  return (
    <GlassCard className="flex h-full flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-body font-medium text-text">Ringkasan Status</h2>
        <span className="text-label text-muted tabular">{formatNumber(total)} key</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-2">
        <div className="relative h-36 w-36 shrink-0" role="img" aria-label={summaryLabel}>
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="13" />
            {total > 0 &&
              segments.map(
                (segment) =>
                  segment.count > 0 && (
                    <circle
                      key={segment.key}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke={STROKE[segment.key]}
                      strokeWidth="13"
                      strokeLinecap="round"
                      strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
                      strokeDashoffset={segment.offset}
                      className="transition-[stroke-dasharray,stroke-dashoffset] duration-500"
                    />
                  )
              )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold leading-none text-text tabular">
              <AnimatedNumber value={total} />
            </span>
            <span className="mt-1 text-label text-muted">total key</span>
          </div>
        </div>

        <div className="w-full">
          <ul className="flex flex-col gap-2.5">
            {rows.map((row) => {
              const percent = total === 0 ? 0 : Math.round((row.count / total) * 100);
              return (
                <li key={row.key} className="flex items-center gap-2 text-label">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[row.key]}`} aria-hidden />
                  <span className="flex-1 text-muted">{STATUS_LABEL[row.key]}</span>
                  <span className="font-medium text-text tabular">{formatNumber(row.count)}</span>
                  <span className="w-10 text-right text-muted tabular">({percent}%)</span>
                </li>
              );
            })}
          </ul>

          {/* Stacked bar: versi linear dari donut untuk perbandingan cepat */}
          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
            {total > 0 &&
              rows.map(
                (row) =>
                  row.count > 0 && (
                    <span
                      key={row.key}
                      className={`h-full ${STATUS_BAR[row.key]}`}
                      style={{ width: `${(row.count / total) * 100}%` }}
                    />
                  )
              )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
