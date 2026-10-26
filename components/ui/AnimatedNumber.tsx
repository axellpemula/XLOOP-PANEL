"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useScrollRoot } from "./ScrollRoot";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Count-up saat pertama terlihat, lalu menganimasikan perubahan nilai
 * berikutnya dari angka yang sedang tampil. (Versi sebelumnya mengunci
 * animasi dengan ref "started", jadi setelah tombol Muat Ulang di dashboard
 * angka statistik tidak pernah berubah walau datanya baru.)
 */
export function AnimatedNumber({ value, duration = 600, className, prefix, suffix }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const root = useScrollRoot();
  const reduce = useReducedMotion();
  const inView = useInView(ref, { root: root ?? undefined, once: true, amount: 0.15 });
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView) return;

    if (reduce) {
      displayRef.current = value;
      setDisplay(value);
      hasAnimated.current = true;
      return;
    }

    const from = hasAnimated.current ? displayRef.current : 0;
    hasAnimated.current = true;
    if (from === value) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = Math.round(from + easeOutCubic(progress) * (value - from));
      displayRef.current = current;
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {prefix}
      {formatNumber(display)}
      {suffix}
    </span>
  );
}
