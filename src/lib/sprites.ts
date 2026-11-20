/**
 * Pixel-art engine for Lunar Pal.
 *
 * Every sprite is a grid of single-character "color keys" (see PALETTE). Shapes are
 * painted as fills only; outlines are generated automatically around each object,
 * which keeps every pet / costume / prop combination looking hand-drawn and consistent.
 *
 * This file is pure TypeScript (no React Native imports) so it can be unit-previewed.
 */

export type Species = 'cat' | 'bunny' | 'bear' | 'pup';
export type FurColor = 'honey' | 'cocoa' | 'cream' | 'rose' | 'lavender' | 'charcoal';
export type Costume = 'none' | 'bow' | 'flowers' | 'scarf' | 'beanie' | 'crown';
export type Eyes = 'normal' | 'happy' | 'sleepy' | 'sparkle' | 'soft' | 'blink';
export type Outfit = 'none' | 'pajamas' | 'sweater';
export type Prop = 'none' | 'tea' | 'sparkles' | 'hearts' | 'zzz';

export interface PetLook {
  species: Species;
  color: FurColor;
  costume: Costume;
  eyes: Eyes;
  outfit: Outfit;
  prop: Prop;
}

type Grid = string[][];

/** Shared colors. Body keys (B S H W P) are filled in per fur color by petPalette(). */
export const PALETTE: Record<string, string> = {
  O: '#4A2C2A', // outline / ink
  E: '#3A2220', // eye
  I: '#FFFFFF', // eye shine
  K: '#F08C8C', // cheek blush
  r: '#D9544F', // red
  R: '#A83A36', // dark red
  y: '#F4C542', // gold
  Y: '#C9952B', // dark gold
  g: '#8FB573', // sage
  G: '#6A8F52', // dark sage
  c: '#FFF3DD', // cream
  C: '#EAD7B7', // cream shade
  q: '#F59AB0', // pink
  u: '#7FB2E0', // blue
  U: '#4F86BD', // dark blue
  j: '#B9A6DD', // pajama lavender
  J: '#9884C4', // pajama shade
  a: '#E8A05E', // sweater amber
  A: '#C47C3C', // sweater shade
  m: '#FBF5EC', // mug
  M: '#D9CDBE', // mug shade
  t: '#A86B3C', // tea
  v: 'rgba(255,255,255,0.85)', // steam
  k: '#B7A89C', // grey metal
};

export const FUR: Record<FurColor, { B: string; S: string; H: string; W: string; P: string }> = {
  honey: { B: '#F2B866', S: '#D58F45', H: '#FAD9A0', W: '#FFF1DA', P: '#F4A3A3' },
  cocoa: { B: '#A86F4F', S: '#7E4E36', H: '#C79173', W: '#F2DCC6', P: '#E8A0A0' },
  cream: { B: '#F5E6D0', S: '#D9C0A2', H: '#FFFBF3', W: '#FFFBF3', P: '#F4A9A9' },
  rose: { B: '#F2A9A1', S: '#D7817A', H: '#F9CBC5', W: '#FFEDE8', P: '#E7787A' },
  lavender: { B: '#C9B5E0', S: '#A68DC4', H: '#E2D6F0', W: '#F7F1FC', P: '#F0A6C0' },
  charcoal: { B: '#6F6460', S: '#504643', H: '#918480', W: '#EADFD8', P: '#E8A0A0' },
};

export function petPalette(color: FurColor): Record<string, string> {
  return { ...PALETTE, ...FUR[color] };
}

/** Keys that never receive an auto-outline (soft effects like steam). */
const NO_OUTLINE = new Set(['v']);

export const PET_W = 40;
export const PET_H = 34;

function blank(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array<string>(w).fill('.'));
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

type Pt = [number, number];
function inTri(x: number, y: number, a: Pt, b: Pt, c: Pt) {
  const s = (p1: Pt, p2: Pt, p3: Pt) =>
    (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const p: Pt = [x, y];
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function paint(g: Grid, pred: (x: number, y: number) => boolean, key: string | ((x: number, y: number) => string)) {
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < g[0].length; x++) {
      if (pred(x, y)) g[y][x] = typeof key === 'function' ? key(x, y) : key;
    }
  }
}

