"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/ui/Reveal";
import { relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ActivityItem } from "@/lib/utils/types";

const DOT: Record<ActivityItem["type"], string> = {
  generate: "bg-accent",
  topup: "bg-active",
  ban: "bg-banned",
  unban: "bg-active",
  delete: "bg-banned",
  edit: "bg-expired",
  reseller: "bg-muted",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <GlassCard className="flex h-full flex-col">
      <h2 className="mb-4 text-body font-medium text-text">Aktivitas Terakhir</h2>

      {items.length === 0 ? (
        <p className="py-8 text-center text-body text-muted">Belum ada aktivitas.</p>
      ) : (
        <ol className="relative flex flex-col gap-4">
          <span className="absolute bottom-1 left-[3px] top-1 w-px bg-glass-border" aria-hidden />
          {items.map((item, index) => (
            <Reveal as="li" key={item.id} index={index} className="relative flex gap-3 pl-4">
              <span
                className={cn(
                  "absolute left-0 top-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  DOT[item.type]
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-text">{item.title}</p>
                <p className="truncate text-label text-muted">{item.detail}</p>
              </div>
              <span className="shrink-0 text-label text-muted">{relativeTime(item.created_at)}</span>
            </Reveal>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}
