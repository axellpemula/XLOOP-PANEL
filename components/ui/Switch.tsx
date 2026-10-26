"use client";

import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /** Nama aksesibel saat tidak ada label terlihat (mis. label ditulis terpisah di layout). */
  ariaLabel?: string;
  disabled?: boolean;
  id?: string;
}

/**
 * Toggle kecil untuk status aktif/nonaktif.
 *
 * Satu elemen interaktif saja (<button role="switch">) yang memuat track +
 * teks label. Versi sebelumnya membungkus button di dalam <label htmlFor>
 * yang menunjuk ke button itu sendiri — struktur label-di-sekitar-kontrol
 * membuat perilaku klik bergantung pada aktivasi label bawaan browser
 * (klik pada teks/knob bisa diteruskan sebagai klik tambahan ke kontrol),
 * jadi satu klik tidak dijamin menghasilkan tepat satu onChange.
 * Knob juga sekarang dipatok dengan left-0 (sebelumnya tanpa left/right,
 * posisinya tergantung static-position sehingga bisa bergeser keluar track).
 */
export function Switch({ checked, onChange, label, ariaLabel, disabled, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      // ariaLabel eksplisit selalu menang; tanpa itu nama aksesibel diambil
      // dari teks label yang terlihat.
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150",
          checked ? "border-accent/50 bg-accent/30" : "border-glass-border bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full transition-transform duration-150 ease-out",
            checked ? "translate-x-[18px] bg-accent" : "translate-x-0.5 bg-muted"
          )}
        />
      </span>
      {label && <span className="min-w-14 text-left text-label text-muted">{label}</span>}
    </button>
  );
}