function set(g: Grid, x: number, y: number, key: string) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = key;
}

/** Set a pixel and its horizontal mirror. */
function sym(g: Grid, x: number, y: number, key: string) {
  set(g, x, y, key);
  set(g, g[0].length - 1 - x, y, key);
}

function stamp(g: Grid, x0: number, y0: number, rows: string[]) {
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const ch = row[dx];
      if (ch !== '.' && ch !== ' ') set(g, x0 + dx, y0 + dy, ch);
    }
  });
}

/** Draw `obj` onto `target`, first tracing a 1px outline around its silhouette. */
function overlay(target: Grid, obj: Grid, outline = true) {
  const h = obj.length;
  const w = obj[0].length;
  const filled = (x: number, y: number) =>
    y >= 0 && y < h && x >= 0 && x < w && obj[y][x] !== '.' && !NO_OUTLINE.has(obj[y][x]);
  if (outline) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (obj[y][x] !== '.') continue;
        if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
          target[y][x] = 'O';
        }
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (obj[y][x] !== '.') target[y][x] = obj[y][x];
    }
  }
}

const toRows = (g: Grid) => g.map((r) => r.join(''));

// ---------------------------------------------------------------------------
// Pet
// ---------------------------------------------------------------------------

const CX = 19.5; // horizontal center (pixel index space) -> x mirrors to 39 - x
const inHead = (x: number, y: number) => inEllipse(x, y, CX, 22, 11, 10);
/** Top edge of the body ellipse at column x. */
const headTop = (x: number) => Math.ceil(22 - 10 * Math.sqrt(Math.max(0, 1 - ((x - CX) / 11) ** 2)));

function drawEyes(g: Grid, eyes: Eyes) {
  const L = [13, 14];
  const R = [25, 26];
  switch (eyes) {
    case 'normal':
    case 'soft':
      for (const [a, b] of [L, R]) {
        set(g, a, 20, 'E'); set(g, b, 20, 'E'); set(g, a, 21, 'E'); set(g, b, 21, 'E');
        set(g, a, 20, 'I');
      }
      if (eyes === 'soft') {
        // gentle, downcast look: shine moves to the bottom of each eye
        set(g, L[0], 20, 'E'); set(g, R[0], 20, 'E');
        set(g, L[1], 21, 'I'); set(g, R[1], 21, 'I');
      }
      break;
    case 'sparkle':
      for (const [a, b] of [L, R]) {
        for (let y = 19; y <= 21; y++) { set(g, a, y, 'E'); set(g, b, y, 'E'); }
        set(g, a, 19, 'I'); set(g, b, 21, 'I');
      }
      break;
    case 'happy':
      sym(g, 12, 21, 'E'); sym(g, 13, 20, 'E'); sym(g, 14, 20, 'E'); sym(g, 15, 21, 'E');
      break;
    case 'sleepy':
      sym(g, 12, 20, 'E'); sym(g, 13, 21, 'E'); sym(g, 14, 21, 'E'); sym(g, 15, 21, 'E');
      break;
    case 'blink':
      sym(g, 13, 21, 'E'); sym(g, 14, 21, 'E');
      break;
  }
}

function drawFace(g: Grid, species: Species, eyes: Eyes) {
  // muzzle for bear & pup
  if (species === 'bear' || species === 'pup') {
    paint(g, (x, y) => inEllipse(x, y, CX, 23.6, 3.4, 2.3), 'W');
  }
  drawEyes(g, eyes);
  // cheeks
  sym(g, 11, 23, 'K'); sym(g, 12, 23, 'K');
  // nose
  const nose = species === 'bear' || species === 'pup' ? 'O' : 'P';
  set(g, 19, 22, nose); set(g, 20, 22, nose);
  // mouth
  if (eyes === 'sleepy' || eyes === 'soft') {
    set(g, 19, 24, 'O'); set(g, 20, 24, 'O');
  } else {
    sym(g, 18, 23, 'O'); sym(g, 19, 24, 'O');
  }
  if (species === 'cat') {
    // whiskers
    sym(g, 9, 22, 'O'); sym(g, 9, 24, 'O');
  }
}

