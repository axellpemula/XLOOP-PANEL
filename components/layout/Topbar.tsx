"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutIcon, MenuIcon } from "@/components/icons";
import { RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import type { SessionUser } from "@/lib/utils/types";

interface TopbarProps {
  user: SessionUser;
  title: string;
  onOpenMenu: () => void;
  scrollRef: React.RefObject<HTMLElement>;
}

export function Topbar({ user, title, onOpenMenu, scrollRef }: TopbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => setScrolled(node.scrollTop > 8);
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

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

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[52px] items-center gap-2 rounded-none border-x-0 px-3 md:h-14 md:rounded-card md:border-x transition-[background-color,border-color,box-shadow] duration-200",
        scrolled
          ? "glass-strong border-glass-border shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
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

      <h2 className="min-w-0 flex-1 truncate text-[15px] font-medium text-text">{title}</h2>

      <div className="flex shrink-0 items-center gap-2">
        {user.role === "reseller" && (
          <span className="hidden items-center gap-1 rounded-full border border-glass-border px-2 py-0.5 text-label text-muted sm:inline-flex">
            Credit: <span className="tabular text-text">{formatNumber(user.credit)}</span>
          </span>
        )}
        <span className="max-w-[80px] truncate text-label text-text sm:max-w-none sm:text-body">{user.username}</span>
        <RoleBadge role={user.role} className="hidden sm:inline-flex" />
        <Button
          size="sm"
          onClick={logout}
          loading={loggingOut}
          aria-label="Logout"
          icon={<LogoutIcon size={16} strokeWidth={1.5} />}
          className="px-2 sm:px-3"
        >
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
