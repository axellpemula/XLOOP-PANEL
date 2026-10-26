"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarContent } from "./Sidebar";
import { MobileDrawer } from "./MobileDrawer";
import { MobileBottomNav } from "./MobileBottomNav";
import { CommandPalette } from "./CommandPalette";
import { Topbar } from "./Topbar";
import { PageTransition } from "./PageTransition";
import { ScrollRootContext } from "@/components/ui/ScrollRoot";
import { ToastProvider } from "@/components/ui/Toast";
import { pageTitle } from "./menu";
import { cn } from "@/lib/utils/cn";
import type { SessionUser } from "@/lib/utils/types";

const STORAGE_KEY = "xloop:sidebar-collapsed";

/** Floating glass shell: sidebar + topbar melayang, konten scroll sendiri. */
export function DashboardShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  // Preferensi collapse eksplisit dari user; null = ikut default breakpoint
  // (tablet kecilkan otomatis). Sebelumnya tablet memaksa collapsed sehingga
  // tombol expand di lebar 768–1023px terlihat mati saat diklik.
  const [collapsedPref, setCollapsedPref] = useState<boolean | null>(null);
  const [tablet, setTablet] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) setCollapsedPref(saved === "1");
    } catch {
      // localStorage tidak tersedia (mode private) — pakai default breakpoint.
    }

    const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const applyTablet = () => setTablet(tabletQuery.matches);
    applyTablet();
    tabletQuery.addEventListener("change", applyTablet);
    return () => tabletQuery.removeEventListener("change", applyTablet);
  }, []);

  const isCollapsed = collapsedPref ?? tablet;

  const toggle = useCallback(() => {
    setCollapsedPref((prev) => {
      const next = !(prev ?? tablet);
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // localStorage tidak tersedia (mode private) — abaikan.
      }
      return next;
    });
  }, [tablet]);

  // Area konten adalah container scroll sendiri (bukan window), jadi
  // scroll-restoration bawaan Next tidak menyentuhnya: tanpa ini halaman
  // baru terbuka di posisi scroll halaman sebelumnya.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  function openSearch() {
    // Jangan menumpuk palette di atas modal/drawer yang sedang terbuka —
    // dua dialog modal sekaligus membingungkan fokus & tombol Esc.
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    setPaletteOpen(true);
  }

  // Ctrl/Cmd+K membuka command palette dari mana saja di panel.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (paletteOpen) setPaletteOpen(false);
        else openSearch();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // openSearch hanya membaca DOM + setState, aman tanpa masuk deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paletteOpen]);

  const title = useMemo(() => pageTitle(pathname), [pathname]);

  return (
    <ToastProvider>
      <ScrollRootContext.Provider value={scrollRef}>
        <div className="flex h-[100dvh] gap-4 overflow-hidden md:p-4">
          {/* Sidebar floating (desktop & tablet) */}
          <aside
            className={cn(
              "glass sticky top-4 hidden h-[calc(100dvh-32px)] shrink-0 rounded-shell md:block",
              isCollapsed ? "w-[72px]" : "w-[248px]"
            )}
            aria-label="Menu utama"
          >
            <SidebarContent user={user} collapsed={isCollapsed} onToggle={toggle} />
          </aside>

          <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} user={user} />
          <MobileBottomNav role={user.role} onOpenMenu={() => setDrawerOpen(true)} />
          <CommandPalette open={paletteOpen} role={user.role} onClose={() => setPaletteOpen(false)} />

          {/* Area utama: scroll sendiri, bukan body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-area md:pt-0">
            <div className="mx-auto w-full max-w-[1280px] pb-28 md:pb-8">
              <Topbar user={user} title={title} onOpenMenu={() => setDrawerOpen(true)} onOpenSearch={openSearch} scrollRef={scrollRef} />
              <div className="px-3 pt-4 md:px-1">
                <PageTransition>{children}</PageTransition>
              </div>
            </div>
          </div>
        </div>
      </ScrollRootContext.Provider>
    </ToastProvider>
  );
}
