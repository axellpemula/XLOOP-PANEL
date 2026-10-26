/** Helper body limit untuk route handler (2 KB). */
export async function readLimitedJson(req: Request, maxBytes: number): Promise<unknown | null> {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength && contentLength > maxBytes) return null;

  const raw = await req.text();
  if (raw.length > maxBytes) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
