/**
 * Date helpers. Days are stored as local "YYYY-MM-DD" keys so a log never shifts
 * between days because of time zones or daylight-saving changes.
 */

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

function parts(k: DateKey): [number, number, number] {
  const [y, m, d] = k.split('-').map(Number);
  return [y, m, d];
}

/** Whole days since the epoch for a key (computed in UTC so DST never matters). */
function dayNumber(k: DateKey): number {
  const [y, m, d] = parts(k);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** a - b, in days. */
export function diffDays(a: DateKey, b: DateKey): number {
  return dayNumber(a) - dayNumber(b);
}

export function addDays(k: DateKey, n: number): DateKey {
  const [y, m, d] = parts(k);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekday(k: DateKey): number {
  const [y, m, d] = parts(k);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "Dec 3" */
export function formatShort(k: DateKey): string {
  const [, m, d] = parts(k);
  return `${MONTHS[m - 1].slice(0, 3)} ${d}`;
}

/** "Thu, Nov 20" */
export function formatLong(k: DateKey): string {
  return `${WEEKDAYS[weekday(k)]}, ${formatShort(k)}`;
}

export interface MonthRef {
  year: number;
  month: number; // 0-11
}

export function monthOf(k: DateKey): MonthRef {
  const [y, m] = parts(k);
  return { year: y, month: m - 1 };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Weeks (Sunday first) for a month; days outside the month are null. */
export function monthGrid({ year, month }: MonthRef): (DateKey | null)[][] {
  const first = `${year}-${pad(month + 1)}-01`;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (DateKey | null)[] = Array(weekday(first)).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DateKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
