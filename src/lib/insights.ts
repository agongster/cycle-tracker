/**
 * Turns cycle status into the pet's look and its warm, non-clinical words.
 * No "late" counters, no warnings. Irregular cycles are treated as normal.
 */
import { Flow, Mood, Phase, TodayStatus } from './cycle';
import { DateKey, formatShort } from './dates';
import { Eyes, Outfit, PetLook, Prop } from './sprites';

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulatory: 'Ovulatory',
  luteal: 'Luteal',
  unknown: 'Getting to know you',
};

export const FLOW_LABEL: Record<Flow, string> = {
  spotting: 'Spotting',
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

export const MOOD_LABEL: Record<Mood, string> = {
  happy: 'Happy',
  calm: 'Calm',
  tired: 'Tired',
  low: 'Low',
  anxious: 'Anxious',
  irritable: 'Irritable',
};

const ENERGY_LABEL = ['', 'Very low', 'Low', 'Steady', 'Rising', 'High'];
export const energyLabel = (n: number) => ENERGY_LABEL[n] ?? 'Steady';

export function phaseTitle(s: TodayStatus): string {
  if (s.extended) return 'Taking its time';
  if (s.lateLuteal) return 'Late luteal';
  return PHASE_LABEL[s.phase];
}

/** One gentle line of practical advice for today. */
export function adviceFor(s: TodayStatus): string {
  if (s.phase === 'unknown') return 'Log your period on the Calendar tab and I’ll start learning your rhythm.';
  if (s.extended)
    return 'This cycle is longer than your usual. That’s common, especially with irregular cycles. Ovulation may have come later this time, so today’s phase is hard to say.';
  switch (s.phase) {
    case 'menstrual':
      return 'Energy may dip today. Warm drinks, rest, and gentle movement can help. You don’t have to do it all.';
    case 'follicular':
      return 'Energy is building. A lovely time to start something new or plan ahead.';
    case 'ovulatory':
      return 'Many people feel their most social and energetic now. Enjoy it, and keep sipping water!';
    case 'luteal':
      return s.lateLuteal
        ? 'PMS days can feel heavy. Cozy plans are valid plans. Snacks, warmth, and early nights help.'
        : 'Energy may start winding down. A good time to finish things and be gentle with yourself.';
  }
}

export function flowLine(s: TodayStatus, today: DateKey): string {
  if (s.phase === 'unknown') return 'Not enough logs yet';
  if (s.phase === 'menstrual' && s.expectedFlow) return `${FLOW_LABEL[s.expectedFlow]} expected`;
  // keys are YYYY-MM-DD, so string comparison is date order
  if (s.next && !s.extended && s.next.windowStart <= today) return 'Could start any day. Maybe pack supplies';
  if (s.daysUntilNext !== null && s.daysUntilNext <= 3) return 'Could start soon. Maybe pack supplies';
  return 'None expected today';
}

export function nextLine(s: TodayStatus, margin: number): string {
  if (!s.next) return 'Log a period to see predictions';
  if (s.extended) return 'Whenever your body is ready';
  return `Around ${formatShort(s.next.start)} (±${margin} days)`;
}

/** Things the pet says. Picked deterministically per day so the bubble doesn't flicker. */
export function petLines(s: TodayStatus, name: string, mood?: Mood): string[] {
  const moodLines: Partial<Record<Mood, string[]>> = {
    low: ['I saw today feels low. I made you some tea. We can just sit together.', 'Low days count too. I’m proud of you for checking in.'],
    anxious: ['Let’s take a slow breath together. In… and out. I’m right here.', 'Anxious days are hard. One small kind thing at a time.'],
    irritable: ['Grumpy days happen to the best of us. Want a snack and a blanket?', 'It’s okay to need space today. I’ll be quiet company.'],
    tired: ['Sleepy day? Me too. Rest is productive, I promise.'],
    happy: ['You’re happy today? That makes ME happy!', 'Yay! Let’s remember this good day.'],
  };
  if (mood && moodLines[mood]) return moodLines[mood]!;

  if (s.phase === 'unknown')
    return [`Hi! I’m ${name}. I’ll grow with you as you log your cycle.`, 'Every body has its own rhythm. Let’s learn yours together!'];
  if (s.extended)
    return [
      'Your cycle is taking its time, and that’s okay. Bodies aren’t clocks.',
      'No rush, no pressure. I’ll keep you company whenever it comes.',
      'Stress, sleep, and life can all shift a cycle. Be gentle with yourself.',
    ];
  switch (s.phase) {
    case 'menstrual':
      return ['I’m in my pajamas with some tea. Want to rest with me?', 'Cozy mode activated. Heating pad? Blanket? Both?', 'Go slow today. You’re doing great.'];
    case 'follicular':
      return ['I’ve got a little spring in my step today!', 'Feeling fresh! Want to try something new?', 'Energy’s coming back. Let’s go!'];
    case 'ovulatory':
      return ['I feel sparkly today! You might too.', 'Peak energy! Call a friend? Dance in the kitchen?', 'Shine on! Don’t forget water.'];
    case 'luteal':
      return s.lateLuteal
        ? ['Sweater weather for the soul. Let’s keep it cozy.', 'Cravings are allowed. Snacks are self-care.', 'Feeling tender? I’ve got tea ready.']
        : ['Winding down a little. Let’s keep it chill.', 'A calm day for a calm pal.', 'Nice and steady today.'];
  }
}

export function pickDaily<T>(items: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return items[Math.abs(h) % items.length];
}

export const AFFIRMATIONS = [
  'You’re doing amazing!',
  'Thanks for taking care of us!',
  '*happy wiggle*',
  'Your body is working hard. Be kind to it.',
  'Drink some water? For me? ♥',
  'I believe in you!',
];

/** Phase (and today's logged mood) decide the pet's expression, outfit and prop. */
export function petAppearance(s: TodayStatus, mood?: Mood): Pick<PetLook, 'eyes' | 'outfit' | 'prop'> {
  let eyes: Eyes = 'normal';
  let outfit: Outfit = 'none';
  let prop: Prop = 'none';

  if (s.phase === 'menstrual') {
    eyes = 'sleepy'; outfit = 'pajamas'; prop = 'tea';
  } else if (s.phase === 'follicular') {
    eyes = 'happy'; prop = 'hearts';
  } else if (s.phase === 'ovulatory') {
    eyes = 'sparkle'; prop = 'sparkles';
  } else if (s.phase === 'luteal') {
    if (s.lateLuteal) { eyes = 'soft'; outfit = 'sweater'; prop = 'tea'; }
    else if (s.extended) { eyes = 'normal'; outfit = 'sweater'; }
  }

  if (mood === 'happy') { eyes = 'happy'; if (prop === 'none') prop = 'hearts'; }
  if (mood === 'tired') { eyes = 'sleepy'; prop = 'zzz'; }
  if (mood === 'low' || mood === 'anxious' || mood === 'irritable') {
    eyes = 'soft'; prop = 'tea'; if (outfit === 'none') outfit = 'sweater';
  }
  return { eyes, outfit, prop };
}
