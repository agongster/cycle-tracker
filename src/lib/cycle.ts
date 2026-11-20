/**
 * Cycle math. Everything is derived from the user's own logs, and nothing assumes a
 * 28-day cycle once there's real data. Predictions are windows, not single dates, and
 * the windows get wider when cycles vary more.
 */
import { addDays, DateKey, diffDays } from './dates';

export type Flow = 'spotting' | 'light' | 'medium' | 'heavy';
export const FLOWS: Flow[] = ['spotting', 'light', 'medium', 'heavy'];
const FLOW_VALUE: Record<Flow, number> = { spotting: 1, light: 2, medium: 3, heavy: 4 };

export type Mood = 'happy' | 'calm' | 'tired' | 'low' | 'anxious' | 'irritable';
export const MOODS: Mood[] = ['happy', 'calm', 'tired', 'low', 'anxious', 'irritable'];

export const SYMPTOMS = [
  'Cramps', 'Headache', 'Bloating', 'Fatigue', 'Acne', 'Tender breasts',
  'Back pain', 'Cravings', 'Nausea', 'Trouble sleeping',
] as const;

export interface DayLog {
  period: boolean;
  flow?: Flow;
  symptoms: string[];
  mood?: Mood;
}
export type Logs = Record<DateKey, DayLog>;

export function hasContent(log: DayLog | undefined): boolean {
  return !!log && (log.period || log.symptoms.length > 0 || !!log.mood);
}

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';

export interface Period {
  start: DateKey;
  end: DateKey;
  length: number;
}

export interface Prediction {
  start: DateKey; // most likely first day
  likelyEnd: DateKey; // most likely last day
  windowStart: DateKey; // earliest it might start
  windowEnd: DateKey; // latest it might end
}

export interface CycleStats {
  periods: Period[];
  cycleLengths: number[]; // recent cycles, oldest first
  avgCycle: number | null; // null until two periods are logged
  expectedCycle: number; // avgCycle, or 28 as a gentle starting guess
  sd: number | null;
  minCycle: number | null;
  maxCycle: number | null;
  avgPeriod: number;
  margin: number; // +/- days of uncertainty on predictions
  /** The current cycle has run past its whole predicted start window. */
  extended: boolean;
  /** predictions[0] is the period everyone means by "next", including on its likely start day */
  predictions: Prediction[];
  /** today and future days marked on the calendar */
  predicted: Record<DateKey, PeriodChance>;
}

export type PeriodChance = 'likely' | 'possible';

export interface TodayStatus {
  phase: Phase;
  cycleDay: number | null;
  lateLuteal: boolean; // the last few days before a period (often PMS)
  extended: boolean; // this cycle is running longer than the user's usual range
  energy: number; // 1-5
  expectedFlow: Flow | null;
  /** Flow the user logged for today, if any (spotting included). */
  loggedFlow: Flow | null;
  /** Same as stats.predictions[0], so Home and Calendar talk about the same period. */
  next: Prediction | null;
  /** 0 on the likely start day, negative after it while still inside the window */
  daysUntilNext: number | null;
  /** The mark the Calendar shows on today's cell (dashed = likely, dotted = possible). */
  chance: PeriodChance | null;
}

const RECENT_CYCLES = 6;
const DEFAULT_CYCLE = 28;
const DEFAULT_PERIOD = 5;
const DEFAULT_FLOW_PATTERN: Flow[] = ['medium', 'heavy', 'medium', 'light', 'light', 'spotting', 'spotting'];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A bleeding day heavier than spotting. (Old logs with no flow saved count as real flow.) */
export function isFlowDay(log: DayLog | undefined): boolean {
  return !!log?.period && log.flow !== 'spotting';
}

/**
 * Group logged period days into periods. A single missed day still counts as the same period.
 *
 * Spotting on its own doesn't start a new cycle (mid-cycle spotting is common). A run of
 * bleeding days only counts as a period if it has at least one day of real flow, and the
 * cycle starts on that first real-flow day. Spotting right before or after still joins it.
 */
export function groupPeriods(logs: Logs): Period[] {
  const days = Object.keys(logs).filter((k) => logs[k].period).sort();
  const runs: DateKey[][] = [];
  for (const day of days) {
    const run = runs[runs.length - 1];
    if (run && diffDays(day, run[run.length - 1]) <= 2) run.push(day);
    else runs.push([day]);
  }
  const periods: Period[] = [];
  for (const run of runs) {
    const start = run.find((d) => isFlowDay(logs[d]));
    if (!start) continue; // spotting only
    const end = run[run.length - 1];
    periods.push({ start, end, length: diffDays(end, start) + 1 });
  }
  return periods;
}

