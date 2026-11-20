/**
 * Care-point rules. They're pure functions (no React, no storage) so they can be unit tested.
 *
 * Logging: a day pays LOG_POINTS only the first time it's ever logged. After that it's
 * "touched" for good, so clearing a day and logging it again never pays. Also, only one
 * logged day pays per real day, so backfilling months of past days pays once, not once
 * per day.
 *
 * Self-care: each action pays CARE_POINTS once per day. Unchecking gives the points back
 * only if you still have them. Otherwise the action stays paid and won't pay again.
 */
import { addDays, DateKey } from './dates';
import type { Costume } from './sprites';

export const LOG_POINTS = 5;
export const CARE_POINTS = 2;

export const CARE_ACTIONS = [
  { id: 'water', label: 'Water', icon: 'drop' },
  { id: 'tea', label: 'Warm drink', icon: 'cup' },
  { id: 'move', label: 'Stretch', icon: 'leaf' },
  { id: 'rest', label: 'Rest', icon: 'moon' },
  { id: 'nourish', label: 'Good food', icon: 'apple' },
  { id: 'kind', label: 'Kind words', icon: 'heart' },
] as const;
export type CareId = (typeof CARE_ACTIONS)[number]['id'];
export const CARE_IDS: readonly CareId[] = CARE_ACTIONS.map((a) => a.id);

export const COSTUMES: { id: Costume; label: string; cost: number }[] = [
  { id: 'none', label: 'None', cost: 0 },
  { id: 'bow', label: 'Bow', cost: 0 },
  { id: 'flowers', label: 'Flowers', cost: 10 },
  { id: 'scarf', label: 'Scarf', cost: 20 },
  { id: 'beanie', label: 'Beanie', cost: 30 },
  { id: 'crown', label: 'Crown', cost: 50 },
];
export const COSTUME_IDS: readonly Costume[] = COSTUMES.map((c) => c.id);

export interface RewardFields {
  points: number;
  /** Days that have ever been logged, even if cleared later. A day only pays the first time. */
  touched: DateKey[];
  /** The real day the last logging reward was paid (one logging reward per day). */
  lastLogReward: DateKey | null;
  /** Self-care actions checked, by day. */
  care: Record<DateKey, CareId[]>;
  /** Self-care actions whose points are currently credited, by day. */
  carePaid: Record<DateKey, CareId[]>;
}

/** Would logging `date` right now earn points? */
export function canEarnLogPoints(
  s: Pick<RewardFields, 'touched' | 'lastLogReward'>,
  date: DateKey,
  today: DateKey,
): boolean {
  return date <= today && !s.touched.includes(date) && s.lastLogReward !== today;
}

/** Call after a day's log is saved. Marks the day touched, and pays points if allowed. */
export function rewardLog<S extends RewardFields>(s: S, date: DateKey, hasLog: boolean, today: DateKey): S {
  if (!hasLog) return s; // looking at or clearing a day doesn't touch it
  const touched = s.touched.includes(date) ? s.touched : [...s.touched, date];
  if (!canEarnLogPoints(s, date, today)) return { ...s, touched };
  return { ...s, touched, points: s.points + LOG_POINTS, lastLogReward: today };
}

/** Mark days as touched without paying anything (used for sample data). */
export function touchDays<S extends RewardFields>(s: S, days: DateKey[]): S {
  return { ...s, touched: Array.from(new Set([...s.touched, ...days])).sort() };
}

/** Would checking this self-care action right now pay points? */
export function careWouldPay(s: Pick<RewardFields, 'care' | 'carePaid'>, id: CareId, today: DateKey): boolean {
  return !(s.care[today] ?? []).includes(id) && !(s.carePaid[today] ?? []).includes(id);
}

/** Check or uncheck a self-care action for today, adjusting points by the rules above. */
export function toggleCareReward<S extends RewardFields>(s: S, id: CareId, today: DateKey): S {
  const done = s.care[today] ?? [];
  const paid = s.carePaid[today] ?? [];
  const on = !done.includes(id);
  let points = s.points;
  let nowPaid = paid;
  if (on && !paid.includes(id)) {
    points += CARE_POINTS;
    nowPaid = [...paid, id];
  } else if (!on && paid.includes(id) && points >= CARE_POINTS) {
    points -= CARE_POINTS;
    nowPaid = paid.filter((p) => p !== id);
  }
  return {
    ...s,
    points,
    care: { ...recentDays(s.care, today), [today]: on ? [...done, id] : done.filter((d) => d !== id) },
    carePaid: { ...recentDays(s.carePaid, today), [today]: nowPaid },
  };
}

/** Keep only the last 60 days of per-day care history. */
function recentDays<T>(byDay: Record<DateKey, T>, today: DateKey): Record<DateKey, T> {
  const cutoff = addDays(today, -60);
  return Object.fromEntries(Object.entries(byDay).filter(([day]) => day >= cutoff));
}
