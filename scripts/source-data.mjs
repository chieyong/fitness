/**
 * De bron: het bestaande Workout A/B/C-schema met de geschiedenis tot en met
 * 13 september 2026. Hieruit genereert scripts/generate-seed.mjs de SQL.
 *
 * Lognotatie uit de oorspronkelijke aantekeningen is "reps x gewicht":
 * "10x14" = 10 herhalingen met 14 kg.
 *
 * Aannames bij inconsistenties in de brondata staan in ASSUMPTIONS onderaan.
 */

export const templates = [
  {
    label: 'Workout A',
    position: 0,
    exercises: [
      { name: 'Bankdrukken', muscles: ['borst', 'triceps'], sets: 4, reps: 10,
        notes: 'Barbell of dumbbell' },
      { name: 'Gebogen rij', muscles: ['rug', 'biceps'], sets: 4, reps: 8,
        notes: 'Barbell, dumbbell of cable; twee uitvoeringen (version 1 / version 2)' },
      { name: 'Schouderpers', muscles: ['schouders', 'triceps'], sets: 3, reps: 10,
        notes: 'Barbell of dumbbell' },
      { name: 'Beenpers of squats', muscles: ['benen', 'bilspieren'], sets: 3, reps: 10 },
      { name: 'Bicepscurls', muscles: ['biceps'], sets: 3, reps: 12 },
      { name: 'Triceps pushdown of dips', muscles: ['triceps'], sets: 3, reps: 12 },
      { name: 'Plank', muscles: ['core'], sets: 3, seconds: 30, secondsMax: 45 },
      { name: 'Hanging leg raises of buikspier crunch', muscles: ['core'], sets: 3, reps: 15 },
    ],
  },
  {
    label: 'Workout B',
    position: 1,
    exercises: [
      { name: 'Beenpers of squats', muscles: ['benen', 'bilspieren'], sets: 4, reps: 8, repsMax: 10 },
      { name: 'Lat pulldown of pull-ups', muscles: ['rug', 'biceps'], sets: 4, reps: 8, repsMax: 10 },
      { name: 'Incline dumbbell press', muscles: ['borst', 'schouders', 'triceps'], sets: 3, reps: 10 },
      { name: 'Romanian deadlift', muscles: ['hamstrings', 'rug'], sets: 3, reps: 10 },
      { name: 'Hammer curls', muscles: ['biceps', 'onderarmen'], sets: 3, reps: 12 },
      { name: 'Skull crushers of overhead triceps extension', muscles: ['triceps'], sets: 3, reps: 12 },
      { name: 'Russian twists', muscles: ['core'], sets: 3, reps: 20 },
      { name: 'Cable woodchoppers of side plank', muscles: ['core'], sets: 3, seconds: 30,
        targetNote: 'per kant' },
    ],
  },
  {
    label: 'Workout C',
    position: 2,
    exercises: [
      { name: 'Deadlifts', muscles: ['rug', 'hamstrings', 'bilspieren'], sets: 4, reps: 6, repsMax: 8 },
      { name: 'Schouderpers', muscles: ['schouders', 'triceps'], sets: 3, reps: 10 },
      { name: 'Gebogen rij', muscles: ['rug', 'biceps'], sets: 3, reps: 10 },
      { name: 'Uitvalspassen', muscles: ['benen', 'bilspieren'], sets: 3, reps: 12,
        targetNote: 'per been' },
      { name: 'Concentration curls', muscles: ['biceps'], sets: 3, reps: 12 },
      { name: 'Close-grip bankdrukken', muscles: ['triceps', 'borst'], sets: 3, reps: 10,
        notes: 'Ook met dumbbells' },
      { name: 'Ab wheel of decline crunches', muscles: ['core'], sets: 3, reps: 15 },
      { name: 'Plank met schouder taps', muscles: ['core'], sets: 3, reps: 20 },
    ],
  },
];

/** Sets zijn [reps, gewicht_kg]; 'niet gedaan' wordt een overgeslagen regel. */
const SKIP = 'niet gedaan';

