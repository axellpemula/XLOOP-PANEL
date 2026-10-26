"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertIcon, CheckCircleIcon, InfoIcon } from "@/components/icons";
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
  const reduce = useReducedMotion();

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    counter.current += 1;
    const id = counter.current;
    setItems((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => remove(id), 4000);
  }, [remove]);

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
              role="status"
            >
              <div className="flex items-start gap-2 px-3 py-2.5">
                <span className="mt-0.5 shrink-0">{toneIcon[item.tone]}</span>
                <p className="text-body text-text">{item.message}</p>
              </div>
              <div className="h-0.5 w-full bg-white/5">
                <div
                  className={cn(
                    "h-full w-full origin-left",
                    item.tone === "error" ? "bg-banned/70" : item.tone === "success" ? "bg-active/70" : "bg-accent/70"
                  )}
                  style={{ animation: "toastProgress 4s linear forwards" }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
