import type { SVGProps } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Icon set custom XLOOP PANEL.
 *
 * Aturan desain (biar konsisten dengan brand mark):
 * - Kanvas 24×24, area gambar 3–21 (padding 3).
 * - Stroke 1.5, linecap/linejoin round, tanpa fill (kecuali titik kecil).
 * - Geometris, sedikit membulat (rx 2.4–2.6), tanpa detail berlebih
 *   supaya tetap terbaca di 16px.
 */

export interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
}

export type IconComponent = (props: IconProps) => JSX.Element;

function Icon({
  size = 16,
  strokeWidth = 1.5,
  className,
  title,
  children,
  ...rest
}: IconProps & { children: React.ReactNode } & Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------
   Navigasi
   --------------------------------------------------------------- */

/** Dashboard — susunan bento (1 lebar + 2 kecil). */
export const DashboardIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3.4" y="3.4" width="17.2" height="7" rx="2.4" />
    <rect x="3.4" y="13.6" width="7.6" height="7" rx="2.4" />
    <rect x="14" y="13.6" width="6.6" height="7" rx="2.4" />
  </Icon>
);

/** Tool Management — kotak 3D (katalog tool). */
export const ToolsIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 3.4 20.2 7.8v8.4L12 20.6 3.8 16.2V7.8L12 3.4Z" />
    <path d="M3.9 7.9 12 12.2l8.1-4.3" />
    <path d="M12 12.2v8.4" />
  </Icon>
);

/** Duration Setting — stopwatch. */
export const TimerIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="13.6" r="7.4" />
    <path d="M12 9.9v3.9l2.5 1.5" />
    <path d="M9.6 2.6h4.8" />
    <path d="M12 2.6v2.4" />
  </Icon>
);

/** Key List — key dengan gerigi. */
export const KeyIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="8.3" cy="12" r="4.2" />
    <path d="M12.5 12h7.9" />
    <path d="M17.1 12v3.6" />
    <path d="M14.3 12v2.6" />
  </Icon>
);

/** Generate Key — plus di dalam kotak (aksi membuat). */
export const PlusIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.4" />
    <path d="M12 8.2v7.6" />
    <path d="M8.2 12h7.6" />
  </Icon>
);

/** Reseller — dua orang. */
export const UsersIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="9.2" cy="8.6" r="3.3" />
    <path d="M2.9 19.4c0-3.1 2.8-5.1 6.3-5.1s6.3 2 6.3 5.1" />
    <circle cx="17.6" cy="9.9" r="2.4" />
    <path d="M15.9 14.8c3 .3 5.2 2 5.2 4.6" />
  </Icon>
);

/** Credit Log — dokumen berbaris. */
export const ScrollTextIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="5" y="3.4" width="14" height="17.2" rx="2.8" />
    <path d="M8.4 8.6h7.2" />
    <path d="M8.4 12h7.2" />
    <path d="M8.4 15.4h4.4" />
  </Icon>
);

/* ---------------------------------------------------------------
   Shell / navigasi kecil
   --------------------------------------------------------------- */

export const MenuIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4.6 7.6h14.8" />
    <path d="M4.6 12h14.8" />
    <path d="M4.6 16.4h9.4" />
  </Icon>
);

export const CloseIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M6.6 6.6 17.4 17.4" />
    <path d="M17.4 6.6 6.6 17.4" />
  </Icon>
);

export const LogoutIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M13.6 4.8H6.4a1.8 1.8 0 0 0-1.8 1.8v10.8a1.8 1.8 0 0 0 1.8 1.8h7.2" />
    <path d="M18.6 12h-8.4" />
    <path d="M15.2 8.6 18.6 12l-3.4 3.4" />
  </Icon>
);

export const SidebarCollapseIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3.4" y="4.4" width="17.2" height="15.2" rx="2.8" />
    <path d="M9.6 4.4v15.2" />
    <path d="M16.6 9.6 13.8 12l2.8 2.4" />
  </Icon>
);

export const SidebarExpandIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3.4" y="4.4" width="17.2" height="15.2" rx="2.8" />
    <path d="M9.6 4.4v15.2" />
    <path d="M13.8 9.6 16.6 12l-2.8 2.4" />
  </Icon>
);