function bodyObject(species: Species): Grid {
  const o = blank(PET_W, PET_H);
  // ears behind the head
  if (species === 'cat') {
    paint(o, (x, y) => inTri(x, y, [10, 18], [11, 5], [18, 13]) || inTri(x, y, [29, 18], [28, 5], [21, 13]), 'B');
  } else if (species === 'bunny') {
    paint(o, (x, y) => inEllipse(x, y, 15, 8, 2.6, 7.5) || inEllipse(x, y, 24, 8, 2.6, 7.5), 'B');
  } else if (species === 'bear') {
    paint(o, (x, y) => inEllipse(x, y, 11, 14, 3.7, 3.7) || inEllipse(x, y, 28, 14, 3.7, 3.7), 'B');
  }
  // head/body blob + feet
  paint(o, inHead, 'B');
  paint(o, (x, y) => inEllipse(x, y, 14, 32, 2.8, 1.6) || inEllipse(x, y, 25, 32, 2.8, 1.6), 'S');
  // bottom shading crescent
  paint(o, (x, y) => inHead(x, y) && !inEllipse(x, y, CX - 0.3, 21, 10.6, 10), 'S');
  // belly
  paint(o, (x, y) => inHead(x, y) && inEllipse(x, y, CX, 28.5, 6.5, 4.5), 'W');
  // inner ears (only the part peeking above the head)
  if (species === 'cat') {
    paint(o, (x, y) => !inHead(x, y) && (inTri(x, y, [12, 15], [12, 8], [16, 13]) || inTri(x, y, [27, 15], [27, 8], [23, 13])), 'P');
  } else if (species === 'bunny') {
    paint(o, (x, y) => !inHead(x, y) && (inEllipse(x, y, 15, 8.5, 1, 5.5) || inEllipse(x, y, 24, 8.5, 1, 5.5)), 'P');
  } else if (species === 'bear') {
    paint(o, (x, y) => !inHead(x, y) && (inEllipse(x, y, 11, 14, 1.8, 1.8) || inEllipse(x, y, 28, 14, 1.8, 1.8)), 'P');
  }
  // shine
  set(o, 13, 15, 'H'); set(o, 14, 15, 'H'); set(o, 12, 16, 'H');
  return o;
}

function applyOutfit(g: Grid, outfit: Outfit) {
  if (outfit === 'none') return;
  const furKeys = new Set(['B', 'S', 'H', 'W']);
  for (let y = 26; y < PET_H; y++) {
    for (let x = 0; x < PET_W; x++) {
      const k = g[y][x];
      if (!furKeys.has(k)) continue;
      const shade = k === 'S';
      if (outfit === 'pajamas') {
        if (y === 26) g[y][x] = 'c'; // collar
        else if (!shade && x % 4 === (y % 2 === 0 ? 1 : 3) && y % 2 === 0) g[y][x] = 'c'; // polka dots
        else g[y][x] = shade ? 'J' : 'j';
      } else {
        if (y === 26 || y === 27) g[y][x] = 'A'; // ribbed collar
        else g[y][x] = shade ? 'A' : (x + y) % 4 === 0 ? 'A' : 'a'; // knit
      }
    }
  }
}

