import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-block", className)} aria-hidden />;
}

export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-40" : "w-24")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  // Siluetnya meniru StatCard asli (label + tile ikon + angka + hint) supaya
  // layout tidak meloncat saat data selesai dimuat.
  return (
    <div className={cn("glass flex flex-col gap-3 rounded-card p-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}
