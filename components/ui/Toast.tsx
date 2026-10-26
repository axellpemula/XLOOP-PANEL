"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertIcon, CheckCircleIcon, CloseIcon, InfoIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const toneIcon: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircleIcon size={16} strokeWidth={1.5} className="text-active" />,
  error: <AlertIcon size={16} strokeWidth={1.5} className="text-banned" />,
  info: <InfoIcon size={16} strokeWidth={1.5} className="text-muted" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, number>());
  const reduce = useReducedMotion();

  const remove = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      counter.current += 1;
      const id = counter.current;
      setItems((prev) => {
        // Bersihkan timer toast yang tergusur dari tumpukan (maks. 4).
        for (const dropped of prev.slice(0, -3)) {
          const timer = timers.current.get(dropped.id);
          if (timer !== undefined) {
            window.clearTimeout(timer);
            timers.current.delete(dropped.id);
          }
        }
        return [...prev.slice(-3), { id, message, tone }];
      });
      timers.current.set(
        id,
        window.setTimeout(() => remove(id), 4000)
      );
    },
    [remove]
  );

  // Jangan biarkan timer memanggil setState setelah provider unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => window.clearTimeout(timer));
      map.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-32px)] max-w-sm flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              animate={reduce ? { opacity: 1, transition: { duration: 0.1 } } : { opacity: 1, x: 0, transition: { duration: 0.22 } }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.15 } }}
              className="glass-strong pointer-events-auto overflow-hidden rounded-card"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}
              role={item.tone === "error" ? "alert" : "status"}
            >
              <div className="flex items-start gap-2 px-3 py-2.5">
                <span className="mt-0.5 shrink-0">{toneIcon[item.tone]}</span>
                <p className="flex-1 text-body text-text">{item.message}</p>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  aria-label="Tutup notifikasi"
                  className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/5 hover:text-text"
                >
                  <CloseIcon size={14} strokeWidth={1.5} />
                </button>
              </div>
              <div className="h-0.5 w-full bg-white/5">
                {/* Pakai class utilitas animate-*: keyframes toastProgress di
                    tailwind.config baru diterbitkan Tailwind kalau utilitas
                    animasinya dipakai — inline style saja membuat bar diam. */}
                <div
                  className={cn(
                    "animate-toast-progress h-full w-full origin-left",
                    item.tone === "error" ? "bg-banned/70" : item.tone === "success" ? "bg-active/70" : "bg-accent/70"
                  )}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