export const ArrowRightIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4.6 12h14" />
    <path d="M13.4 6.8 18.6 12l-5.2 5.2" />
  </Icon>
);

/* ---------------------------------------------------------------
   Aksi data
   --------------------------------------------------------------- */

export const CopyIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="8.6" y="8.6" width="11" height="11" rx="2.6" />
    <path d="M15.4 5.2H6.6A1.6 1.6 0 0 0 5 6.8v8.8" />
  </Icon>
);

export const CheckIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M5.4 12.6 9.8 17 18.6 7.4" />
  </Icon>
);

export const CheckCircleIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M8.4 12.2 11.2 15l4.6-5.6" />
  </Icon>
);

export const AlertIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.8v4.9" />
    <circle cx="12" cy="16" r="0.95" fill="currentColor" stroke="none" />
  </Icon>
);

export const InfoIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 11.2v5" />
    <circle cx="12" cy="7.9" r="0.95" fill="currentColor" stroke="none" />
  </Icon>
);

export const SearchIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="10.8" cy="10.8" r="6.4" />
    <path d="M15.6 15.6 20.4 20.4" />
  </Icon>
);

export const PencilIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4.8 19.2l.9-3.7L15.4 5.8a2.1 2.1 0 0 1 3 3L8.5 18.3l-3.7.9Z" />
    <path d="M14.2 7.1 16.9 9.8" />
  </Icon>
);

export const TrashIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M4.6 7.2h14.8" />
    <path d="M9.7 4.6h4.6" />
    <path d="M6.8 7.2l.8 11.1a1.6 1.6 0 0 0 1.6 1.5h5.6a1.6 1.6 0 0 0 1.6-1.5l.8-11.1" />
    <path d="M10.4 11v5.2" />
    <path d="M13.6 11v5.2" />
  </Icon>
);

export const BanIcon: IconComponent = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="7.6" />
    <path d="M6.7 17.3 17.3 6.7" />
  </Icon>
);

export const ResetIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M19.4 12.6a7.6 7.6 0 1 1-2.5-6.2" />
    <path d="M16.8 2.8v4h-4" />
  </Icon>
);

export const RefreshIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M20.2 11.6a8 8 0 0 0-13.6-5l-2 2" />
    <path d="M3.8 12.4a8 8 0 0 0 13.6 5l2-2" />
    <path d="M4.4 3.9v4.7h4.7" />
    <path d="M19.6 20.1v-4.7h-4.7" />
  </Icon>
);

export const DownloadIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M12 3.6v11" />
    <path d="M7.7 10.4 12 14.7l4.3-4.3" />
    <path d="M4.6 16.8v1.2a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-1.2" />
  </Icon>
);

export const EyeIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M2.9 12S6.5 6.3 12 6.3 21.1 12 21.1 12 17.5 17.7 12 17.7 2.9 12 2.9 12Z" />
    <circle cx="12" cy="12" r="2.7" />
  </Icon>
);

export const LockIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="5.4" y="10.4" width="13.2" height="9.2" rx="2.6" />
    <path d="M8.7 10.4V8.1a3.3 3.3 0 0 1 6.6 0v2.3" />
  </Icon>
);

export const WalletIcon: IconComponent = (props) => (
  <Icon {...props}>
    <rect x="3.4" y="6.2" width="17.2" height="12.6" rx="3.2" />
    <path d="M14.6 12.5h6" />
    <circle cx="17.2" cy="12.5" r="0.95" fill="currentColor" stroke="none" />
  </Icon>
);

/* ---------------------------------------------------------------
   Feedback
   --------------------------------------------------------------- */

export const SpinnerIcon: IconComponent = ({ className, ...props }) => (
  <Icon {...props} className={cn("animate-spin", className)}>
    <path d="M12 3.4a8.6 8.6 0 1 0 8.6 8.6" />
  </Icon>
);

export const ChevronDownIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M7 10 12 15l5-5" />
  </Icon>
);

export const ChevronLeftIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M14.4 6.6 9 12l5.4 5.4" />
  </Icon>
);

export const ChevronRightIcon: IconComponent = (props) => (
  <Icon {...props}>
    <path d="M9.6 6.6 15 12l-5.4 5.4" />
  </Icon>
);
