import type { KeyStatus } from "./types";

/** Status efektif sebuah key: expired dihitung dari tanggal, bukan cuma kolom status. */
export function effectiveStatus(status: KeyStatus, expiredAt: string | null): KeyStatus {
  if (status === "banned") return "banned";
  if (expiredAt && new Date(expiredAt).getTime() < Date.now()) return "expired";
  return "active";
}

export const STATUS_DOT: Record<KeyStatus, string> = {
  active: "bg-active",
  expired: "bg-expired",
  banned: "bg-banned",
};

export const STATUS_TEXT: Record<KeyStatus, string> = {
  active: "text-active",
  expired: "text-expired",
  banned: "text-banned",
};

export const STATUS_BAR: Record<KeyStatus, string> = {
  active: "bg-active",
  expired: "bg-expired",
  banned: "bg-banned",
};
