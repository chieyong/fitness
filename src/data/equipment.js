/** Materiaal en meetwijze: de vaste waarden achter de filters en formulieren. */

export const EQUIPMENT = [
  { id: 'losse-gewichten', label: 'Losse gewichten' },
  { id: 'machine', label: 'Machine of kabel' },
  { id: 'zonder', label: 'Zonder hulpmiddelen' },
];

export const MEASURES = [
  { id: 'gewicht', label: "Reps en kilo's" },
  { id: 'reps', label: 'Alleen reps' },
  { id: 'tijd', label: 'Seconden' },
];

export const EQUIPMENT_IDS = EQUIPMENT.map((e) => e.id);
export const MEASURE_IDS = MEASURES.map((m) => m.id);

const LABELS = {
  nl: {
    'losse-gewichten': 'Losse gewichten', machine: 'Machine of kabel', zonder: 'Zonder hulpmiddelen',
    gewicht: "Reps en kilo's", reps: 'Alleen reps', tijd: 'Seconden',
  },
  en: {
    'losse-gewichten': 'Free weights', machine: 'Machine or cable', zonder: 'No equipment',
    gewicht: 'Reps and weight', reps: 'Reps only', tijd: 'Seconds',
  },
};

const labelsFor = (locale) => LABELS[locale] ?? LABELS.nl;

export const equipmentLabel = (id, locale = 'nl') => labelsFor(locale)[id] ?? null;
export const measureLabel = (id, locale = 'nl') => labelsFor(locale)[id] ?? null;
export const equipmentOptions = (locale = 'nl') => EQUIPMENT_IDS.map((id) => ({ id, label: labelsFor(locale)[id] }));
export const measureOptions = (locale = 'nl') => MEASURE_IDS.map((id) => ({ id, label: labelsFor(locale)[id] }));
