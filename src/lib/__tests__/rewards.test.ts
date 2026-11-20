import { describe, expect, it } from '@jest/globals';

import { addDays } from '../dates';
import {
  canEarnLogPoints,
  CARE_IDS,
  CARE_POINTS,
  LOG_POINTS,
  RewardFields,
  rewardLog,
  toggleCareReward,
  touchDays,
} from '../rewards';

const TODAY = '2026-11-20';
const TOMORROW = addDays(TODAY, 1);
const start: RewardFields = { points: 0, touched: [], lastLogReward: null, care: {}, carePaid: {} };

describe('log points (review finding 18)', () => {
  it('pays the first time a day is logged', () => {
    const s = rewardLog(start, TODAY, true, TODAY);
    expect(s.points).toBe(LOG_POINTS);
    expect(s.touched).toEqual([TODAY]);
  });

  it('never pays again for a day that was cleared and logged again, even on a later day', () => {
    let s = rewardLog(start, TODAY, true, TODAY); // log
    s = rewardLog(s, TODAY, false, TODAY); // "Clear day"
    s = rewardLog(s, TODAY, true, TODAY); // log again
    s = rewardLog(s, TODAY, false, TOMORROW); // clear again tomorrow
    s = rewardLog(s, TODAY, true, TOMORROW); // and log again
    expect(s.points).toBe(LOG_POINTS);
  });

  it('pays once per real day when backfilling many past days', () => {
    let s = start;
    for (let i = 1; i <= 60; i++) s = rewardLog(s, addDays(TODAY, -i), true, TODAY);
    expect(s.points).toBe(LOG_POINTS);
    expect(s.touched).toHaveLength(60);
  });

  it('pays again the next day for a day that has not been logged before', () => {
    let s = rewardLog(start, TODAY, true, TODAY);
    s = rewardLog(s, TOMORROW, true, TOMORROW);
    expect(s.points).toBe(2 * LOG_POINTS);
  });

  it('does not touch a day just by looking at it or saving it empty', () => {
    const s = rewardLog(start, TODAY, false, TODAY);
    expect(s.touched).toEqual([]);
    expect(canEarnLogPoints(s, TODAY, TODAY)).toBe(true);
  });

  it('never pays for future days', () => {
    expect(canEarnLogPoints(start, TOMORROW, TODAY)).toBe(false);
  });

  it('sample days count as touched, so editing them pays nothing', () => {
    const sampleDays = [addDays(TODAY, -10), addDays(TODAY, -9)];
    let s = touchDays(start, sampleDays);
    for (const day of sampleDays) s = rewardLog(s, day, true, TODAY);
    expect(s.points).toBe(0);
  });
});

describe('self-care points (review finding 16)', () => {
  const toggleAll = (s: RewardFields) => CARE_IDS.reduce((acc, id) => toggleCareReward(acc, id, TODAY), s);

  it('pays each action once a day', () => {
    expect(toggleAll(start).points).toBe(CARE_IDS.length * CARE_POINTS);
  });

  it('refunds points when an action is unchecked, if you still have them', () => {
    const on = toggleCareReward(start, 'water', TODAY);
    const off = toggleCareReward(on, 'water', TODAY);
    expect(off.points).toBe(0);
    expect(toggleCareReward(off, 'water', TODAY).points).toBe(CARE_POINTS); // can be checked again
  });

  it('cannot earn back points that were already spent', () => {
    let s = toggleAll(start); // 12 points
    s = { ...s, points: s.points - 10 }; // buy Flowers
    s = toggleAll(s); // uncheck everything: only one refund is affordable
    expect(s.points).toBe(0);
    s = toggleAll(s); // check everything again
    expect(s.points).toBe(2); // the 2 that were left, not 12
  });

  it('starts fresh the next day', () => {
    const s = toggleCareReward(toggleCareReward(start, 'rest', TODAY), 'rest', TOMORROW);
    expect(s.points).toBe(2 * CARE_POINTS);
  });
});
