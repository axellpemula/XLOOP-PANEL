import { cn } from "@/lib/utils/cn";

/**
 * Avatar inisial — 1 huruf pertama username di atas gradient deterministik.
 * Warna diturunkan dari hash username, jadi user yang sama selalu mendapat
 * warna yang sama di semua tempat (sidebar, topbar, tabel, ranking) tanpa
 * perlu menyimpan apa pun di database.
 */

const PALETTES: Array<[string, string]> = [
  ["#a5acff", "#7c86f5"], // periwinkle (aksen utama)
  ["#8fd0ae", "#5da37d"],
  ["#eec27f", "#cf9a44"],
  ["#efa6bd", "#c96b8d"],
  ["#8fd0ee", "#5799c9"],
  ["#c3b0ff", "#927fe8"],
];

function hexToRgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function Avatar({
  name,
  className,
  textClassName,
}: {
  name: string;
  className?: string;
  textClassName?: string;
}) {
  const [from, to] = PALETTES[hashName(name.trim().toLowerCase()) % PALETTES.length];
  // Array.from agar username berawalan emoji/karakter astral tidak terpotong
  // di tengah pasangan surrogate.
  const letter = (Array.from(name.trim())[0] || "?").toUpperCase();

  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full border text-label font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_14px_rgba(0,0,0,0.18)] backdrop-blur-sm",
        className
      )}
      style={{
        // Background sengaja transparan: warna avatar tetap terbaca dari
        // tint gradient + border + huruf pastelnya, bukan blok solid.
        backgroundImage: `linear-gradient(135deg, ${hexToRgba(from, 0.3)} 0%, ${hexToRgba(to, 0.14)} 100%)`,
        borderColor: hexToRgba(from, 0.35),
        color: from,
      }}
    >
      <span className={textClassName}>{letter}</span>
    </span>
  );
}
