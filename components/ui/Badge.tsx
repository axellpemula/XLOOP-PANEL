import { cn } from "@/lib/utils/cn";
import { STATUS_DOT, STATUS_TEXT } from "@/lib/utils/status";
import { STATUS_LABEL } from "@/lib/utils/constants";
import type { KeyStatus, Role } from "@/lib/utils/types";

export function StatusBadge({ status, className }: { status: KeyStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-label", STATUS_TEXT[status], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-glass-border px-2 py-0.5 text-label",
        role === "owner" ? "text-accent" : "text-muted",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", role === "owner" ? "bg-accent" : "bg-muted")} aria-hidden />
      {role === "owner" ? "Owner" : "Reseller"}
    </span>
  );
}

export function SimpleBadge({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent" | "active" | "banned" | "expired";
  className?: string;
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "active"
        ? "text-active"
        : tone === "banned"
          ? "text-banned"
          : tone === "expired"
            ? "text-expired"
            : "text-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-glass-border px-2 py-0.5 text-label",
        toneClass,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
