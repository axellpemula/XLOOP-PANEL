import "server-only";
import { sign } from "crypto";

/**
 * Decode nilai env base64 jadi PEM. Menerima:
 * - base64 dari file PEM (cara yang dianjurkan)
 * - PEM mentah (untuk kenyamanan saat dev)
 */
export function decodePem(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.includes("BEGIN")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    return decoded.includes("BEGIN") ? decoded : null;
  } catch {
    return null;
  }
}

export function getPrivateKey(): string | null {
  return decodePem(process.env.LICENSE_SIGNING_PRIVATE_KEY);
}

export function getPublicKey(): string | null {
  return decodePem(process.env.LICENSE_SIGNING_PUBLIC_KEY);
}

export class SigningNotConfiguredError extends Error {
  constructor() {
    super("License signing key belum diset");
  }
}

/**
 * Tandatangani payload JSON (byte persis sebelum di-base64) dengan Ed25519.
 * Return base64 signature + base64 payload.
 */
export function signPayload(payload: Record<string, unknown>): { payload: string; signature: string } {
  const privateKey = getPrivateKey();
  if (!privateKey) throw new SigningNotConfiguredError();

  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const signature = sign(null, json, privateKey);

  return {
    payload: json.toString("base64"),
    signature: signature.toString("base64"),
  };
}
