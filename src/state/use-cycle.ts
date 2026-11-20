import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { analyze, todayStatus } from '@/lib/cycle';
import { todayKey } from '@/lib/dates';
import { useLunar } from '@/state/lunar';

/** Today's date key, kept fresh across midnight and when the app returns to the foreground. */
export function useToday() {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const refresh = () => setToday(todayKey());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const id = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
  return today;
}

/** Cycle stats + today's status, derived from the saved logs. */
export function useCycle() {
  const { state } = useLunar();
  const today = useToday();
  const stats = useMemo(() => analyze(state.logs, today), [state.logs, today]);
  const status = useMemo(() => todayStatus(state.logs, stats, today), [state.logs, stats, today]);
  return { today, stats, status, todayLog: state.logs[today] };
}
