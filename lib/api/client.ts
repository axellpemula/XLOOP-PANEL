export interface ApiFail {
  error: string;
}

/** Fetch JSON + lempar Error berisi pesan dari server kalau gagal. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message =
      (json as ApiFail | null)?.error ??
      (response.status === 401 ? "Sesi habis. Silakan login ulang." : "Terjadi kesalahan. Coba lagi.");
    throw new Error(message);
  }

  return json as T;
}
