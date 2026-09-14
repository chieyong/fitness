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
