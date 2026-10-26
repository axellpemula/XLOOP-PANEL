"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "glass-strong";
  spotlight?: boolean;
  interactive?: boolean;
  as?: "div" | "section" | "article";
}

/** Kartu glass dengan spotlight kursor (aktif hanya di perangkat hover). */
export function GlassCard({
  variant = "glass",
  spotlight = false,
  interactive = false,
  className,
  children,
  onMouseMove,
  ...props
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (spotlight && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        ref.current.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }
      onMouseMove?.(event);
    },
    [spotlight, onMouseMove]
  );

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn(
        variant,
        "rounded-card p-4",
        spotlight && "spotlight-card",
        interactive && "cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
