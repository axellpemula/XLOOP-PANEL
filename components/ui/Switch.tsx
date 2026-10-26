"use client";

import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

/** Toggle kecil untuk status aktif/nonaktif. */
export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <label htmlFor={id} className={cn("inline-flex cursor-pointer items-center gap-2", disabled && "opacity-50")}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150",
          checked ? "border-accent/50 bg-accent/30" : "border-glass-border bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-transform duration-150 ease-out",
            checked ? "translate-x-[18px] bg-accent" : "translate-x-0.5 bg-muted"
          )}
        />
      </button>
      {label && <span className="text-label text-muted">{label}</span>}
    </label>
  );
}
