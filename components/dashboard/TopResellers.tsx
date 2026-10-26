"use client";

import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/ui/Reveal";
import { formatNumber } from "@/lib/utils/format";
import type { TopReseller } from "@/lib/utils/types";

export function TopResellers({ items }: { items: TopReseller[] }) {
  return (
    <GlassCard className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-body font-medium text-text">Top Reseller</h2>
        <Link href="/resellers" className="text-label text-muted transition-colors hover:text-text">
          Lihat semua
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-body text-muted">Belum ada reseller.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.06]">
          {items.map((item, index) => (
            <Reveal as="li" key={item.id} index={index} className="flex items-center gap-3 py-2.5">
              <span className="w-5 shrink-0 text-label text-muted tabular">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-text">{item.username}</p>
                <p className="truncate text-label text-muted">{item.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-body text-text tabular">{formatNumber(item.key_count)} key</p>
                <p className="text-label text-muted tabular">{formatNumber(item.credit)} credit</p>
              </div>
            </Reveal>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
