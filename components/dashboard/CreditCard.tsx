"use client";

import Link from "next/link";
import { ArrowRightIcon, WalletIcon } from "@/components/icons";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

export function CreditCard({ credit }: { credit: number }) {
  return (
    <GlassCard spotlight className="relative flex h-full flex-col justify-between gap-5 overflow-hidden">
      <span
        className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-accent/15 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="pt-1 text-label font-medium text-muted">Sisa Credit</p>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft text-accent">
            <WalletIcon size={17} strokeWidth={1.5} />
          </span>
        </div>
        <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.02em] text-text tabular">
          <AnimatedNumber value={credit} />
        </p>
        <p className="mt-2 text-label leading-relaxed text-muted">
          Dipotong otomatis tiap generate key, sesuai harga preset yang dipilih.
        </p>
      </div>

      <div className="relative flex flex-col gap-2">
        <Link
          href="/generate"
          className="primary-surface inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-body font-semibold text-[var(--accent-ink)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97]"
        >
          Buat Key
          <ArrowRightIcon size={16} strokeWidth={1.5} />
        </Link>
        <Link href="/credits" className="text-center text-label text-muted transition-colors hover:text-text">
          Lihat riwayat credit
        </Link>
      </div>
    </GlassCard>
  );
}
