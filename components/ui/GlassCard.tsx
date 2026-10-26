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
  as: Tag = "div",
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

  // Prop `as` sebelumnya diterima tapi diabaikan (selalu render <div>).
  const Element = Tag as "div";
  return (
    <Element
      ref={ref}
      data-interactive={interactive || undefined}
      onMouseMove={handleMove}
      className={cn(variant, "rounded-card p-4", spotlight && "spotlight-card", interactive && "cursor-pointer", className)}
      {...props}
    >
      {children}
    </Element>
  );
}
