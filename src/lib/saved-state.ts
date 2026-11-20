/**
 * The shape of Lunar Pal's saved data, plus `sanitize`, which checks data loaded from storage
 * so a bad value can't crash a screen later. Pure functions, so they can be unit tested.
 */
import { DayLog, FLOWS, hasContent, Logs, MOODS } from './cycle';
import { DateKey } from './dates';
import { CARE_IDS, CareId, COSTUME_IDS, RewardFields } from './rewards';
import { Costume, FUR_COLORS, FurColor, Species, SPECIES_IDS } from './sprites';

export interface PetConfig {
  name: string;
  species: Species;
  color: FurColor;
  costume: Costume;
}

export interface SavedState extends RewardFields {
  version: 1;
  logs: Logs;
  pet: PetConfig;
  owned: Costume[];
}

export const MAX_NAME_LENGTH = 14;

export const DEFAULT_STATE: SavedState = {
  version: 1,
  logs: {},
  pet: { name: 'Mochi', species: 'cat', color: 'honey', costume: 'none' },
  points: 0,
  care: {},
  carePaid: {},
  touched: [],
  lastLogReward: null,
  owned: ['none', 'bow'],
};

type Json = Record<string, unknown>;
const isObject = (x: unknown): x is Json => !!x && typeof x === 'object' && !Array.isArray(x);
const isDateKey = (x: unknown): x is DateKey => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
const oneOf = <T extends string>(list: readonly T[], x: unknown): x is T =>
  typeof x === 'string' && (list as readonly string[]).includes(x);

/** A usable pet name, or null if it's blank. */
export function cleanName(name: string): string | null {
  return name.trim().slice(0, MAX_NAME_LENGTH) || null;
}

function cleanLog(raw: unknown): DayLog | null {
  if (!isObject(raw)) return null;
  const log: DayLog = {
    period: raw.period === true,
    symptoms: Array.isArray(raw.symptoms) ? raw.symptoms.filter((x): x is string => typeof x === 'string') : [],
  };
  if (log.period && oneOf(FLOWS, raw.flow)) log.flow = raw.flow;
  if (oneOf(MOODS, raw.mood)) log.mood = raw.mood;
  return hasContent(log) ? log : null;
}

function cleanCareList(raw: unknown): CareId[] | null {
  return Array.isArray(raw) ? Array.from(new Set(raw.filter((x) => oneOf(CARE_IDS, x)))) : null;
}

/** Keeps only valid date keys, and only the values `clean` accepts. */
function cleanByDay<T>(raw: unknown, clean: (value: unknown) => T | null): Record<DateKey, T> {
  const out: Record<DateKey, T> = {};
  if (!isObject(raw)) return out;
  for (const [day, value] of Object.entries(raw)) {
    const v = isDateKey(day) ? clean(value) : null;
    if (v !== null) out[day] = v;
  }
  return out;
}

/**
 * Checks every field, all the way down. Bad pieces are dropped or reset to defaults.
 * Returns null if `raw` isn't a saved state at all.
 */
export function sanitize(raw: unknown): SavedState | null {
  if (!isObject(raw)) return null;
  const logs = cleanByDay(raw.logs, cleanLog);
  const care = cleanByDay(raw.care, cleanCareList);
  const pet = isObject(raw.pet) ? raw.pet : {};
  const owned = Array.from(
    new Set([...DEFAULT_STATE.owned, ...(Array.isArray(raw.owned) ? raw.owned.filter((c) => oneOf(COSTUME_IDS, c)) : [])]),
  );
  // Older saves called this list "rewarded". Any day with a log has been touched, too.
  const savedTouched = Array.isArray(raw.touched) ? raw.touched : Array.isArray(raw.rewarded) ? raw.rewarded : [];
  return {
    version: 1,
    logs,
    pet: {
      name: (typeof pet.name === 'string' && cleanName(pet.name)) || DEFAULT_STATE.pet.name,
      species: oneOf(SPECIES_IDS, pet.species) ? pet.species : DEFAULT_STATE.pet.species,
      color: oneOf(FUR_COLORS, pet.color) ? pet.color : DEFAULT_STATE.pet.color,
      costume: oneOf(COSTUME_IDS, pet.costume) && owned.includes(pet.costume) ? pet.costume : 'none',
    },
    points: typeof raw.points === 'number' && Number.isFinite(raw.points) ? Math.max(0, Math.floor(raw.points)) : 0,
    care,
    // Older saves don't have this. Back then every checked action had been paid for.
    carePaid: raw.carePaid === undefined ? care : cleanByDay(raw.carePaid, cleanCareList),
    touched: Array.from(new Set([...savedTouched.filter(isDateKey), ...Object.keys(logs)])).sort(),
    lastLogReward: isDateKey(raw.lastLogReward) ? raw.lastLogReward : null,
    owned,
  };
}
