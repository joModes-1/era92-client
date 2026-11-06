/**
 * Shared helpers for the org admin tab pages (Home, Live jobs, Cash,
 * Reports): local dates for the report queries, the compact money format the
 * design uses ("3.2M", "640K"), and how long ago something happened.
 */

export const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysAgo = (n: number) => isoLocal(new Date(Date.now() - n * 86400000));
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const ugx = (n: any) => Math.round(Number(n || 0)).toLocaleString();

/** 3,210,000 → "3.2M", 640,000 → "640K", 900 → "900". */
export function compact(n: number) {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
}

/** Minutes → "3h 10m" / "45 min". */
export function duration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h >= 48) return `${Math.floor(h / 24)} days`;
  return `${h}h${m % 60 ? ` ${m % 60}m` : ''}`;
}

export const minutesSince = (iso?: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 60000 : 0);

/** "since yesterday 16:40", "since Mon", "4 hours" — how long cash has been held. */
export function sinceText(iso?: string | null) {
  if (!iso) return 'never handed in';
  const d = new Date(iso);
  const mins = minutesSince(iso);
  if (mins < 60) return `${Math.max(1, Math.round(mins))} min`;
  if (mins < 24 * 60 && d.getDate() === new Date().getDate()) return `${Math.round(mins / 60)} hours`;
  if (mins < 48 * 60) return `since yesterday ${hhmm(d)}`;
  return `since ${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

export const clock = (iso?: string | null) => (iso ? hhmm(new Date(iso)) : '');
export const weekday = (iso: string) => new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(undefined, { weekday: 'long' });

/** Cash held longer than this needs the owner's eye. */
export const CASH_OVERDUE_HOURS = 24;