function costumeObject(costume: Costume, body: Grid): Grid | null {
  const o = blank(PET_W, PET_H);
  switch (costume) {
    case 'none':
      return null;
    case 'bow':
      stamp(o, 23, 9, [
        'rr.....rr',
        'rrrr.rrrr',
        'rcrrRrrrr',
        'rrrrRrrrr',
        'rrrr.rrrr',
        'rr.....rr',
      ]);
      return o;
    case 'crown':
      stamp(o, 15, 6, [
        'y...yy...y',
        'yy..yy..yy',
        'yyyyyyyyyy',
        'yuyyrryyuy',
        'yyyyyyyyyy',
        'YYYYYYYYYY',
      ]);
      return o;
    case 'beanie':
      paint(o, (x, y) => inEllipse(x, y, CX, 16, 10.5, 7.6) && y <= 15, (x, y) =>
        y >= 14 ? (x % 2 === 0 ? 'G' : 'g') : x % 3 === 0 ? 'G' : 'g',
      );
      paint(o, (x, y) => inEllipse(x, y, CX, 7.5, 2.1, 2.1), 'c');
      return o;
    case 'flowers': {
      const xs = [12, 16, 23, 27];
      xs.forEach((x, i) => {
        const y = headTop(x);
        const petal = i % 2 === 0 ? 'q' : 'c';
        set(o, x, y - 1, petal); set(o, x - 1, y, petal); set(o, x + 1, y, petal); set(o, x, y + 1, petal);
        set(o, x, y, 'y');
      });
      set(o, 19, headTop(19) - 1, 'g'); set(o, 20, headTop(20) - 1, 'g');
      set(o, 18, headTop(18), 'g'); set(o, 21, headTop(21), 'g');
      return o;
    }
    case 'scarf':
      paint(o, (x, y) => (y === 26 || y === 27) && body[y][x] !== '.', (x) => (x % 4 === 0 ? 'c' : 'r'));
      paint(o, (x, y) => x >= 24 && x <= 26 && y >= 28 && y <= 31, (x, y) => (y === 30 ? 'c' : 'r'));
      return o;
  }
}

function drawProp(g: Grid, prop: Prop, frame: 0 | 1) {
  switch (prop) {
    case 'none':
      return;
    case 'tea': {
      const mug = blank(PET_W, PET_H);
      stamp(mug, 27, 24, [
        '.mtttm..',
        'BmmmmmMM',
        'BmmqmmMm',
        '.mmmmmMM',
        '.mmmmM..',
        '..MMM...',
      ]);
      overlay(g, mug);
      const steam = blank(PET_W, PET_H);
      const s = frame === 0
        ? [[29, 22], [30, 21], [30, 20], [29, 19], [32, 21], [31, 20]]
        : [[30, 22], [29, 21], [29, 20], [30, 19], [31, 21], [32, 20]];
      s.forEach(([x, y]) => set(steam, x, y, 'v'));
      overlay(g, steam, false);
      return;
    }
    case 'sparkles': {
      const spots = frame === 0
        ? [[4, 10, 2], [35, 15, 1], [5, 27, 1], [33, 4, 1]]
        : [[4, 10, 1], [35, 15, 2], [5, 27, 2], [33, 4, 2]];
      spots.forEach(([x, y, r]) => {
        set(g, x, y, 'c');
        for (let i = 1; i <= r; i++) {
          set(g, x - i, y, 'y'); set(g, x + i, y, 'y'); set(g, x, y - i, 'y'); set(g, x, y + i, 'y');
        }
      });
      return;
    }
    case 'hearts': {
      const h = blank(PET_W, PET_H);
      const y0 = frame === 0 ? 6 : 5;
      stamp(h, 32, y0, ['qq.qq', 'qcqqq', 'qqqqq', '.qqq.', '..q..']);
      stamp(h, 4, frame === 0 ? 11 : 12, ['q.q', 'qqq', '.q.']);
      overlay(g, h);
      return;
    }
    case 'zzz': {
      const z = ['OOOO', '..O.', '.O..', 'OOOO'];
      stamp(g, 31, frame === 0 ? 9 : 8, z);
      if (frame === 1) stamp(g, 35, 3, z);
      return;
    }
  }
}

