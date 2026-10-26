import { randomInt } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** 4 karakter acak pakai crypto.randomInt (bukan Math.random). */
function block(len = 4): string {
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

export function generateKeyValue(): string {
  return `XLVP-${block()}-${block()}`;
}

/**
 * Buat `count` key unik. `existing` dipakai untuk cek duplikat terhadap DB
 * sebelum insert; kalau bentrok, key digenerate ulang.
 */
export function generateUniqueKeys(count: number, existing: Set<string>): string[] {
  const result: string[] = [];
  let guard = 0;

  while (result.length < count) {
    const candidate = generateKeyValue();
    guard += 1;
    if (existing.has(candidate)) {
      if (guard > count * 200) throw new Error("Gagal membuat key unik, coba lagi.");
      continue;
    }
    existing.add(candidate);
    result.push(candidate);
  }

  return result;
}
