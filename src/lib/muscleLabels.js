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

export const MUSCLE_LABELS_EN = {
  trapezius: 'trapezius',
  'upper-back': 'upper back',
  'lower-back': 'lower back',
  chest: 'chest',
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'forearms',
  'back-deltoids': 'rear shoulders',
  'front-deltoids': 'front shoulders',
  abs: 'abs',
  obliques: 'obliques',
  adductor: 'adductors',
  abductors: 'abductors',
  hamstring: 'hamstrings',
  quadriceps: 'quadriceps',
  calves: 'calves',
  gluteal: 'glutes',
};

/** Onbekende sleutels tonen we ongewijzigd in plaats van te verbergen. */
export function muscleLabel(key, locale = 'nl') {
  const labels = locale === 'en' ? MUSCLE_LABELS_EN : MUSCLE_LABELS;
  return labels[key] ?? key;
}

/** Welke spieren het silhouet kan tonen. */
export const KNOWN_MUSCLES = Object.keys(MUSCLE_LABELS);
