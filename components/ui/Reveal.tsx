"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useScrollRoot } from "./ScrollRoot";
import { cn } from "@/lib/utils/cn";

interface RevealProps {
  children: React.ReactNode;
  /** Urutan elemen sejajar → stagger 60ms, maksimal 600ms. */
  index?: number;
  className?: string;
  /** Heading: pakai fade + blur(4px → 0). */
  heading?: boolean;
  as?: "div" | "section" | "li" | "tr";
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export function Reveal({ children, index = 0, className, heading, as = "div", onClick }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const root = useScrollRoot();
  const reduce = useReducedMotion();
  const inView = useInView(ref, { root: root ?? undefined, once: true, amount: 0.15 });
  const delay = Math.min(index * 0.06, 0.6);

  const MotionTag = motion[as] as typeof motion.div;

  const visible = reduce
    ? { opacity: 1, transition: { duration: 0.1, delay: 0 } }
    : {
        opacity: 1,
        y: 0,
        filter: heading ? "blur(0px)" : undefined,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const, delay },
      };

  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, y: 16, filter: heading ? "blur(4px)" : undefined };

  return (
    <MotionTag
      ref={ref}
      initial={hidden}
      animate={inView ? visible : hidden}
      className={cn(className)}
      onClick={onClick}
    >
      {children}
    </MotionTag>
  );
}

/** Stagger untuk daftar baris (maks 15 baris pertama, sisanya langsung tampil). */
export function revealDelay(index: number, max = 15): number {
  return index < max ? index : max - 1;
}
