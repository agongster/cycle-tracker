/**
 * App-wide state for Lunar Pal: cycle logs, the pet, and care points.
 *
 * Everything lives in AsyncStorage on the device only. No accounts, no network. It's
 * loaded once at startup and written back whenever something changes. The points rules
 * themselves are in `@/lib/rewards`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { DayLog, hasContent, Logs } from '@/lib/cycle';
import { addDays, DateKey, todayKey } from '@/lib/dates';
import {
  CARE_POINTS,
  CareId,
  canEarnLogPoints,
  careWouldPay,
  COSTUMES,
  LOG_POINTS,
  rewardLog,
  toggleCareReward,
  touchDays,
} from '@/lib/rewards';
import { cleanName, DEFAULT_STATE, PetConfig, sanitize, SavedState } from '@/lib/saved-state';
import { Costume } from '@/lib/sprites';
import { useShowToast } from '@/state/toast';

const STORAGE_KEY = 'lunar-pal:v1';
/** Damaged saved data is copied here (plus a timestamp) before the app starts fresh. */
const BACKUP_KEY_PREFIX = 'lunar-pal:v1:backup:';
const READ_ATTEMPTS = 3;

interface LunarContextValue {
  state: SavedState;
  ready: boolean;
  /** Today's date, shared by every screen and refreshed across midnight. */
  today: DateKey;
  setDayLog: (date: DateKey, log: DayLog) => void;
  toggleCare: (id: CareId) => void;
  /** A blank name is ignored, so the pet always has one. */
  updatePet: (patch: Partial<Omit<PetConfig, 'costume'>>) => void;
  /** Put on a costume you already own. */
  wearCostume: (costume: Costume) => void;
  /** Spend care points on a costume and put it on (shows a toast if you can't afford it). */
  buyCostume: (costume: Costume) => void;
  loadSampleData: () => void;
  eraseAll: () => void;
}

const LunarContext = createContext<LunarContextValue | null>(null);

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

