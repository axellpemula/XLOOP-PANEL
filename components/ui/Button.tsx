"use client";

import { forwardRef } from "react";
import { SpinnerIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "primary-surface text-[var(--accent-ink)] hover:brightness-110 font-semibold",
  ghost: "border border-glass-border bg-transparent text-text hover:bg-glass-strong",
  danger: "border border-banned/60 bg-banned/15 text-banned hover:bg-banned/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 min-h-8 px-3 text-label",
  md: "h-10 min-h-10 px-4 text-body",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ghost", size = "md", loading, icon, className, children, disabled, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      // Default type="button": tanpa ini, Button di dalam <form> berperilaku
      // sebagai submit dan memicu pengiriman form yang tidak disengaja.
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <SpinnerIcon size={16} strokeWidth={1.5} className="animate-spin" /> : icon}
      {children}
    </button>
  );
});
