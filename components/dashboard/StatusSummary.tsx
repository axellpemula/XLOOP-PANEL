"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { STATUS_BAR } from "@/lib/utils/status";
import { STATUS_LABEL } from "@/lib/utils/constants";
import { formatNumber } from "@/lib/utils/format";
import type { KeyStatus } from "@/lib/utils/types";

interface StatusSummaryProps {
  active: number;
  expired: number;
  banned: number;
}

const ROWS: { key: KeyStatus; value: keyof StatusSummaryProps }[] = [
  { key: "active", value: "active" },
  { key: "expired", value: "expired" },
  { key: "banned", value: "banned" },
];

export function StatusSummary({ active, expired, banned }: StatusSummaryProps) {
  const reduce = useReducedMotion();
  const total = active + expired + banned;
  const values = { active, expired, banned };

  return (
    <GlassCard className="flex h-full flex-col">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-body font-medium text-text">Ringkasan Status</h2>
        <span className="text-label text-muted tabular">{formatNumber(total)} key</span>
      </div>

      <div className="flex flex-col gap-4">
        {ROWS.map((row) => {
          const count = values[row.value];
          const percent = total === 0 ? 0 : Math.round((count / total) * 100);

          return (
            <div key={row.key}>
              <div className="mb-1.5 flex items-center justify-between text-label">
                <span className="text-muted">{STATUS_LABEL[row.key]}</span>
                <span className="tabular text-text">
                  {formatNumber(count)} <span className="text-muted">({percent}%)</span>
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className={`h-full origin-left rounded-full ${STATUS_BAR[row.key]}`}
                  initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
                  animate={{ scaleX: Math.max(percent, 0) / 100 }}
                  transition={{ duration: reduce ? 0.1 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