type LoadProblem = 'unreadable' | 'damaged';
interface LoadResult {
  state: SavedState;
  /** false means "don't write anything": the stored data might still be fine. */
  canSave: boolean;
  problem: LoadProblem | null;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Loads saved data without ever risking it:
 * - a read error is retried, and if it keeps failing, saving is switched off for this session
 *   so the stored data is left exactly as it was;
 * - damaged (unparseable) data is copied to a backup key before the app starts fresh.
 */
async function loadSaved(): Promise<LoadResult> {
  let json: string | null = null;
  for (let attempt = 1; ; attempt++) {
    try {
      json = await AsyncStorage.getItem(STORAGE_KEY);
      break;
    } catch (e) {
      console.warn(`Lunar Pal: could not read saved data (attempt ${attempt})`, e);
      if (attempt >= READ_ATTEMPTS) return { state: DEFAULT_STATE, canSave: false, problem: 'unreadable' };
      await wait(300 * attempt);
    }
  }

  if (json === null) return { state: DEFAULT_STATE, canSave: true, problem: null }; // first launch

  let loaded: SavedState | null = null;
  try {
    loaded = sanitize(JSON.parse(json));
  } catch (e) {
    console.warn('Lunar Pal: saved data is damaged', e);
  }
  if (loaded) return { state: loaded, canSave: true, problem: null };

  try {
    await AsyncStorage.setItem(BACKUP_KEY_PREFIX + new Date().toISOString(), json);
    return { state: DEFAULT_STATE, canSave: true, problem: 'damaged' };
  } catch (e) {
    console.warn('Lunar Pal: could not back up damaged data', e);
    return { state: DEFAULT_STATE, canSave: false, problem: 'unreadable' };
  }
}

const LOAD_PROBLEM_MESSAGE: Record<LoadProblem, string> = {
  unreadable:
    'Couldn’t open your saved data. It’s left untouched, but changes won’t be saved until you restart the app.',
  damaged: 'Your saved data was damaged. A backup copy was kept, and Lunar Pal started fresh.',
};

/** Today's date key, kept fresh across midnight and when the app returns to the foreground. */
function useToday(): DateKey {
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

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LunarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SavedState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const today = useToday();
  const showToast = useShowToast();
  const saveFailing = useRef(false);

  // Load once.
  useEffect(() => {
    let cancelled = false;
    loadSaved()
      .catch((e): LoadResult => {
        console.warn('Lunar Pal: could not load saved data', e);
        return { state: DEFAULT_STATE, canSave: false, problem: 'unreadable' };
      })
      .then(({ state: loaded, canSave: ok, problem }) => {
        if (cancelled) return;
        setState(loaded);
        setCanSave(ok);
        setReady(true);
        if (problem) showToast(LOAD_PROBLEM_MESSAGE[problem], 7000);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // Save on every change, but only after a load that went fine. If loading failed,
  // nothing is written, so the defaults shown on screen can't replace what's stored.
  useEffect(() => {
    if (!canSave) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      .then(() => {
        saveFailing.current = false;
      })
      .catch((e) => {
        console.warn('Lunar Pal: could not save', e);
        // Say so once, not on every tap, until a save works again.
        if (!saveFailing.current) {
          showToast('Couldn’t save to this device. Lunar Pal will try again with your next change.', 6000);
        }
        saveFailing.current = true;
      });
  }, [state, canSave, showToast]);

  const setDayLog = useCallback(
    (date: DateKey, log: DayLog) => {
      const clean: DayLog = { period: log.period, symptoms: log.symptoms };
      if (log.period && log.flow) clean.flow = log.flow;
      if (log.mood) clean.mood = log.mood;
      const logged = hasContent(clean);
      const earns = logged && canEarnLogPoints(state, date, today);
      setState((s) => {
        const logs = { ...s.logs };
        if (logged) logs[date] = clean;
        else delete logs[date];
        return rewardLog({ ...s, logs }, date, logged, today);
      });
      if (earns) showToast(`+${LOG_POINTS} care points! ${state.pet.name} is proud of you`);
    },
    [state, today, showToast],
  );

  const toggleCare = useCallback(
    (id: CareId) => {
      const pays = careWouldPay(state, id, today);
      setState((s) => toggleCareReward(s, id, today));
      if (pays) showToast(`+${CARE_POINTS} care points`);
    },
    [state, today, showToast],
  );

  const updatePet = useCallback((patch: Partial<Omit<PetConfig, 'costume'>>) => {
    setState((s) => {
      const name = patch.name === undefined ? s.pet.name : (cleanName(patch.name) ?? s.pet.name);
      return { ...s, pet: { ...s.pet, ...patch, name } };
    });
  }, []);

  const wearCostume = useCallback((costume: Costume) => {
    setState((s) => (s.owned.includes(costume) ? { ...s, pet: { ...s.pet, costume } } : s));
  }, []);

  const buyCostume = useCallback(
    (costume: Costume) => {
      if (state.owned.includes(costume)) return wearCostume(costume);
      const cost = COSTUMES.find((c) => c.id === costume)?.cost ?? 0;
      if (state.points < cost) {
        showToast(`Need ${cost - state.points} more care points`);
        return;
      }
      setState((s) => ({ ...s, points: s.points - cost, owned: [...s.owned, costume], pet: { ...s.pet, costume } }));
      showToast('Unlocked! So stylish');
    },
    [state.owned, state.points, wearCostume, showToast],
  );

  const loadSampleData = useCallback(() => {
    setState((s) => {
      const logs = makeSampleLogs(today);
      // Sample days count as touched, so editing them can't be used to farm points.
      return touchDays({ ...s, logs }, Object.keys(logs));
    });
    showToast('Sample cycles loaded');
  }, [today, showToast]);

  const eraseAll = useCallback(() => {
    // Wipes everything, points included, so there's nothing to gain by re-logging afterwards.
    setState(DEFAULT_STATE);
    showToast('All data erased');
  }, [showToast]);

  const value = useMemo<LunarContextValue>(
    () => ({ state, ready, today, setDayLog, toggleCare, updatePet, wearCostume, buyCostume, loadSampleData, eraseAll }),
    [state, ready, today, setDayLog, toggleCare, updatePet, wearCostume, buyCostume, loadSampleData, eraseAll],
  );

  return <LunarContext.Provider value={value}>{children}</LunarContext.Provider>;
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