export const history = [
  {
    date: '2026-09-03', template: 'Workout C',
    logs: {
      'Deadlifts': SKIP,
      'Schouderpers': [[10, 12], [7, 14], [7, 12], [8, 12]],
      'Gebogen rij': [[10, 10], [10, 12], [10, 14]],
      'Uitvalspassen': SKIP,
      'Concentration curls': [[10, 12], [8, 12], [10, 10]],
      'Close-grip bankdrukken': [[10, 10], [10, 12], [10, 12]],
      'Ab wheel of decline crunches': SKIP,
      'Plank met schouder taps': SKIP,
    },
  },
  {
    date: '2026-09-05', template: 'Workout A',
    logs: {
      'Bankdrukken': [[10, 14], [10, 12], [10, 12]],
      'Gebogen rij': [[8, 12], [8, 12], [8, 12], [8, 12]],
      'Schouderpers': { sets: [[10, 12], [10, 12], [10, 12]], note: 'Ging net!' },
      'Beenpers of squats': [[10, 59], [10, 66], [12, 66]],
      'Bicepscurls': [[10, 10], [10, 10], [10, 10]],
      'Triceps pushdown of dips': [[12, 18], [6, 22.5], [12, 20.3], [12, 20.3]],
      'Plank': SKIP,
      'Hanging leg raises of buikspier crunch': SKIP,
    },
  },
  {
    date: '2026-09-08', template: 'Workout B',
    logs: {
      'Beenpers of squats': [[10, 73], [10, 73], [10, 73]],
      'Lat pulldown of pull-ups': [[6, 59], [8, 52], [8, 52], [8, 52]],
      'Incline dumbbell press': [[10, 12], [10, 14], [10, 14], [8, 14]],
      'Romanian deadlift': SKIP,
      'Hammer curls': [[10, 12], [10, 12], [10, 12]],
      'Skull crushers of overhead triceps extension': [[10, 23], [10, 27], [12, 27]],
      'Russian twists': SKIP,
      'Cable woodchoppers of side plank': SKIP,
    },
  },
  {
    date: '2026-09-11', template: 'Workout C',
    logs: {
      'Deadlifts': SKIP,
      'Schouderpers': [[10, 14], [10, 14]],
      'Gebogen rij': [[10, 14], [10, 16], [10, 18]],
      'Uitvalspassen': SKIP,
      'Concentration curls': [[10, 12], [10, 12]],
      'Close-grip bankdrukken': [[10, 14], [10, 14], [10, 14]],
      'Ab wheel of decline crunches': SKIP,
      'Plank met schouder taps': SKIP,
    },
  },
  {
    date: '2026-09-13', template: 'Workout A',
    logs: {
      'Bankdrukken': [[10, 14], [10, 16], [10, 16], [8, 16]],
      'Gebogen rij': [[8, 14], [8, 14], [8, 14], [8, 16]],
      'Schouderpers': [[10, 14], [9, 12], [5, 12]],
      'Beenpers of squats': [[10, 79], [10, 79], [10, 79]],
      'Bicepscurls': [[12, 12], [12, 12], [12, 12]],
      'Triceps pushdown of dips': [[12, 32], [12, 36], [12, 36]],
    },
  },
];

export { SKIP };

/** Wat ik heb moeten interpreteren. Corrigeer hier en draai het script opnieuw. */
export const ASSUMPTIONS = [
  'Datums zijn dag/maand/jaar gelezen: 5/9/2026 = 5 september 2026.',
  '"3/11/26" bij Concentration curls en Close-grip bankdrukken gelezen als 3/9/26 — de rest van die Workout C-sessie staat op 3/9 en 3 november ligt in de toekomst.',
  'Lat pulldown 8/9: "6x59, 8x52x 8x52, 8,52" gelezen als vier sets 6x59, 8x52, 8x52, 8x52.',
  'Triceps pushdown 5/9: komma als decimaalteken, dus 22,5 = 22.5 kg en 20,3 = 20.3 kg (ook "20.3" komt voor).',
  'Hanging leg raises heeft geen target in de bron; voorlopig 3x15 aangehouden.',
  'Plank en Hanging leg raises zijn op 13/9 niet genoemd: geen regel aangemaakt (niet als overgeslagen geteld).',
  'Schouderpers (A en C), Beenpers of squats (A en B) en Gebogen rij (A en C) zijn telkens één oefening die in meerdere schema\'s terugkomt; de logs vormen per oefening één doorlopende reeks. Targets mogen per schema verschillen.',
  'Oefeningen met "X of Y" zijn als één oefening bewaard, zodat de loggeschiedenis aaneengesloten blijft.',
  'Video-URLs voor Gebogen rij staan niet in de bron en zijn leeggelaten.',
];
