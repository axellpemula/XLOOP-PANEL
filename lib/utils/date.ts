/** Tambah hari ke tanggal (null = lifetime). */
export function addDays(base: Date, days: number): Date {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function isoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Awal hari ini di zona Asia/Jakarta, sebagai ISO string. */
export function startOfTodayISO(): string {
  const now = new Date();
  const jakarta = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const offset = now.getTime() - jakarta.getTime();
  const start = new Date(jakarta);
  start.setHours(0, 0, 0, 0);
  return new Date(start.getTime() + offset).toISOString();
}

export function startOfDaysAgoISO(days: number): string {
  const base = new Date(startOfTodayISO());
  base.setUTCDate(base.getUTCDate() - days);
  return base.toISOString();
}

/** 7 tanggal terakhir (YYYY-MM-DD, zona Jakarta) untuk chart. */
export function lastNDates(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }));
  }
  return out;
}
