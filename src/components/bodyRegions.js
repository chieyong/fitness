/**
 * Een bewust abstract silhouet: afgeronde vormen op een raster van 120x210,
 * geen anatomische tekening. Het gaat om "waar zit het werk", niet om spieren
 * natekenen -- en een strak, rustig figuur past bij de rest van het scherm.
 *
 * `muscle: null` betekent neutraal lichaamsdeel: wel getekend, niet gekleurd,
 * niet aanklikbaar (hoofd, hals, onderbenen).
 */

const HEAD = { id: 'head', muscle: null, shape: { cx: 60, cy: 20, r: 12 } };
const NECK = { id: 'neck', muscle: null, shape: { x: 55, y: 30, w: 10, h: 8, r: 4 } };

const ARMS_LOWER = [
  { id: 'forearm-l', shape: { x: 23, y: 90, w: 12, h: 30, r: 6 } },
  { id: 'forearm-r', shape: { x: 85, y: 90, w: 12, h: 30, r: 6 } },
];

const SHOULDERS = [
  { id: 'shoulder-l', shape: { x: 28, y: 38, w: 19, h: 17, r: 8 } },
  { id: 'shoulder-r', shape: { x: 73, y: 38, w: 19, h: 17, r: 8 } },
];

const ARMS_UPPER = [
  { id: 'arm-l', shape: { x: 25, y: 55, w: 14, h: 33, r: 7 } },
  { id: 'arm-r', shape: { x: 81, y: 55, w: 14, h: 33, r: 7 } },
];

const THIGHS = [
  { id: 'thigh-l', shape: { x: 43, y: 120, w: 15, h: 43, r: 7 } },
  { id: 'thigh-r', shape: { x: 62, y: 120, w: 15, h: 43, r: 7 } },
];

const SHINS = [
  { id: 'shin-l', muscle: null, shape: { x: 45, y: 165, w: 12, h: 38, r: 6 } },
  { id: 'shin-r', muscle: null, shape: { x: 63, y: 165, w: 12, h: 38, r: 6 } },
];

const withMuscle = (parts, muscle) => parts.map((p) => ({ ...p, muscle }));

export const FRONT = [
  HEAD, NECK,
  ...withMuscle(SHOULDERS, 'schouders'),
  { id: 'chest', muscle: 'borst', shape: { x: 44, y: 41, w: 32, h: 25, r: 8 } },
  { id: 'abs', muscle: 'core', shape: { x: 46, y: 68, w: 28, h: 32, r: 8 } },
  ...withMuscle(ARMS_UPPER, 'biceps'),
  ...withMuscle(ARMS_LOWER, 'onderarmen'),
  { id: 'hips', muscle: null, shape: { x: 44, y: 102, w: 32, h: 17, r: 8 } },
  ...withMuscle(THIGHS, 'benen'),
  ...SHINS,
];

export const BACK = [
  HEAD, NECK,
  ...withMuscle(SHOULDERS, 'schouders'),
  { id: 'back', muscle: 'rug', shape: { x: 44, y: 41, w: 32, h: 42, r: 8 } },
  ...withMuscle(ARMS_UPPER, 'triceps'),
  ...withMuscle(ARMS_LOWER, 'onderarmen'),
  { id: 'lower-back', muscle: null, shape: { x: 46, y: 85, w: 28, h: 15, r: 7 } },
  { id: 'glutes', muscle: 'bilspieren', shape: { x: 44, y: 102, w: 32, h: 19, r: 9 } },
  ...withMuscle(THIGHS, 'hamstrings'),
  ...SHINS,
];

/** Alle spiergroepen die het silhouet kan tonen. */
export const MAPPED = [...new Set(
  [...FRONT, ...BACK].map((p) => p.muscle).filter(Boolean),
)];

export const VIEWBOX = '0 0 120 210';
