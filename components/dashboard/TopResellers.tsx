"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CrownIcon, UsersIcon } from "@/components/icons";
import { GlassCard } from "@/components/ui/GlassCard";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { TopReseller } from "@/lib/utils/types";

export function TopResellers({ items }: { items: TopReseller[] }) {
  const reduce = useReducedMotion();
  const maxKeys = Math.max(...items.map((item) => item.key_count), 0);

  return (
    <GlassCard className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-body font-medium text-text">Top Reseller</h2>
        <Link href="/resellers" className="text-label text-muted transition-colors hover:text-text">
          Lihat semua
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          message="Belum ada reseller"
          hint="Reseller dengan key terbanyak akan muncul sebagai ranking di sini."
          icon={<UsersIcon size={20} strokeWidth={1.5} />}
          className="py-8"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.06]">
          {items.map((item, index) => {
            const relative = maxKeys === 0 ? 0 : item.key_count / maxKeys;
            return (
              <Reveal as="li" key={item.id} index={index} className="py-3 first:pt-1 last:pb-0">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold tabular",
                      index === 0
                        ? "border-expired/25 bg-expired-soft text-expired"
                        : "border-glass-border bg-white/[0.03] text-muted"
                    )}
                    aria-label={`Peringkat ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                  <Avatar name={item.username} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-body font-medium text-text">
                      <span className="truncate">{item.username}</span>
                      {index === 0 && <CrownIcon size={14} strokeWidth={1.5} className="shrink-0 text-expired" />}
                    </p>
                    <p className="truncate text-label text-muted">{item.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-body font-medium text-text tabular">{formatNumber(item.key_count)} key</p>
                    <p className="text-label text-muted tabular">{formatNumber(item.credit)} credit</p>
                  </div>
                </div>

                {/* Bar relatif terhadap peringkat pertama */}
                <div className="ml-[72px] mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
                  <motion.div
                    className={cn("h-full origin-left rounded-full", index === 0 ? "bg-expired" : "bg-accent")}
                    initial={reduce ? { scaleX: 1 } : { scaleX: 0 }}
                    animate={{ scaleX: relative }}
                    transition={{ duration: reduce ? 0.1 : 0.55, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : index * 0.05 }}
                    style={{ width: "100%" }}
                  />
                </div>
              </Reveal>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}
