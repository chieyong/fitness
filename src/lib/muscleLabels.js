/**
 * De spiersleutels zijn die van react-body-highlighter -- dat is de canonieke
 * naam waarop het silhouet zijn regio's kent. De app toont Nederlandse labels.
 */
export const MUSCLE_LABELS = {
  trapezius: 'trapezius',
  'upper-back': 'bovenrug',
  'lower-back': 'onderrug',
  chest: 'borst',
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'onderarmen',
  'back-deltoids': 'achterste schouder',
  'front-deltoids': 'voorste schouder',
  abs: 'buikspieren',
  obliques: 'schuine buikspieren',
  adductor: 'adductoren',
  abductors: 'abductoren',
  hamstring: 'hamstrings',
  quadriceps: 'quadriceps',
  calves: 'kuiten',
  gluteal: 'bilspieren',
};

/** Onbekende sleutels tonen we ongewijzigd in plaats van te verbergen. */
export function muscleLabel(key) {
  return MUSCLE_LABELS[key] ?? key;
}

/** Welke spieren het silhouet kan tonen. */
export const KNOWN_MUSCLES = Object.keys(MUSCLE_LABELS);
