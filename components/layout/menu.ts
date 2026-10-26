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

export type MenuSection = "Utama" | "Kelola" | "Laporan";

export interface MenuItem {
  href: string;
  label: string;
  icon: IconComponent;
  section: MenuSection;
  /** Kata kunci ekstra untuk pencarian di command palette. */
  keywords?: string;
  ownerOnly?: boolean;
}

export const MENU: Record<Role, MenuItem[]> = {
  owner: [
    { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, section: "Utama", keywords: "beranda ringkasan statistik" },
    { href: "/generate", label: "Generate Key", icon: PlusIcon, section: "Utama", keywords: "buat key baru generate lisensi" },
    { href: "/keys", label: "Key List", icon: KeyIcon, section: "Utama", keywords: "daftar key lisensi cari key" },
    { href: "/tools", label: "Tool Management", icon: ToolsIcon, section: "Kelola", keywords: "tool version versi public key secret" },
    { href: "/durations", label: "Duration Setting", icon: TimerIcon, section: "Kelola", keywords: "durasi preset harga credit masa aktif" },
    { href: "/resellers", label: "Reseller", icon: UsersIcon, section: "Kelola", keywords: "akun reseller topup credit pengguna" },
    { href: "/credits", label: "Credit Log", icon: ScrollTextIcon, section: "Laporan", keywords: "riwayat transaksi credit export csv" },
  ],
  reseller: [
    { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, section: "Utama", keywords: "beranda ringkasan statistik" },
    { href: "/generate", label: "Generate Key", icon: PlusIcon, section: "Utama", keywords: "buat key baru generate lisensi" },
    { href: "/keys", label: "Key List", icon: KeyIcon, section: "Utama", keywords: "daftar key lisensi cari key" },
    { href: "/credits", label: "Credit Log", icon: ScrollTextIcon, section: "Laporan", keywords: "riwayat transaksi credit saldo" },
  ],
};

export interface MenuGroup {
  section: MenuSection;
  items: MenuItem[];
}

/** Kelompokkan menu per section dengan urutan tetap Utama → Kelola → Laporan. */
export function menuGroups(role: Role): MenuGroup[] {
  const order: MenuSection[] = ["Utama", "Kelola", "Laporan"];
  return order
    .map((section) => ({ section, items: MENU[role].filter((item) => item.section === section) }))
    .filter((group) => group.items.length > 0);
}

export function pageTitle(pathname: string): string {
  const match = [...MENU.owner, ...MENU.reseller].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.label ?? "XLOOP PANEL";
}
