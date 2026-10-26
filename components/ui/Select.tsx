"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
  invalid?: boolean;
}

interface MenuPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
  placement: "down" | "up";
}

const MENU_MAX_HEIGHT = 256;
const VIEWPORT_MARGIN = 8;

/**
 * Select custom (bukan <select> bawaan): panel glass-strong, navigasi
 * keyboard panah / Home / End / Enter / Spasi / Esc + typeahead.
 *
 * Panel dirender lewat portal dengan posisi fixed mengikuti tombol:
 * - tidak terpotong ancestor overflow-hidden / area scroll modal;
 * - membalik ke atas kalau ruang di bawah tidak cukup;
 * - mengikuti tombol saat halaman / container di-scroll atau di-resize.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Pilih",
  disabled,
  className,
  id,
  ariaLabel,
  invalid,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollActiveRef = useRef(false);
  const typeaheadRef = useRef({ text: "", time: 0 });
  const reduce = useReducedMotion();
  const fallbackId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const baseId = id ?? `select-${fallbackId}`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  /* ---------- helper indeks (selalu lewati opsi disabled) ---------- */

  function firstEnabled(): number {
    return options.findIndex((o) => !o.disabled);
  }

  function lastEnabled(): number {
    for (let i = options.length - 1; i >= 0; i -= 1) {
      if (!options[i].disabled) return i;
    }
    return -1;
  }

  function stepEnabled(from: number, delta: 1 | -1): number {
    if (options.length === 0) return -1;
    let next = from;
    for (let i = 0; i < options.length; i += 1) {
      next = (next + delta + options.length) % options.length;
      if (!options[next].disabled) return next;
    }
    return -1; // semua disabled
  }

  /* ---------- posisi panel ---------- */

  function computePosition(): MenuPosition | null {
    const button = buttonRef.current;
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - gap - VIEWPORT_MARGIN;
    const placement: MenuPosition["placement"] = spaceBelow < 160 && spaceAbove > spaceBelow ? "up" : "down";
    const available = placement === "up" ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(80, Math.min(MENU_MAX_HEIGHT, available));
    const width = Math.min(rect.width, window.innerWidth - VIEWPORT_MARGIN * 2);
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN);

    return placement === "up"
      ? { left, width, bottom: window.innerHeight - rect.top + gap, maxHeight, placement }
      : { left, width, top: rect.bottom + gap, maxHeight, placement };
  }

  function openList(initialIndex?: number) {
    if (disabled) return;
    const selectedIndex = options.findIndex((o) => o.value === value && !o.disabled);
    setActiveIndex(initialIndex ?? (selectedIndex >= 0 ? selectedIndex : firstEnabled()));
    setPosition(computePosition());
    scrollActiveRef.current = true;
    setOpen(true);
  }

  function closeList(refocus = false) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }

  /* ---------- efek saat panel terbuka ---------- */

  // Tutup saat klik di luar / window blur, dan ikuti posisi tombol saat
  // scroll (termasuk container scroll di dalam halaman) atau resize.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }

    let frame = 0;
    function reposition(event?: Event) {
      // Scroll di dalam panel opsi sendiri tidak perlu reposisi.
      if (event?.target instanceof Node && listRef.current?.contains(event.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPosition(computePosition()));
    }

    function onWindowBlur() {
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("blur", onWindowBlur);
    };
    // computePosition hanya membaca ref DOM — aman tanpa dependensi lain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Komponen dinonaktifkan selagi panel terbuka → tutup panel.
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  // Opsi berubah selagi terbuka → jaga activeIndex tetap valid & enabled,
  // tanpa mereset highlight ke opsi terpilih setiap parent me-render ulang.
  useEffect(() => {
    if (!open) return;
    setActiveIndex((prev) => {
      if (options.length === 0) return -1;
      if (prev >= 0 && prev < options.length && !options[prev].disabled) return prev;
      return options.findIndex((o) => !o.disabled);
    });
  }, [open, options]);

  // Gulir opsi aktif ke dalam pandangan HANYA untuk navigasi keyboard
  // (sebelumnya hover mouse ikut memicu scrollIntoView yang membuat
  // halaman/modal ikut meloncat). Panel digulir manual, bukan halaman.
  useEffect(() => {
    if (!open || activeIndex < 0 || !scrollActiveRef.current) return;
    scrollActiveRef.current = false;
    const list = listRef.current;
    const node = list?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!list || !node) return;
    if (node.offsetTop < list.scrollTop) {
      list.scrollTop = node.offsetTop - 4;
    } else if (node.offsetTop + node.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = node.offsetTop + node.offsetHeight - list.clientHeight + 4;
    }
  }, [open, activeIndex, position]);

  /* ---------- aksi ---------- */

  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeList(true);
  }

  function moveActive(index: number) {
    scrollActiveRef.current = true;
    setActiveIndex(index);
  }

  function runTypeahead(char: string) {
    const now = Date.now();
    const buffer = now - typeaheadRef.current.time > 600 ? char : typeaheadRef.current.text + char;
    typeaheadRef.current = { text: buffer, time: now };

    // Ketikan huruf yang sama berulang ("aaa") → putar opsi berawalan huruf itu.
    const query = buffer.split("").every((c) => c === buffer[0]) ? buffer[0] : buffer;
    const start = query === buffer && buffer.length > 1 ? activeIndex : activeIndex + 1;
    for (let i = 0; i < options.length; i += 1) {
      const index = (((start + i) % options.length) + options.length) % options.length;
      const option = options[index];
      if (!option.disabled && option.label.toLowerCase().startsWith(query.toLowerCase())) {
        moveActive(index);
        return;
      }
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openList();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const selectedIndex = options.findIndex((o) => o.value === value && !o.disabled);
        openList(selectedIndex >= 0 ? selectedIndex : lastEnabled());
      } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        openList();
        runTypeahead(event.key);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveActive(stepEnabled(activeIndex, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActive(stepEnabled(activeIndex, -1));
        break;
      case "Home":
        event.preventDefault();
        moveActive(firstEnabled());
        break;
      case "End":
        event.preventDefault();
        moveActive(lastEnabled());
        break;
      case "Enter":
      case " ":
        // Spasi juga memilih opsi aktif (sebelumnya hanya menutup panel
        // lewat klik bawaan button tanpa memilih apa pun).
        event.preventDefault();
        event.stopPropagation();
        commit(activeIndex);
        break;
      case "Escape":
        // stopPropagation: Esc cukup menutup dropdown, jangan ikut
        // menutup Modal yang menaungi Select ini.
        event.preventDefault();
        event.stopPropagation();
        closeList(true);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          runTypeahead(event.key);
        }
        break;
    }
  }

  const menu =
    open && position ? (
      <motion.div
        ref={listRef}
        role="listbox"
        id={listId}
        aria-label={ariaLabel}
        tabIndex={-1}
        className="glass-strong scroll-area fixed z-[70] overflow-y-auto rounded-card p-1"
        style={{
          left: position.left,
          width: position.width,
          top: position.top,
          bottom: position.bottom,
          maxHeight: position.maxHeight,
          transformOrigin: position.placement === "up" ? "bottom center" : "top center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: position.placement === "up" ? -4 : 4, scale: 0.98 }}
        animate={reduce ? { opacity: 1, transition: { duration: 0.1 } } : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15 } }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: position.placement === "up" ? -4 : 4, scale: 0.98, transition: { duration: 0.12 } }}
      >
        {options.length === 0 && <p className="px-3 py-2 text-label text-muted">Tidak ada pilihan</p>}
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;
          return (
            <div
              key={option.value}
              id={optionId(index)}
              data-index={index}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => {
                if (!option.disabled && index !== activeIndex) setActiveIndex(index);
              }}
              onClick={() => commit(index)}
              className={cn(
                "relative flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-body transition-colors duration-150",
                option.disabled ? "cursor-not-allowed text-muted/60" : "cursor-pointer text-text",
                isActive && !option.disabled && "bg-white/10"
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{option.label}</span>
                {option.hint && <span className="truncate text-label text-muted">{option.hint}</span>}
              </span>
              {isSelected && <CheckIcon size={16} strokeWidth={1.5} className="shrink-0 text-accent" />}
            </div>
          );
        })}
      </motion.div>
    ) : null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onKeyDown}
        onKeyUp={(event) => {
          // Cegah "klik" bawaan button dari Spasi meng-toggle ulang panel;
          // Spasi sudah ditangani penuh di onKeyDown.
          if (event.key === " ") event.preventDefault();
        }}
        className={cn("field flex items-center justify-between gap-2 text-left", invalid && "field-error")}
      >
        <span className={cn("truncate", !selected && "text-muted")}>{selected ? selected.label : placeholder}</span>
        <ChevronDownIcon
          size={16}
          strokeWidth={1.5}
          className={cn("shrink-0 text-muted transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(<AnimatePresence>{menu}</AnimatePresence>, document.body)}
    </div>
  );
}
