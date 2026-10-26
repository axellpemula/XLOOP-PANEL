import { cn } from "@/lib/utils/cn";

/**
 * Brand mark XLOOP.
 *
 * Bentuknya "X" yang dibangun dari dua loop cermin — dibaca sebagai huruf X,
 * tapi lengkungnya memberi isyarat "loop". Satu warna (currentColor),
 * tetap terbaca sampai 16px.
 */
const MARK_PATHS = (
  <>
    <path d="M5.8 6.2c0 3.1 6.2 3.1 6.2 6.2s-6.2 3.1-6.2 6.2" />
    <path d="M18.2 6.2c0 3.1-6.2 3.1-6.2 6.2s6.2 3.1 6.2 6.2" />
  </>
);

export interface XloopMarkProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  title?: string;
}

/** Mark saja (satu warna, ikut currentColor). */
export function XloopMark({ size = 20, className, strokeWidth = 2.1, title }: XloopMarkProps) {
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
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {MARK_PATHS}
    </svg>
  );
}

/**
 * Tile: mark di atas bidang aksen. Dipakai untuk favicon, avatar brand,
 * dan logo di sidebar. Warna bisa ditimpa lewat props.
 */
export function XloopTile({
  size = 32,
  className,
  radius = 9,
  background = "var(--accent)",
  foreground = "var(--accent-ink)",
}: {
  size?: number;
  className?: string;
  radius?: number;
  background?: string;
  foreground?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="XLOOP"
      focusable="false"
    >
      <rect width="32" height="32" rx={radius} fill={background} />
      <g
        transform="translate(4 4)"
        fill="none"
        stroke={foreground}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {MARK_PATHS}
      </g>
    </svg>
  );
}

/** Logo lengkap: tile + wordmark. */
export function XloopLogo({
  size = 28,
  wordmark = true,
  className,
  labelClassName,
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <XloopTile size={size} />
      {wordmark && (
        <span className={cn("text-body font-semibold tracking-wide text-text", labelClassName)}>XLOOP</span>
      )}
    </span>
  );
}
