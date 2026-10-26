"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, KeyIcon, MenuIcon, PlusIcon, ScrollTextIcon, UsersIcon, type IconComponent } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/lib/utils/types";

interface BottomItem {
  href: string;
  label: string;
  icon: IconComponent;
}

/**
 * Navigasi bawah khusus mobile: aksi paling sering dipakai selalu sejauh
 * satu jempol, dengan Generate sebagai tombol tengah yang menonjol.
 * Menu lengkap tetap tersedia lewat tombol "Menu" (drawer).
 */
export function MobileBottomNav({ role, onOpenMenu }: { role: Role; onOpenMenu: () => void }) {
  const pathname = usePathname();

  const left: BottomItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
    { href: "/keys", label: "Key", icon: KeyIcon },
  ];
  const right: BottomItem[] =
    role === "owner"
      ? [{ href: "/resellers", label: "Reseller", icon: UsersIcon }]
      : [{ href: "/credits", label: "Credit", icon: ScrollTextIcon }];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const itemClass = (active: boolean) =>
    cn(
      "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-colors duration-150",
      active ? "text-accent" : "text-muted hover:text-text"
    );

  return (
    <nav
      aria-label="Navigasi cepat"
      className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-stretch gap-1 rounded-shell p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-[0_16px_44px_rgba(0,0,0,0.45)] md:hidden"
    >
      {left.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
            <Icon size={20} strokeWidth={1.5} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}

      {/* Aksi utama: tile aksen terangkat di tengah */}
      <Link
        href="/generate"
        aria-current={isActive("/generate") ? "page" : undefined}
        aria-label="Generate Key"
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold text-accent"
      >
        <span
          className={cn(
            "primary-surface -mt-6 flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--accent-ink)] ring-4 ring-[rgba(20,19,17,0.65)] transition-transform duration-150 active:scale-95",
            isActive("/generate") && "scale-105"
          )}
        >
          <PlusIcon size={22} strokeWidth={1.7} />
        </span>
        <span>Generate</span>
      </Link>

      {right.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
            <Icon size={20} strokeWidth={1.5} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}

      <button type="button" onClick={onOpenMenu} aria-label="Buka semua menu" className={itemClass(false)}>
        <MenuIcon size={20} strokeWidth={1.5} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
