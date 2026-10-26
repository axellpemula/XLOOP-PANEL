import { InfoIcon } from "@/components/icons";
import { Button } from "./Button";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  message: string;
  /** Penjelasan singkat di bawah pesan utama. */
  hint?: string;
  /** Ikon di dalam lingkaran glass. */
  icon?: React.ReactNode;
  /** Langkah singkat berikutnya, mis. ["Buat tool", "Tambah version", "Generate key"]. */
  steps?: string[];
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Empty state: ikon dalam lingkaran berpendar + satu pesan + (opsional)
 * langkah berikutnya dan satu CTA. Tetap tanpa ilustrasi berat supaya
 * konsisten dengan bahasa visual panel.
 */
export function EmptyState({ message, hint, icon, steps, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-4 py-12 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent shadow-[0_0_28px_rgba(139,147,255,0.16)]">
        {icon ?? <InfoIcon size={20} strokeWidth={1.5} />}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-body font-medium text-text">{message}</p>
        {hint && <p className="max-w-sm text-label text-muted">{hint}</p>}
      </div>
      {steps && steps.length > 0 && (
        <ol className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Langkah berikutnya">
          {steps.map((step, index) => (
            <li key={step} className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.03] px-2 py-1 text-label text-muted">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                  {index + 1}
                </span>
                {step}
              </span>
              {index < steps.length - 1 && <span className="text-muted/60" aria-hidden>→</span>}
            </li>
          ))}
        </ol>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
