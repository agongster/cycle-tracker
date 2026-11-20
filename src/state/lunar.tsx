/**
 * App-wide state for Lunar Pal: cycle logs, the pet, and care points.
 *
 * Everything lives in AsyncStorage on the device only. No accounts, no network. It's
 * loaded once at startup and written back whenever something changes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { DayLog, hasContent, Logs } from '@/lib/cycle';
import { addDays, DateKey, todayKey } from '@/lib/dates';
import { Costume, FurColor, Species } from '@/lib/sprites';

export interface PetConfig {
  name: string;
  species: Species;
  color: FurColor;
  costume: Costume;
}

export interface SavedState {
  version: 1;
  logs: Logs;
  pet: PetConfig;
  points: number;
  /** self-care actions completed, by day */
  care: Record<DateKey, string[]>;
  /** days that already earned logging points (so points can't be farmed) */
  rewarded: DateKey[];
  owned: Costume[];
}

export const LOG_POINTS = 5;
export const CARE_POINTS = 2;

export const COSTUMES: { id: Costume; label: string; cost: number }[] = [
  { id: 'none', label: 'None', cost: 0 },
  { id: 'bow', label: 'Bow', cost: 0 },
  { id: 'flowers', label: 'Flowers', cost: 10 },
  { id: 'scarf', label: 'Scarf', cost: 20 },
  { id: 'beanie', label: 'Beanie', cost: 30 },
  { id: 'crown', label: 'Crown', cost: 50 },
];

export const CARE_ACTIONS = [
  { id: 'water', label: 'Water', icon: 'drop' },
  { id: 'tea', label: 'Warm drink', icon: 'cup' },
  { id: 'move', label: 'Stretch', icon: 'leaf' },
  { id: 'rest', label: 'Rest', icon: 'moon' },
  { id: 'nourish', label: 'Good food', icon: 'apple' },
  { id: 'kind', label: 'Kind words', icon: 'heart' },
] as const;

const STORAGE_KEY = 'lunar-pal:v1';

const DEFAULT_STATE: SavedState = {
  version: 1,
  logs: {},
  pet: { name: 'Mochi', species: 'cat', color: 'honey', costume: 'none' },
  points: 0,
  care: {},
  rewarded: [],
  owned: ['none', 'bow'],
};

interface LunarContextValue {
  state: SavedState;
  ready: boolean;
  setDayLog: (date: DateKey, log: DayLog) => void;
  toggleCare: (id: string) => void;
  updatePet: (patch: Partial<PetConfig>) => void;
  /** Equip a costume, buying it with care points first if needed. Returns false if unaffordable. */
  chooseCostume: (costume: Costume) => boolean;
  loadSampleData: () => void;
  eraseAll: () => void;
  toast: { id: number; message: string } | null;
  showToast: (message: string) => void;
}

const LunarContext = createContext<LunarContextValue | null>(null);

function sanitize(raw: unknown): SavedState {
  if (!raw || typeof raw !== 'object') return DEFAULT_STATE;
  const r = raw as Partial<SavedState>;
  return {
    version: 1,
    logs: r.logs && typeof r.logs === 'object' ? r.logs : {},
    pet: { ...DEFAULT_STATE.pet, ...(r.pet ?? {}) },
    points: typeof r.points === 'number' ? r.points : 0,
    care: r.care && typeof r.care === 'object' ? r.care : {},
    rewarded: Array.isArray(r.rewarded) ? r.rewarded : [],
    owned: Array.isArray(r.owned) ? Array.from(new Set([...DEFAULT_STATE.owned, ...r.owned])) : DEFAULT_STATE.owned,
  };
}

