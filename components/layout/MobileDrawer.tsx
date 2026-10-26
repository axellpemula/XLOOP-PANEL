"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloseIcon } from "@/components/icons";
import { SidebarContent } from "./Sidebar";
import type { SessionUser } from "@/lib/utils/types";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
}

/** Drawer kiri (280px, glass-strong) untuk layar < 768px. */
export function MobileDrawer({ open, onClose, user }: MobileDrawerProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            className="absolute inset-0 bg-black/50"
            style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.1 : 0.15 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="MenuIcon"
            className="glass-strong absolute left-0 top-0 flex h-full w-[280px] flex-col rounded-r-card"
            initial={reduce ? { opacity: 0 } : { x: -280 }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: -280 }}
            transition={reduce ? { duration: 0.1 } : { type: "spring", stiffness: 400, damping: 36 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup menu"
              className="absolute right-2 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/5 hover:text-text"
            >
              <CloseIcon size={16} strokeWidth={1.5} />
            </button>
            <SidebarContent user={user} collapsed={false} onToggle={() => {}} onNavigate={onClose} variant="drawer" />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
