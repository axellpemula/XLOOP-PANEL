"use client";

import { createContext, useContext } from "react";

/**
 * Ref container scroll utama (area konten di kanan sidebar).
 * Dipakai IntersectionObserver (Reveal, AnimatedNumber) supaya animasi
 * trigger-nya mengikuti scroll area, bukan window.
 */
export const ScrollRootContext = createContext<React.RefObject<HTMLElement> | null>(null);

export function useScrollRoot() {
  return useContext(ScrollRootContext);
}
