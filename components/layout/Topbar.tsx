"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDownIcon, LogoutIcon, MenuIcon, PlusIcon, ScrollTextIcon, SearchIcon, SpinnerIcon, UsersIcon, WalletIcon } from "@/components/icons";
import { RoleBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import type { SessionUser } from "@/lib/utils/types";

interface TopbarProps {
  user: SessionUser;
  title: string;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  scrollRef: React.RefObject<HTMLElement>;
}

export function Topbar({ user, title, onOpenMenu, onOpenSearch, scrollRef }: TopbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const router = useRouter();

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => setScrolled(node.scrollTop > 8);
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  // Dropdown profil: tutup saat klik luar / Esc, fokus kembali ke tombolnya.
  useEffect(() => {
    if (!profileOpen) return;

    const frame = window.requestAnimationFrame(() => {
      profileRef.current?.querySelector<HTMLElement>("[data-profile-item]")?.focus();
    });

    function onPointerDown(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    function onFocusIn(event: FocusEvent) {
      // Tab keluar dari menu harus menutupnya — sebelumnya menu tetap
      // menggantung terbuka sementara fokus sudah pindah ke halaman.
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [profileOpen]);

  function onProfileKeyDown(event: React.KeyboardEvent) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(profileRef.current?.querySelectorAll<HTMLElement>("[data-profile-item]") ?? []);
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Bersihkan juga session di browser, lalu kembali ke login.
      await createClient().auth.signOut().catch(() => {});
      router.replace("/login");
      router.refresh();
    }
  }

  const profileItemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-body text-muted transition-colors duration-150 hover:bg-white/[0.05] hover:text-text focus:bg-white/[0.05] focus:text-text focus:outline-none";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[52px] items-center gap-2 rounded-none border-x-0 px-3 transition-[background-color,border-color,box-shadow] duration-200 md:h-14 md:rounded-card md:border-x",
        scrolled
          ? "glass-strong border-glass-border shadow-[0_12px_36px_rgba(0,0,0,0.38)]"
          : "glass border-transparent"
      )}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Buka menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/5 hover:text-text md:hidden"
      >
        <MenuIcon size={18} strokeWidth={1.5} />
      </button>

      {/* Breadcrumb ringkas: brand kecil di atas, judul halaman sebagai fokus. */}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70 sm:block">
          XLOOP Panel
        </p>
        <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-text">{title}</p>
      </div>

      {/* Pemicu command palette */}
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Cari key atau buka halaman (Ctrl+K)"
        className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-glass-border bg-white/[0.03] px-2.5 text-muted transition-colors duration-150 hover:border-white/15 hover:bg-white/[0.05] hover:text-text sm:w-52 lg:w-72"
      >
        <SearchIcon size={15} strokeWidth={1.5} className="shrink-0" />
        <span className="hidden flex-1 truncate text-left text-label sm:block">Cari key, halaman…</span>
        <span className="hidden shrink-0 items-center gap-0.5 lg:flex" aria-hidden>
          <kbd className="rounded-md border border-glass-border bg-white/[0.04] px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted">
            Ctrl
          </kbd>
          <kbd className="rounded-md border border-glass-border bg-white/[0.04] px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted">
            K
          </kbd>
        </span>
      </button>

      {user.role === "reseller" && (
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-label text-muted xl:inline-flex">
          <WalletIcon size={14} strokeWidth={1.5} className="text-accent" />
          <span className="tabular font-medium text-text">{formatNumber(user.credit)}</span> credit
        </span>
      )}

      {/* Profil + menu akun */}
      <div ref={profileRef} className="relative shrink-0">
        <button
          ref={profileButtonRef}
          type="button"
          onClick={() => setProfileOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          aria-label={`Menu akun ${user.username}`}
          className="flex items-center gap-2 rounded-xl p-1 pr-1.5 transition-colors duration-150 hover:bg-white/[0.05]"
        >
          <Avatar name={user.username} className="h-8 w-8" />
          <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
            <span className="max-w-[120px] truncate text-label font-medium text-text">{user.username}</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted">
              {user.role === "owner" ? "Owner" : "Reseller"}
            </span>
          </span>
          <ChevronDownIcon
            size={15}
            strokeWidth={1.5}
            className={cn("hidden shrink-0 text-muted transition-transform duration-150 sm:block", profileOpen && "rotate-180")}
          />
        </button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              role="menu"
              aria-label="Menu akun"
              onKeyDown={onProfileKeyDown}
              className="glass-strong absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-card p-1.5"
              style={{ transformOrigin: "top right", boxShadow: "0 16px 44px rgba(0,0,0,0.42)" }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14 }}
            >
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-2.5 py-2.5">
                <Avatar name={user.username} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-text">{user.username}</p>
                  <p className="truncate text-label text-muted">{user.email}</p>
                  <div className="mt-1">
                    <RoleBadge role={user.role} />
                  </div>
                </div>
              </div>

              {user.role === "reseller" && (
                <div className="mt-1.5 flex items-center justify-between rounded-lg border border-accent/15 bg-accent-soft px-2.5 py-2">
                  <span className="flex items-center gap-1.5 text-label text-muted">
                    <WalletIcon size={14} strokeWidth={1.5} className="text-accent" />
                    Sisa credit
                  </span>
                  <span className="text-body font-semibold text-text tabular">{formatNumber(user.credit)}</span>
                </div>
              )}

              <div className="mt-1.5 flex flex-col">
                <Link href="/generate" role="menuitem" data-profile-item className={profileItemClass} onClick={() => setProfileOpen(false)}>
                  <PlusIcon size={16} strokeWidth={1.5} />
                  Generate Key
                </Link>
                {user.role === "owner" ? (
                  <Link href="/resellers" role="menuitem" data-profile-item className={profileItemClass} onClick={() => setProfileOpen(false)}>
                    <UsersIcon size={16} strokeWidth={1.5} />
                    Kelola Reseller
                  </Link>
                ) : (
                  <Link href="/credits" role="menuitem" data-profile-item className={profileItemClass} onClick={() => setProfileOpen(false)}>
                    <ScrollTextIcon size={16} strokeWidth={1.5} />
                    Riwayat Credit
                  </Link>
                )}
              </div>

              <div className="my-1.5 h-px bg-glass-border" aria-hidden />

              <button
                type="button"
                role="menuitem"
                data-profile-item
                onClick={logout}
                disabled={loggingOut}
                className={cn(profileItemClass, "text-banned hover:bg-banned-soft hover:text-banned focus:bg-banned-soft focus:text-banned disabled:opacity-60")}
              >
                {loggingOut ? <SpinnerIcon size={16} strokeWidth={1.5} /> : <LogoutIcon size={16} strokeWidth={1.5} />}
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
