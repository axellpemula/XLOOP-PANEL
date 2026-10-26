"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatNumber } from "@/lib/utils/format";

export function CreditCard({ credit }: { credit: number }) {
  return (
    <GlassCard spotlight className="flex h-full flex-col justify-between gap-4">
      <div>
        <p className="text-label text-muted">Sisa Credit</p>
        <p className="mt-1 text-3xl font-semibold leading-10 text-text">
          <AnimatedNumber value={credit} />
        </p>
        <p className="mt-1 text-label text-muted">Dipotong otomatis tiap generate key.</p>
      </div>
      <Link
        href="/generate"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-body font-semibold text-[var(--accent-ink)] transition-transform duration-150 active:scale-[0.97]"
      >
        Buat Key
        <ArrowRightIcon size={16} strokeWidth={1.5} />
      </Link>
    </GlassCard>
  );
}
