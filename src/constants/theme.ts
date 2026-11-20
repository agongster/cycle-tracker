import type { Flow, Phase } from '@/lib/cycle';

/** Warm, cozy palette (cocoa ink on cream paper). */
export const C = {
  bg: '#FBE9D0',
  bgDeep: '#F3D3AA',
  panel: '#FFF7EA',
  panelAlt: '#FDEBD6',
  ink: '#4A2C2A',
  inkSoft: '#85594A',
  inkFaint: '#C29C82',
  shadow: '#DDB58C',
  rose: '#E0675F',
  roseDeep: '#B83A3F',
  roseLight: '#F6B5AE',
  blush: '#FCE1DA',
  peach: '#F7B98B',
  amber: '#F2B544',
  amberDeep: '#D48F2A',
  sage: '#93B37A',
  sageLight: '#DDEBCF',
  lavender: '#BBA6D6',
  cream: '#FFF3DD',
  white: '#FFFDF8',
} as const;

export const FLOW_COLORS: Record<Flow, string> = {
  spotting: '#F7C9C2',
  light: '#F09A93',
  medium: '#E0675F',
  heavy: '#B03A3E',
};

/** Stage colors behind the pet, one mood per phase. */
export const PHASE_STAGE: Record<Phase, { sky: string; floor: string; accent: string }> = {
  menstrual: { sky: '#F2C3BC', floor: '#DF9C93', accent: '#FFF3DD' },
  follicular: { sky: '#FAD9AA', floor: '#E9B57C', accent: '#FFFDF8' },
  ovulatory: { sky: '#FBE6A6', floor: '#E8C46A', accent: '#FFFDF8' },
  luteal: { sky: '#E6D0E2', floor: '#C8A6C4', accent: '#FFF3DD' },
  unknown: { sky: '#F6DEC4', floor: '#E5C19C', accent: '#FFFDF8' },
};

export const Fonts = {
  display: 'Silkscreen_400Regular',
  displayBold: 'Silkscreen_700Bold',
  body: 'Jersey15_400Regular',
} as const;

/** Size of one "pixel" in UI borders and shadows. */
export const PX = 3;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const MaxContentWidth = 560;