export function buildPet(look: PetLook, frame: 0 | 1 = 0): string[] {
  const g = blank(PET_W, PET_H);
  const body = bodyObject(look.species);
  overlay(g, body);
  if (look.species === 'pup') {
    const ears = blank(PET_W, PET_H);
    paint(ears, (x, y) => inEllipse(x, y, 9.6, 20, 2.4, 6) || inEllipse(x, y, 29.4, 20, 2.4, 6), 'S');
    overlay(g, ears);
  }
  drawFace(g, look.species, look.eyes);
  applyOutfit(g, look.outfit);
  const costume = costumeObject(look.costume, body);
  if (costume) overlay(g, costume);
  drawProp(g, look.prop, frame);
  return toRows(g);
}

// ---------------------------------------------------------------------------
// Icons: fill-only drawings that get an automatic outline + 1px padding.
// ---------------------------------------------------------------------------

const ICON_FILLS = {
  drop: [
    '...u...',
    '..uuu..',
    '.uuuuu.',
    '.ucuuu.',
    'uucuuuu',
    'uuuuuUu',
    '.uuuUu.',
    '..uuu..',
  ],
  cup: [
    '.v..v...',
    '..v..v..',
    '........',
    'tttttt..',
    'mmmmmmMM',
    'mmqmmm.M',
    'mmmmmmMM',
    '.mmmmM..',
  ],
  leaf: [
    '....ggg',
    '..ggggg',
    '.gggGgg',
    '.ggGggg',
    'ggGggg.',
    'gGggg..',
    'G......',
  ],
  moon: [
    '..yyy...',
    '.yyy....',
    'yyy.....',
    'yyy.....',
    'yyy....y',
    'yyyy..yy',
    '.yyyyyy.',
    '..yyyy..',
  ],
  apple: [
    '....Gg.',
    '...G...',
    '.rr.rr.',
    'rcrrrrr',
    'rcrrrrr',
    'rrrrrrr',
    '.rrrrR.',
    '..rRR..',
  ],
  heart: [
    '.qq.qq.',
    'qcqqqqq',
    'qqqqqqq',
    'qqqqqqq',
    '.qqqqq.',
    '..qqq..',
    '...q...',
  ],
  star: [
    '...y...',
    '..yyy..',
    'yyycyyy',
    '.yyyyy.',
    '..yyy..',
    '.yy.yy.',
    '.y...y.',
  ],
  home: [
    '...rr...',
    '..rrrr..',
    '.rrrrrr.',
    'rrrrrrrr',
    '.cccccc.',
    '.cc..cc.',
    '.cc..cc.',
  ],
  calendar: [
    '.k....k.',
    'rrrrrrrr',
    'rrrrrrrr',
    'cccccccc',
    'crcccccc',
    'cccccrcc',
    'cccccccc',
  ],
  lock: [
    '..kkk..',
    '.k...k.',
    '.k...k.',
    'yyyyyyy',
    'yyyOyyy',
    'yyyOyyy',
    'YYYYYYY',
  ],
  pencil: [
    '.....qq',
    '....yqq',
    '...yyy.',
    '..yyy..',
    '.cyy...',
    'cc.....',
  ],
  check: [
    '.....g',
    '....gg',
    'g..gg.',
    'gggg..',
    '.gg...',
  ],
  left: ['..E', '.EE', 'EEE', '.EE', '..E'],
  right: ['E..', 'EE.', 'EEE', 'EE.', 'E..'],
  sparkle: ['..y..', '..y..', 'yycyy', '..y..', '..y..'],
};

export type IconName = keyof typeof ICON_FILLS;

const iconCache = new Map<string, string[]>();

export function buildIcon(name: IconName): string[] {
  const hit = iconCache.get(name);
  if (hit) return hit;
  const fill = ICON_FILLS[name];
  const w = Math.max(...fill.map((r) => r.length)) + 2;
  const h = fill.length + 2;
  const obj = blank(w, h);
  stamp(obj, 1, 1, fill);
  const g = blank(w, h);
  overlay(g, obj);
  const rows = toRows(g);
  iconCache.set(name, rows);
  return rows;
}
