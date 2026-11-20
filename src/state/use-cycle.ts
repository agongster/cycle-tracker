import { useMemo } from 'react';

import { analyze, Mood, todayStatus, TodayStatus } from '@/lib/cycle';
import { petAppearance } from '@/lib/insights';
import type { PetLook } from '@/lib/sprites';
import { useLunar } from '@/state/lunar';

/** Cycle stats + today's status, derived from the saved logs. */
export function useCycle() {
  const { state, today } = useLunar();
  const stats = useMemo(() => analyze(state.logs, today), [state.logs, today]);
  const status = useMemo(() => todayStatus(state.logs, stats, today), [state.logs, stats, today]);
  return { today, stats, status, todayLog: state.logs[today] };
}

/** The pet as it should look today: the user's choices plus the phase and today's mood. */
export function usePetLook(status: TodayStatus, mood?: Mood): PetLook {
  const { species, color, costume } = useLunar().state.pet;
  return useMemo(
    () => ({ species, color, costume, ...petAppearance(status, mood) }),
    [species, color, costume, status, mood],
  );
}
