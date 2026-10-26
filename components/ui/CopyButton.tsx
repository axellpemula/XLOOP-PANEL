"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { useToast } from "./Toast";

interface CopyButtonProps {
  value: string;
  label?: string;
  toastMessage?: string;
  className?: string;
  size?: number;
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Fallback untuk konteks non-secure (navigator.clipboard tidak tersedia).
    const previouslyFocused = document.activeElement as HTMLElement | null;
    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.readOnly = true;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const done = document.execCommand("copy");
      document.body.removeChild(el);
      // select() mencuri fokus ke textarea sementara; kembalikan ke pemicu
      // supaya posisi keyboard user tidak hilang ke <body>.
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus?.();
      return done;
    } catch {
      return false;
    }
  }
}

/** Tombol copy: icon CopyIcon → CheckIcon (1,5 detik, crossfade) + toast singkat. */
export function CopyButton({ value, label, toastMessage = "Disalin", className, size = 16 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  async function handleCopy(event: React.MouseEvent) {
    event.stopPropagation();
    const done = await copyText(value);
    if (!done) {
      toast("Gagal menyalin", "error");
      return;
    }
    setCopied(true);
    toast(toastMessage, "success");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ?? "Salin"}
      title={label ?? "Salin"}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/5 hover:text-text",
        className
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="text-active"
          >
            <CheckIcon size={size} strokeWidth={1.5} />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <CopyIcon size={size} strokeWidth={1.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
