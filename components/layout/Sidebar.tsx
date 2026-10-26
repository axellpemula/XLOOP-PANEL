"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { SidebarCollapseIcon, SidebarExpandIcon } from "@/components/icons";
import { menuGroups } from "./menu";
import { RoleBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { XloopTile } from "@/components/icons/brand";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import type { SessionUser } from "@/lib/utils/types";

interface SidebarProps {
  user: SessionUser;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  variant?: "desktop" | "drawer";
}

export function SidebarContent({ user, collapsed, onToggle, onNavigate, variant = "desktop" }: SidebarProps) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const groups = menuGroups(user.role);

  return (
    <div className="flex h-full flex-col">
      {/* Logo + toggle */}
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-glass-border px-3",
          collapsed && "justify-center px-0"
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn("flex min-w-0 items-center gap-2 rounded-lg px-1", collapsed && "justify-center")}
        >
          <XloopTile size={26} className="shrink-0 drop-shadow-[0_4px_14px_rgba(139,147,255,0.45)]" />
          {!collapsed && <span className="truncate text-body font-semibold tracking-wide text-text">XLOOP</span>}
        </Link>
        {!collapsed && variant === "desktop" && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Kecilkan sidebar"
            title="Kecilkan sidebar"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/5 hover:text-text"
          >
            <SidebarCollapseIcon size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {collapsed && variant === "desktop" && (
        <div className="px-2 pt-2">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Besarkan sidebar"
            title="Besarkan sidebar"
            className="flex h-8 w-full items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-white/5 hover:text-text"
          >
            <SidebarExpandIcon size={16} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Menu berkelompok: Utama / Kelola / Laporan */}
      <nav className="flex-1 overflow-y-auto scroll-area px-2 py-3" aria-label="Menu panel">
        {groups.map((group, groupIndex) => (
          <div key={group.section} className={groupIndex > 0 ? "mt-4" : undefined}>
            {!collapsed ? (
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted/60">
                {group.section}
              </p>
            ) : (
              groupIndex > 0 && <div className="mx-3 mb-2 h-px bg-glass-border" aria-hidden />
            )}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                const content = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex h-10 min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-body transition-colors duration-150",
                      collapsed && "justify-center px-0",
                      isActive ? "font-medium text-text" : "text-muted hover:bg-white/[0.04] hover:text-text"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={variant === "drawer" ? "sidebar-pill-drawer" : "sidebar-pill"}
                        className="absolute inset-0 -z-10 rounded-lg bg-[linear-gradient(90deg,rgba(139,147,255,0.17),rgba(139,147,255,0.07))] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-inset ring-accent/20"
                        transition={
                          reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }
                        }
                      />
                    )}
                    {isActive && (
                      <motion.span
                        layoutId={variant === "drawer" ? "sidebar-bar-drawer" : "sidebar-bar"}
                        style={{ y: "-50%" }}
                        className="absolute left-0 top-1/2 h-5 w-[3px] rounded-full bg-accent shadow-[0_0_10px_rgba(139,147,255,0.65)]"
                        transition={
                          reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }
                        }
                      />
                    )}
                    <Icon
                      size={18}
                      strokeWidth={1.5}
                      className={cn(
                        "shrink-0 transition-transform duration-150 group-hover:translate-x-0.5",
                        isActive && "text-accent"
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {isActive && !collapsed && (
                      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    )}
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {collapsed ? <Tooltip label={item.label}>{content}</Tooltip> : content}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Kartu user */}
      <div className="mt-auto border-t border-glass-border p-2">
        {collapsed ? (
          <Tooltip label={user.username}>
            <Link
              href={user.role === "reseller" ? "/credits" : "/resellers"}
              onClick={onNavigate}
              className="mx-auto block w-fit rounded-lg"
              aria-label={`Profil ${user.username}`}
            >
              <Avatar name={user.username} />
            </Link>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
            <Avatar name={user.username} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body text-text">{user.username}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <RoleBadge role={user.role} />
              </div>
              {user.role === "reseller" && (
                <p className="mt-1 text-label text-muted tabular">
                  Credit: <span className="text-text">{formatNumber(user.credit)}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
