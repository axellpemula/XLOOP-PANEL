"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  side?: "right" | "top";
  className?: string;
}

/** Tooltip glass sederhana (dipakai sidebar saat collapse). */
export function Tooltip({ label, children, side = "right", className }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn("relative flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, x: side === "right" ? -4 : 0, y: side === "top" ? 4 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "glass-strong pointer-events-none absolute z-50 whitespace-nowrap rounded-lg px-2 py-1 text-label text-text",
              side === "right" ? "left-full top-1/2 ml-2 -translate-y-1/2" : "bottom-full left-1/2 mb-2 -translate-x-1/2"
            )}
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
