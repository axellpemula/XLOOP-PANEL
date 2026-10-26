"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRightIcon, KeyIcon, PlusIcon, SearchIcon, TimerIcon, ToolsIcon, UsersIcon, type IconComponent } from "@/components/icons";
import { MENU } from "./menu";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/lib/utils/types";

interface Command {
  id: string;
  label: string;
  detail: string;
  href: string;
  icon: IconComponent;
  keywords: string;
}

interface CommandPaletteProps {
  open: boolean;
  role: Role;
  onClose: () => void;
}

/**
 * Command palette (Ctrl/⌘+K): lompat ke halaman atau cari key tanpa
 * menyentuh mouse. Pola keyboard-nya mengikuti listbox Select panel ini:
 * panah untuk bergerak, Enter untuk menjalankan, Esc hanya menutup palette.
 */
export function CommandPalette({ open, role, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollActiveRef = useRef(false);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = MENU[role].map((item) => ({
      id: `nav-${item.href}`,
      label: item.label,
      detail: item.section,
      href: item.href,
      icon: item.icon,
      keywords: `${item.label} ${item.keywords ?? ""} ${item.section}`,
    }));

    const actions: Command[] =
      role === "owner"
        ? [
            { id: "act-tool", label: "Tambah Tool", detail: "Aksi", href: "/tools", icon: ToolsIcon, keywords: "buat tool baru tambah versi" },
            { id: "act-duration", label: "Tambah Preset Durasi", detail: "Aksi", href: "/durations", icon: TimerIcon, keywords: "buat durasi preset baru" },
            { id: "act-reseller", label: "Tambah Reseller", detail: "Aksi", href: "/resellers", icon: UsersIcon, keywords: "buat akun reseller topup pengguna" },
          ]
        : [
            { id: "act-generate", label: "Buat Key Baru", detail: "Aksi", href: "/generate", icon: PlusIcon, keywords: "generate buat key lisensi" },
          ];

    const trimmed = query.trim();
    const searchCommand: Command[] =
      trimmed.length >= 2
        ? [
            {
              id: "search-key",
              label: `Cari key “${trimmed}”`,
              detail: "Key List",
              href: `/keys?search=${encodeURIComponent(trimmed)}`,
              icon: KeyIcon,
              keywords: trimmed,
            },
          ]
        : [];

    const normalized = trimmed.toLowerCase();
    if (!normalized) return [...nav, ...actions];
    const matches = [...nav, ...actions].filter((command) =>
      command.keywords.toLowerCase().includes(normalized)
    );
    // Perintah navigasi selalu didahulukan: mengetik "dashboard" lalu Enter
    // harus membuka Dashboard, bukan mencari key bernama "dashboard".
    // Pencarian key tetap tersedia sebagai hasil terakhir (atau satu-satunya
    // hasil saat query memang berbentuk key dan tak ada halaman yang cocok).
    return [...matches, ...searchCommand];
  }, [role, query]);

  // Reset & fokuskan input setiap kali dibuka; kembalikan fokus saat ditutup.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    setQuery("");
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      if (previous && document.contains(previous)) previous.focus?.();
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Gulir item aktif di dalam list saja (bukan halaman) untuk navigasi keyboard.
  useEffect(() => {
    if (!open || !scrollActiveRef.current) return;
    scrollActiveRef.current = false;
    const list = listRef.current;
    const node = list?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!list || !node) return;
    if (node.offsetTop < list.scrollTop) list.scrollTop = node.offsetTop - 6;
    else if (node.offsetTop + node.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = node.offsetTop + node.offsetHeight - list.clientHeight + 6;
  }, [open, activeIndex]);

  function run(command: Command | undefined) {
    if (!command) return;
    onClose();
    router.push(command.href);
  }

  function move(index: number) {
    scrollActiveRef.current = true;
    setActiveIndex(index);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (commands.length > 0) move((activeIndex + 1) % commands.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (commands.length > 0) move((activeIndex - 1 + commands.length) % commands.length);
        break;
      case "Home":
        event.preventDefault();
        if (commands.length > 0) move(0);
        break;
      case "End":
        event.preventDefault();
        if (commands.length > 0) move(commands.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        run(commands[activeIndex]);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        onClose();
        break;
      case "Tab":
        // Fokus ditahan di input; navigasi daftar memakai panah.
        event.preventDefault();
        inputRef.current?.focus();
        break;
      default:
        break;
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-3 pt-[10dvh] sm:p-4 sm:pt-[14dvh]">
          <motion.div
            className="absolute inset-0 bg-black/55"
            style={{ backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.14 } }}
            exit={{ opacity: 0, transition: { duration: 0.11 } }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Pencarian dan perintah cepat"
            className="glass-strong relative z-10 w-full max-w-xl overflow-hidden rounded-shell"
            style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,147,255,0.08)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={reduce ? { opacity: 1, transition: { duration: 0.1 } } : { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 420, damping: 34 } }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.11 } }}
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-2.5 border-b border-glass-border px-4">
              <SearchIcon size={18} strokeWidth={1.5} className="shrink-0 text-accent" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari key, halaman, atau aksi…"
                role="combobox"
                aria-expanded
                aria-controls="command-palette-list"
                aria-activedescendant={commands[activeIndex] ? `command-${commands[activeIndex].id}` : undefined}
                aria-label="Cari key, halaman, atau aksi"
                className="h-12 min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-muted"
              />
              <kbd className="shrink-0 rounded-md border border-glass-border bg-white/[0.04] px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted">
                ESC
              </kbd>
            </div>

            <div ref={listRef} id="command-palette-list" role="listbox" aria-label="Hasil perintah" className="scroll-area max-h-[46dvh] overflow-y-auto p-1.5">
              {commands.length === 0 ? (
                <p className="px-3 py-8 text-center text-body text-muted">
                  Tidak ada hasil untuk “{query.trim()}”.
                </p>
              ) : (
                commands.map((command, index) => {
                  const Icon = command.icon;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={command.id}
                      id={`command-${command.id}`}
                      data-index={index}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      tabIndex={-1}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => run(command)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-100",
                        isActive ? "bg-[rgba(139,147,255,0.13)] text-text" : "text-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          isActive ? "border-accent/25 bg-accent-soft text-accent" : "border-glass-border bg-white/[0.03] text-muted"
                        )}
                      >
                        <Icon size={16} strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body">{command.label}</span>
                      <span className="flex shrink-0 items-center gap-1 text-label text-muted">
                        {command.detail}
                        {isActive && <ArrowUpRightIcon size={13} strokeWidth={1.5} className="text-accent" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-glass-border px-4 py-2 text-[11px] text-muted">
              <span><span className="text-text">↑↓</span> navigasi</span>
              <span><span className="text-text">Enter</span> jalankan</span>
              <span><span className="text-text">Esc</span> tutup</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
