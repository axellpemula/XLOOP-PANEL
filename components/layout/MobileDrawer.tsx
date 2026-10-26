"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloseIcon } from "@/components/icons";
import { SidebarContent } from "./Sidebar";
import type { SessionUser } from "@/lib/utils/types";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
}

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

/** Drawer kiri (280px, glass-strong) untuk layar < 768px. */
export function MobileDrawer({ open, onClose, user }: MobileDrawerProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // onClose dibaca lewat ref supaya effect hanya berjalan saat drawer
  // dibuka/ditutup (identitas inline callback berubah setiap render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());

    // Tutup otomatis kalau layar melebar ke breakpoint desktop selagi terbuka
    // (sebelumnya drawer menghilang visual via md:hidden tapi state-nya tetap
    // terbuka dan listener Esc tetap aktif).
    const desktopQuery = window.matchMedia("(min-width: 768px)");
    const onBreakpoint = () => {
      if (desktopQuery.matches) onCloseRef.current();
    };
    desktopQuery.addEventListener("change", onBreakpoint);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (!panelRef.current.contains(document.activeElement as Node | null)) {
          // Fokus terlepas ke luar drawer (mis. ke body) — tarik kembali,
          // samakan dengan perilaku Modal.
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      desktopQuery.removeEventListener("change", onBreakpoint);
      document.removeEventListener("keydown", onKeyDown);
      if (previous && document.contains(previous)) previous.focus?.();
    };
  }, [open]);

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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="glass-strong absolute left-0 top-0 flex h-full w-[280px] flex-col rounded-r-card"
            initial={reduce ? { opacity: 0 } : { x: -280 }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: -280 }}
            transition={reduce ? { duration: 0.1 } : { type: "spring", stiffness: 400, damping: 36 }}
          >
            <button
              ref={closeRef}
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
