"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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

/**
 * Select custom (bukan <select> bawaan): panel glass-strong,
 * navigasi keyboard panah / Home / End / Enter / Esc, tutup saat klik luar.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const fallbackId = useId();
  const listId = `${id ?? fallbackId}-list`;

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  useEffect(() => {
    if (!open) return;

    const selectedIndex = options.findIndex((o) => o.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, options, value]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => {
          let next = prev;
          for (let i = 0; i < options.length; i += 1) {
            next = (next + 1) % options.length;
            if (!options[next].disabled) break;
          }
          return next;
        });
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => {
          let next = prev;
          for (let i = 0; i < options.length; i += 1) {
            next = (next - 1 + options.length) % options.length;
            if (!options[next].disabled) break;
          }
          return next;
        });
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

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
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={onKeyDown}
        className={cn(
          "field flex items-center justify-between gap-2 text-left",
          invalid && "field-error",
          disabled && "cursor-not-allowed opacity-55"
        )}
      >
        <span className={cn("truncate", !selected && "text-muted")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          size={16}
          strokeWidth={1.5}
          className={cn("shrink-0 text-muted transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            role="listbox"
            id={listId}
            tabIndex={-1}
            className="glass-strong absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-y-auto scroll-area rounded-card p-1"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            animate={reduce ? { opacity: 1, transition: { duration: 0.1 } } : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15 } }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98, transition: { duration: 0.12 } }}
          >
            {options.length === 0 && (
              <p className="px-3 py-2 text-label text-muted">Tidak ada pilihan</p>
            )}
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <div
                  key={option.value}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                  onClick={() => commit(index)}
                  className={cn(
                    "relative flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-body transition-colors duration-150",
                    option.disabled ? "cursor-not-allowed text-muted/60" : "text-text",
                    isActive && !option.disabled && "bg-glass-strong"
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
        )}
      </AnimatePresence>
    </div>
  );
}