export function LunarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SavedState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (!cancelled && json) setState(sanitize(JSON.parse(json)));
      })
      .catch((e) => console.warn('Lunar Pal: could not load saved data', e))
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Save on every change (after the first load, so defaults never overwrite real data).
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
      console.warn('Lunar Pal: could not save', e),
    );
  }, [state, ready]);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const setDayLog = useCallback(
    (date: DateKey, log: DayLog) => {
      const clean: DayLog = {
        period: log.period,
        flow: log.period ? log.flow : undefined,
        symptoms: log.symptoms,
        mood: log.mood,
      };
      const earns = hasContent(clean) && !state.rewarded.includes(date);
      setState((s) => {
        const logs = { ...s.logs };
        if (hasContent(clean)) logs[date] = clean;
        else delete logs[date];
        if (!earns || s.rewarded.includes(date)) return { ...s, logs };
        return { ...s, logs, points: s.points + LOG_POINTS, rewarded: [...s.rewarded, date] };
      });
      if (earns) showToast(`+${LOG_POINTS} care points! ${state.pet.name} is proud of you`);
    },
    [state.rewarded, state.pet.name, showToast],
  );

  const toggleCare = useCallback(
    (id: string) => {
      const today = todayKey();
      const wasDone = (state.care[today] ?? []).includes(id);
      setState((s) => {
        const done = s.care[today] ?? [];
        const on = !done.includes(id);
        // keep only the last 60 days of care history
        const cutoff = addDays(today, -60);
        const care: Record<DateKey, string[]> = {};
        for (const [k, v] of Object.entries(s.care)) if (k >= cutoff) care[k] = v;
        care[today] = on ? [...done, id] : done.filter((d) => d !== id);
        return { ...s, care, points: Math.max(0, s.points + (on ? CARE_POINTS : -CARE_POINTS)) };
      });
      if (!wasDone) showToast(`+${CARE_POINTS} care points`);
    },
    [state.care, showToast],
  );

  const updatePet = useCallback((patch: Partial<PetConfig>) => {
    setState((s) => ({ ...s, pet: { ...s.pet, ...patch } }));
  }, []);

  const chooseCostume = useCallback(
    (costume: Costume) => {
      if (state.owned.includes(costume)) {
        setState((s) => ({ ...s, pet: { ...s.pet, costume } }));
        return true;
      }
      const cost = COSTUMES.find((c) => c.id === costume)?.cost ?? 0;
      if (state.points < cost) {
        showToast(`Need ${cost - state.points} more care points`);
        return false;
      }
      setState((s) => ({
        ...s,
        points: s.points - cost,
        owned: [...s.owned, costume],
        pet: { ...s.pet, costume },
      }));
      showToast('Unlocked! So stylish');
      return true;
    },
    [state.owned, state.points, showToast],
  );

  const loadSampleData = useCallback(() => {
    setState((s) => ({ ...s, logs: makeSampleLogs(todayKey()) }));
    showToast('Sample cycles loaded');
  }, [showToast]);

  const eraseAll = useCallback(() => {
    setState(DEFAULT_STATE);
    showToast('All data erased');
  }, [showToast]);

  return (
    <LunarContext.Provider
      value={{ state, ready, setDayLog, toggleCare, updatePet, chooseCostume, loadSampleData, eraseAll, toast, showToast }}>
      {children}
    </LunarContext.Provider>
  );
}

export function useLunar() {
  const ctx = useContext(LunarContext);
  if (!ctx) throw new Error('useLunar must be used inside <LunarProvider>');
  return ctx;
}

/** Six irregular cycles (26–34 days) ending with a period that started 10 days ago. */
function makeSampleLogs(today: DateKey): Logs {
  const lengths = [31, 27, 34, 29, 33, 26];
  const periodLens = [5, 4, 6, 5, 5, 4, 5];
  const flows: DayLog['flow'][] = ['medium', 'heavy', 'medium', 'light', 'spotting', 'spotting'];
  const starts: DateKey[] = [addDays(today, -10)];
  for (let i = lengths.length - 1; i >= 0; i--) starts.unshift(addDays(starts[0], -lengths[i]));
  const logs: Logs = {};
  starts.forEach((start, i) => {
    const plen = periodLens[i % periodLens.length];
    for (let d = 0; d < plen; d++) {
      logs[addDays(start, d)] = {
        period: true,
        flow: flows[d],
        symptoms: d === 0 ? ['Cramps', 'Fatigue'] : d === 1 ? ['Cramps'] : [],
        mood: d === 0 ? 'tired' : undefined,
      };
    }
    if (i < starts.length - 1) {
      const pms = addDays(starts[i + 1], -3);
      logs[pms] = { period: false, symptoms: ['Bloating', 'Cravings'], mood: 'irritable' };
    }
  });
  return logs;
}
