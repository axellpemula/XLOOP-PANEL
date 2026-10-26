"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarContent } from "./Sidebar";
import { MobileDrawer } from "./MobileDrawer";
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
  const [collapsed, setCollapsed] = useState(false);
  const [tablet, setTablet] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setCollapsed(false);
    }

    const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const applyTablet = () => setTablet(tabletQuery.matches);
    applyTablet();
    tabletQuery.addEventListener("change", applyTablet);
    return () => tabletQuery.removeEventListener("change", applyTablet);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // localStorage tidak tersedia (mode private) — abaikan.
      }
      return next;
    });
  }, []);

  const isCollapsed = collapsed || tablet;
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

          {/* Area utama: scroll sendiri, bukan body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-area md:pt-0">
            <div className="mx-auto w-full max-w-[1280px] pb-8">
              <Topbar user={user} title={title} onOpenMenu={() => setDrawerOpen(true)} scrollRef={scrollRef} />
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
