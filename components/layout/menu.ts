import {
  DashboardIcon,
  KeyIcon,
  PlusIcon,
  ScrollTextIcon,
  TimerIcon,
  ToolsIcon,
  UsersIcon,
  type IconComponent,
} from "@/components/icons";
import type { Role } from "@/lib/utils/types";

export interface MenuItem {
  href: string;
  label: string;
  icon: IconComponent;
  ownerOnly?: boolean;
}

export const MENU: Record<Role, MenuItem[]> = {
  owner: [
    { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
    { href: "/tools", label: "Tool Management", icon: ToolsIcon },
    { href: "/durations", label: "Duration Setting", icon: TimerIcon },
    { href: "/keys", label: "Key List", icon: KeyIcon },
    { href: "/generate", label: "Generate Key", icon: PlusIcon },
    { href: "/resellers", label: "Reseller", icon: UsersIcon },
    { href: "/credits", label: "Credit Log", icon: ScrollTextIcon },
  ],
  reseller: [
    { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
    { href: "/keys", label: "Key List", icon: KeyIcon },
    { href: "/generate", label: "Generate Key", icon: PlusIcon },
    { href: "/credits", label: "Credit Log", icon: ScrollTextIcon },
  ],
};

export function pageTitle(pathname: string): string {
  const match = [...MENU.owner, ...MENU.reseller].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.label ?? "XLOOP PANEL";
}
