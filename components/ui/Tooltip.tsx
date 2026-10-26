"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  side?: "right" | "top";
  className?: string;
}

interface Anchor {
  x: number;
  y: number;
}

/**
 * Tooltip glass sederhana (dipakai sidebar saat collapse).
 *
 * Dirender lewat portal dengan posisi fixed dari rect pemicu:
 * - Versi lama memakai absolute di dalam <nav> sidebar yang overflow-y-auto,
 *   jadi tooltip terpotong tepi sidebar / memicu scrollbar horizontal.
 * - Versi lama juga menggabungkan class Tailwind -translate-1/2 dengan
 *   animasi transform framer-motion; framer menimpa transform class
 *   sehingga tooltip tidak pernah benar-benar ter-center.
 * Sekarang posisi tengah dihitung dari rect dan framer hanya menganimasikan
 * opacity.
 */
export function Tooltip({ label, children, side = "right", className }: TooltipProps) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  function show() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor(
      side === "right"
        ? { x: rect.right + 8, y: rect.top + rect.height / 2 }
        : { x: rect.left + rect.width / 2, y: rect.top - 8 }
    );
  }

  function hide() {
    setAnchor(null);
  }

  return (
    <div
      ref={wrapRef}
      className={cn("relative flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(event) => {
        // Jangan tutup kalau fokus hanya berpindah antar-elemen di dalamnya.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hide();
      }}
    >
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {anchor && (
              <motion.span
                role="tooltip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="glass-strong pointer-events-none fixed z-[70] whitespace-nowrap rounded-lg px-2 py-1 text-label text-text"
                style={{
                  left: anchor.x,
                  top: anchor.y,
                  // Offset tengah lewat motion value x/y (bukan class
                  // -translate-* yang akan ditimpa framer-motion).
                  x: side === "top" ? "-50%" : 0,
                  y: side === "right" ? "-50%" : "-100%",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                }}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
