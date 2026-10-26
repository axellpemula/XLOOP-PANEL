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

/** Count-up dari 0 ke nilai, sekali saat pertama terlihat. */
export function AnimatedNumber({ value, duration = 600, className, prefix, suffix }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const root = useScrollRoot();
  const reduce = useReducedMotion();
  const inView = useInView(ref, { root: root ?? undefined, once: true, amount: 0.15 });
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    if (reduce) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(easeOutCubic(progress) * value));
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
