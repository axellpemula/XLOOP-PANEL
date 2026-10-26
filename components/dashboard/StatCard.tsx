"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
  className?: string;
  accent?: "default" | "active" | "expired" | "banned";
}

const valueTone = {
  default: "text-text",
  active: "text-active",
  expired: "text-expired",
  banned: "text-banned",
};

export function StatCard({ label, value, hint, className, accent = "default" }: StatCardProps) {
  return (
    <GlassCard spotlight className={cn("flex flex-col justify-between gap-2", className)}>
      <p className="text-label text-muted">{label}</p>
      <div>
        <p className={cn("text-2xl font-semibold leading-8", valueTone[accent])}>
          <AnimatedNumber value={value} />
        </p>
        {hint && <p className="mt-0.5 text-label text-muted">{hint}</p>}
      </div>
    </GlassCard>
  );
}
