import type { KeyStatus, Role } from "./types";

export const KEY_REGEX = /^XLVP-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
export const HWID_REGEX = /^[A-Za-z0-9_:.-]{16,128}$/;
export const NONCE_REGEX = /^[A-Za-z0-9_-]{16,64}$/;

export const STATUS_ORDER: KeyStatus[] = ["active", "expired", "banned"];

export const STATUS_LABEL: Record<KeyStatus, string> = {
  active: "Active",
  expired: "Expired",
  banned: "Banned",
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  reseller: "Reseller",
};

export const LIMITS = {
  owner: { maxDevice: 100, maxQty: 100 },
  reseller: { maxDevice: 10, maxQty: 50 },
} as const;

export const VALIDATE_LIMITS = {
  ipPerMinute: 30,
  keyPerMinute: 15,
  invalidKeyPerIp: 5,
  invalidKeyWindowMinutes: 10,
  deviceRejectPerHour: 5,
} as const;
