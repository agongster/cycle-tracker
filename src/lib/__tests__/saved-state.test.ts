import { describe, expect, it } from '@jest/globals';

import { DEFAULT_STATE, sanitize } from '../saved-state';

describe('sanitize (review finding 23)', () => {
  it.each([null, undefined, 3, 'text', [], [1, 2]])('rejects %p', (raw) => {
    expect(sanitize(raw)).toBeNull();
  });

  it('fills in a bare object with defaults', () => {
    expect(sanitize({})).toEqual(DEFAULT_STATE);
  });

  it('drops bad log entries instead of crashing later', () => {
    const s = sanitize({
      logs: {
        '2026-11-01': { period: true }, // no symptoms list
        '2026-11-02': 'oops',
        'not-a-date': { period: true, symptoms: [] },
        '2026-11-03': { period: true, flow: 'gushing', symptoms: [7, 'Cramps'], mood: 'grumpy' },
        '2026-11-04': { period: false, symptoms: [] }, // empty
      },
    })!;
    expect(s.logs).toEqual({
      '2026-11-01': { period: true, symptoms: [] },
      '2026-11-03': { period: true, symptoms: ['Cramps'] },
    });
  });

  it('resets unknown pet values and never keeps a blank name', () => {
    const s = sanitize({ pet: { name: '   ', species: 'dragon', color: 'neon', costume: 'crown' } })!;
    expect(s.pet).toEqual(DEFAULT_STATE.pet); // crown isn't owned, so it isn't worn either
  });

  it('cleans points, costumes and care lists', () => {
    const s = sanitize({
      points: -4,
      owned: ['scarf', 'jetpack'],
      care: { '2026-11-20': ['water', 'water', 'fly'], bad: ['rest'] },
    })!;
    expect(s.points).toBe(0);
    expect(s.owned).toEqual(['none', 'bow', 'scarf']);
    expect(s.care).toEqual({ '2026-11-20': ['water'] });
  });

  it('upgrades older saves', () => {
    const s = sanitize({
      logs: { '2026-11-05': { period: true, flow: 'light', symptoms: [] } },
      rewarded: ['2026-11-01'], // the old name for "touched"
      care: { '2026-11-20': ['tea'] },
    })!;
    // every logged day counts as touched, plus the ones that already paid
    expect(s.touched).toEqual(['2026-11-01', '2026-11-05']);
    // back then, every checked care action had been paid for
    expect(s.carePaid).toEqual({ '2026-11-20': ['tea'] });
  });
});