export function analyze(logs: Logs, today: DateKey): CycleStats {
  const periods = groupPeriods(logs);
  const starts = periods.map((p) => p.start);

  const allLengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const len = diffDays(starts[i], starts[i - 1]);
    if (len >= 10 && len <= 120) allLengths.push(len); // ignore gaps that are probably missed logs
  }
  const cycleLengths = allLengths.slice(-RECENT_CYCLES);

  const avgCycle = cycleLengths.length ? Math.round(mean(cycleLengths)) : null;
  const sd =
    cycleLengths.length >= 2
      ? Math.sqrt(mean(cycleLengths.map((l) => (l - mean(cycleLengths)) ** 2)))
      : null;
  const expectedCycle = avgCycle ?? DEFAULT_CYCLE;

  // Don't let an ongoing (still being logged) period drag the average down.
  const finished = periods.filter((p) => diffDays(today, p.end) > 1);
  const avgPeriod = finished.length
    ? clamp(Math.round(mean(finished.map((p) => p.length))), 2, 10)
    : DEFAULT_PERIOD;

  // Less data, or more variable cycles, means a wider window.
  const margin =
    sd !== null ? clamp(Math.round(sd), 2, 10) : cycleLengths.length === 1 ? 4 : 5;

  const predictions: Prediction[] = [];
  const last = periods[periods.length - 1];
  let extended = false;
  if (last) {
    let start = addDays(last.start, expectedCycle);
    // If the whole start window has already passed, the cycle is just running long. Predict
    // from tomorrow without counting how "late" anything is. Home reads this same flag.
    if (diffDays(today, addDays(start, margin)) > 0) {
      extended = true;
      start = addDays(today, 1);
    }
    for (let i = 0; i < 3; i++) {
      predictions.push({
        start,
        likelyEnd: addDays(start, avgPeriod - 1),
        windowStart: addDays(start, -margin),
        windowEnd: addDays(start, avgPeriod - 1 + margin),
      });
      start = addDays(start, expectedCycle);
    }
  }

  const predicted: Record<DateKey, PeriodChance> = {};
  for (const p of predictions) {
    for (let d = p.windowStart; diffDays(p.windowEnd, d) >= 0; d = addDays(d, 1)) {
      if (diffDays(d, today) < 0 || logs[d]?.period) continue;
      const likely = diffDays(d, p.start) >= 0 && diffDays(p.likelyEnd, d) >= 0;
      if (likely) predicted[d] = 'likely';
      else if (!predicted[d]) predicted[d] = 'possible';
    }
  }

  return {
    periods,
    cycleLengths,
    avgCycle,
    expectedCycle,
    sd,
    minCycle: cycleLengths.length ? Math.min(...cycleLengths) : null,
    maxCycle: cycleLengths.length ? Math.max(...cycleLengths) : null,
    avgPeriod,
    margin,
    extended,
    predictions,
    predicted,
  };
}

/** Average logged flow for the Nth day of past periods (falls back to a typical pattern). */
function expectedFlowForDay(logs: Logs, periods: Period[], dayIndex: number): Flow {
  const values: number[] = [];
  for (const p of periods) {
    const f = logs[addDays(p.start, dayIndex - 1)]?.flow;
    if (f) values.push(FLOW_VALUE[f]);
  }
  if (!values.length) return DEFAULT_FLOW_PATTERN[Math.min(dayIndex - 1, DEFAULT_FLOW_PATTERN.length - 1)];
  const v = clamp(Math.round(mean(values)), 1, 4);
  return FLOWS[v - 1];
}

export function todayStatus(logs: Logs, stats: CycleStats, today: DateKey): TodayStatus {
  const last = stats.periods[stats.periods.length - 1];
  // Home uses the same prediction and the same calendar mark as the Calendar screen, so the
  // two screens can't disagree (they used to on the likely start day itself).
  const next = stats.predictions[0] ?? null;
  const daysUntilNext = next ? diffDays(next.start, today) : null;
  const chance = stats.predicted[today] ?? null;
  const loggedFlow = logs[today]?.period ? (logs[today].flow ?? null) : null;

  if (!last) {
    return { phase: 'unknown', cycleDay: null, lateLuteal: false, extended: false, energy: 3, expectedFlow: null, loggedFlow, next, daysUntilNext, chance };
  }

  const cycleDay = diffDays(today, last.start) + 1;
  const len = stats.expectedCycle;
  // Spotting alone today (say, mid-cycle) doesn't make it a period day.
  const inPeriod =
    isFlowDay(logs[today]) ||
    diffDays(today, last.end) <= 0 ||
    (cycleDay <= stats.avgPeriod && diffDays(today, last.end) <= 1);

  // The luteal phase is fairly stable (~14 days), so ovulation is estimated backwards.
  const ovDay = clamp(len - 14, stats.avgPeriod + 2, Math.max(stats.avgPeriod + 2, len - 3));

  let phase: Phase;
  let energy: number;
  let lateLuteal = false;
  let extended = false;
  let expectedFlow: Flow | null = null;

  if (inPeriod) {
    phase = 'menstrual';
    energy = cycleDay <= 2 ? 1 : 2;
    expectedFlow = logs[today]?.flow ?? expectedFlowForDay(logs, stats.periods.slice(0, -1), cycleDay);
  } else if (cycleDay < ovDay - 1) {
    phase = 'follicular';
    energy = cycleDay <= stats.avgPeriod + 2 ? 3 : 4;
  } else if (cycleDay <= ovDay + 1) {
    phase = 'ovulatory';
    energy = 5;
  } else {
    phase = 'luteal';
    extended = stats.extended;
    lateLuteal = !extended && cycleDay >= len - 4;
    energy = lateLuteal ? 2 : 3;
  }

  return { phase, cycleDay, lateLuteal, extended, energy, expectedFlow, loggedFlow, next, daysUntilNext, chance };
}
