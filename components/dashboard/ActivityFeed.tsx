"use client";

import {
  BanIcon,
  ChartIcon,
  KeyIcon,
  PencilIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
  WalletIcon,
  type IconComponent,
} from "@/components/icons";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { relativeTime } from "@/lib/utils/format";
import type { ActivityItem } from "@/lib/utils/types";

const ACTIVITY: Record<ActivityItem["type"], { icon: IconComponent; tile: string }> = {
  generate: { icon: KeyIcon, tile: "border-accent/20 text-accent" },
  topup: { icon: WalletIcon, tile: "border-active/20 text-active" },
  ban: { icon: BanIcon, tile: "border-banned/20 text-banned" },
  unban: { icon: ShieldIcon, tile: "border-active/20 text-active" },
  delete: { icon: TrashIcon, tile: "border-banned/20 text-banned" },
  edit: { icon: PencilIcon, tile: "border-expired/20 text-expired" },
  reseller: { icon: UsersIcon, tile: "border-glass-border text-muted" },
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <GlassCard className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-body font-medium text-text">Aktivitas Terakhir</h2>
        <span className="text-label text-muted tabular">{items.length} aktivitas</span>
      </div>

      {items.length === 0 ? (
        <EmptyState
          message="Belum ada aktivitas"
          hint="Generate key, topup, dan perubahan status akan muncul di sini."
          icon={<ChartIcon size={20} strokeWidth={1.5} />}
          className="py-8"
        />
      ) : (
        <ol className="relative flex flex-col">
          <span className="absolute bottom-4 left-4 top-4 w-px -translate-x-1/2 bg-glass-border" aria-hidden />
          {items.map((item, index) => {
            const { icon: Icon, tile } = ACTIVITY[item.type];
            return (
              <Reveal
                as="li"
                key={item.id}
                index={index}
                className="relative flex items-start gap-3 rounded-lg px-0 py-2 transition-colors duration-150 hover:bg-white/[0.025]"
              >
                <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-[#211f1e] ${tile}`}>
                  <Icon size={15} strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="truncate text-body text-text" title={item.title}>{item.title}</p>
                  <p className="truncate text-label text-muted" title={item.detail}>{item.detail}</p>
                </div>
                <span className="shrink-0 pt-1 text-label text-muted">{relativeTime(item.created_at)}</span>
              </Reveal>
            );
          })}
        </ol>
      )}
    </GlassCard>
  );
}
