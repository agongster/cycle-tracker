import { describe, expect, it } from '@jest/globals';

import { analyze, DayLog, groupPeriods, Logs, todayStatus } from '../cycle';
import { addDays } from '../dates';
import { flowLine, nextPeriodText, phaseTitle } from '../insights';

const TODAY = '2026-11-20';

/** `len` days of medium flow starting on each date. */
function periods(starts: string[], len = 5): Logs {
  const logs: Logs = {};
  for (const start of starts) {
    for (let i = 0; i < len; i++) logs[addDays(start, i)] = { period: true, flow: 'medium', symptoms: [] };
  }
  return logs;
}

/** Regular 28-day cycles whose latest period started `daysAgo` days before TODAY. */
function regular(daysAgo: number): Logs {
  const last = addDays(TODAY, -daysAgo);
  return periods([addDays(last, -84), addDays(last, -56), addDays(last, -28), last]);
}

const spotting: DayLog = { period: true, flow: 'spotting', symptoms: [] };

describe('groupPeriods', () => {
  it('keeps a period together across one missed day', () => {
    const logs = periods(['2026-11-01'], 2);
    logs['2026-11-04'] = { period: true, flow: 'light', symptoms: [] };
    expect(groupPeriods(logs)).toEqual([{ start: '2026-11-01', end: '2026-11-04', length: 4 }]);
  });

  it('does not start a new cycle on a lone spotting day (review finding 21)', () => {
    const logs = periods(['2026-10-01', '2026-10-29']);
    logs['2026-10-14'] = spotting; // mid-cycle spotting
    expect(groupPeriods(logs).map((p) => p.start)).toEqual(['2026-10-01', '2026-10-29']);
    expect(analyze(logs, TODAY).cycleLengths).toEqual([28]);
  });

  it('starts the cycle on the first real-flow day when spotting comes first', () => {
    const logs = periods(['2026-11-03'], 4);
    logs['2026-11-01'] = spotting;
    logs['2026-11-02'] = spotting;
    expect(groupPeriods(logs)).toEqual([{ start: '2026-11-03', end: '2026-11-06', length: 4 }]);
  });

  it('keeps spotting at the end as part of the period', () => {
    const logs = periods(['2026-11-01'], 4);
    logs['2026-11-05'] = spotting;
    logs['2026-11-07'] = spotting;
    expect(groupPeriods(logs)).toEqual([{ start: '2026-11-01', end: '2026-11-07', length: 7 }]);
  });

  it('still counts a single day of real flow (some people only log the first day)', () => {
    const logs = periods(['2026-10-01', '2026-10-30'], 1);
    expect(analyze(logs, TODAY).cycleLengths).toEqual([29]);
  });
});

describe('todayStatus', () => {
  it('is "getting to know you" with no logs', () => {
    const stats = analyze({}, TODAY);
    expect(todayStatus({}, stats, TODAY).phase).toBe('unknown');
    expect(stats.predictions).toEqual([]);
  });

  it('does not treat a spotting day mid-cycle as a period day', () => {
    const logs = regular(14);
    logs[TODAY] = spotting;
    const status = todayStatus(logs, analyze(logs, TODAY), TODAY);
    expect(status.phase).not.toBe('menstrual');
    expect(status.cycleDay).toBe(15);
    expect(flowLine(status)).toBe('Spotting logged today');
  });

  it('widens the prediction window when cycles vary more', () => {
    const steady = analyze(regular(10), TODAY);
    let starts = [addDays(TODAY, -10)];
    for (const len of [26, 33, 29, 34, 27, 31]) starts = [addDays(starts[0], -len), ...starts];
    const irregular = analyze(periods(starts), TODAY);
    expect(steady.margin).toBe(2);
    expect(irregular.margin).toBeGreaterThan(steady.margin);
  });

  it('rolls predictions forward gently when a cycle runs long', () => {
    const logs = regular(40);
    const stats = analyze(logs, TODAY);
    const status = todayStatus(logs, stats, TODAY);
    expect(stats.extended).toBe(true);
    expect(stats.predictions[0].start).toBe(addDays(TODAY, 1));
    expect(phaseTitle(status)).toBe('Taking its time');
    expect(nextPeriodText(stats, TODAY)).not.toMatch(/late/i);
  });
});

describe('Home and Calendar agree (review finding 13)', () => {
  // Walk "today" from mid-cycle, through the predicted window, to well past it.
  it.each(Array.from({ length: 30 }, (_, i) => i + 12))('%i days after the last period started', (daysAgo) => {
    const logs = regular(daysAgo);
    const stats = analyze(logs, TODAY);
    const status = todayStatus(logs, stats, TODAY);
    const mark = stats.predicted[TODAY]; // what the Calendar shows on today's cell
    const flow = flowLine(status); // what Home's Flow row says

    if (mark === 'likely') expect(flow).toMatch(/^Likely around now/);
    else if (mark === 'possible') expect(flow).toMatch(/^Could start any day/);
    else expect(flow).toBe('None expected today');

    // Home's "Next" row and the Calendar summary come from the same prediction.
    expect(status.next).toBe(stats.predictions[0]);
  });

  it('says "likely around today" on the predicted start day itself', () => {
    const logs = regular(28);
    const stats = analyze(logs, TODAY);
    const status = todayStatus(logs, stats, TODAY);
    expect(stats.predicted[TODAY]).toBe('likely');
    expect(flowLine(status)).toBe('Likely around now. Maybe pack supplies');
    expect(nextPeriodText(stats, TODAY)).toBe('Likely around today, anytime Nov 18–Nov 22');
  });
});
