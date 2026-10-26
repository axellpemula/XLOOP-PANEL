"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Blokir tutup lewat Esc/backdrop/tombol X selagi proses simpan berjalan. */
  busy?: boolean;
  /** Kalau diisi, isi modal dibungkus <form> — Enter di input memicu submit ini. */
  onSubmit?: () => void;
}

const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

/**
 * Registry modal yang sedang terbuka (untuk modal bertumpuk, mis.
 * ConfirmDialog di atas modal form):
 * - Hanya modal teratas yang merespons Esc & menahan fokus (sebelumnya satu
 *   kali Esc menutup SEMUA modal yang bertumpuk).
 * - Scroll body dikunci dengan hitung referensi, jadi menutup modal atas
 *   tidak membuka kunci scroll selagi modal di bawahnya masih terbuka.
 */
const modalStack: object[] = [];
let savedBodyOverflow: string | null = null;

function lockBodyScroll(token: object) {
  if (modalStack.length === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  modalStack.push(token);
}

function unlockBodyScroll(token: object) {
  const index = modalStack.indexOf(token);
  if (index >= 0) modalStack.splice(index, 1);
  if (modalStack.length === 0) {
    document.body.style.overflow = savedBodyOverflow ?? "";
    savedBodyOverflow = null;
  }
}

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function Modal({ open, onClose, title, description, children, footer, size = "md", busy, onSubmit }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `modal-${rawId}-title`;
  const descriptionId = `modal-${rawId}-desc`;

  // Selalu pakai callback terbaru TANPA menjadikannya dependensi effect.
  // Dependensi [open, onClose] adalah akar bug "fokus lompat ke field
  // pertama setiap ketikan": onClose inline di parent berubah identitas
  // setiap render → effect jalan ulang setiap ketik → timer autofocus
  // memindahkan fokus ke input pertama (mis. Username di form Reseller).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const tokenRef = useRef<object | null>(null);
  if (tokenRef.current === null) tokenRef.current = {};

  // Effect ini HANYA berjalan saat modal dibuka/ditutup — bukan setiap render.
  useEffect(() => {
    if (!open) return;

    const token = tokenRef.current as object;
    const previous = document.activeElement as HTMLElement | null;
    lockBodyScroll(token);

    // Autofokus sekali saat modal dibuka. Kalau user sudah lebih dulu
    // memfokuskan elemen di dalam panel, jangan rebut fokusnya.
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && panel.contains(active) && active !== panel) return;
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]:not([disabled])") ??
        panel.querySelector<HTMLElement>(
          "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])"
        ) ??
        panel;
      target.focus();
    });

    function isTopmost() {
      return modalStack[modalStack.length - 1] === token;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!isTopmost()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!busyRef.current) onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (nodes.length === 0) {
          event.preventDefault();
          panelRef.current.focus();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        // Fokus terlepas ke luar panel (mis. ke body) — tarik kembali.
        if (!active || !panelRef.current.contains(active)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      unlockBodyScroll(token);
      // Kembalikan fokus ke pemicu hanya sekali, saat modal benar-benar tutup,
      // dan hanya kalau elemennya masih ada di dokumen.
      if (previous && document.contains(previous)) previous.focus?.();
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  const requestClose = () => {
    if (!busy) onClose();
  };

  const content = (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-base font-semibold text-text">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-label text-muted">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={requestClose}
          disabled={busy}
          aria-label="Tutup"
          className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/5 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CloseIcon size={16} strokeWidth={1.5} />
        </button>
      </div>
      <div className="max-h-[65vh] overflow-y-auto scroll-area pr-0.5">{children}</div>
      {footer && <div className="mt-5 flex items-center justify-end gap-2">{footer}</div>}
    </>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/50"
            style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            onClick={requestClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn("glass-strong relative z-10 w-full rounded-[20px] p-5 outline-none sm:rounded-card", sizes[size])}
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={
              reduce
                ? { opacity: 1, transition: { duration: 0.1 } }
                : { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 32 } }
            }
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.12 } }}
          >
            {/* Pegangan visual bottom-sheet di mobile */}
            <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden />
            {onSubmit ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!busy) onSubmit();
                }}
                onKeyDown={(event) => {
                  // Form modal tidak punya tombol type=submit (tombol footer
                  // memakai onClick), dan HTML memblokir implicit submission
                  // untuk form multi-field tanpa tombol submit — tangani
                  // Enter di input secara eksplisit. Textarea & tombol
                  // (termasuk trigger Select) dikecualikan.
                  if (
                    event.key === "Enter" &&
                    event.target instanceof HTMLInputElement &&
                    !["checkbox", "radio", "button", "submit"].includes(event.target.type)
                  ) {
                    event.preventDefault();
                    if (!busy) onSubmit();
                  }
                }}
              >
                {content}
              </form>
            ) : (
              content
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Lanjut",
  cancelLabel = "Batal",
  destructive,
  loading,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      busy={loading}
      footer={
        <>
          {/* Dialog destruktif: fokus awal di "Batal" supaya Enter/Spasi tidak
              sengaja langsung menghapus. Non-destruktif fokus di tombol konfirmasi. */}
          <Button onClick={onClose} disabled={loading} data-autofocus={destructive || undefined}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            data-autofocus={destructive ? undefined : true}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body text-muted">{message}</p>
    </Modal>
  );
}
