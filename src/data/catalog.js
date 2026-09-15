/**
 * De oefeningenbibliotheek waaruit je kiest bij het aanpassen van je schema.
 * Spieren gebruiken de sleutels van het silhouet, belangrijkste spier eerst.
 * Namen die ook in je programma voorkomen zijn exact gelijk gehouden, zodat
 * zo'n oefening als dezelfde wordt herkend en de geschiedenis doorloopt.
 */

/** Engelse namen voor oefeningen waarvan de naam Nederlands is. */
const EN = {
  'bankdrukken': 'Bench press',
  'dumbbell-bankdrukken': 'Dumbbell bench press',
  'gebogen-rij': 'Bent-over row',
  'eenarmige-dumbbell-rij': 'One-arm dumbbell row',
  'schouderpers': 'Shoulder press',
  'bicepscurls': 'Biceps curls',
  'close-grip-bankdrukken': 'Close-grip bench press',
  'squat-zonder-gewicht': 'Bodyweight squat',
  'uitvalspassen': 'Lunges',
  'kuitheffen-dumbbells': 'Dumbbell calf raises',
  'kuitheffen-machine': 'Calf raise (machine)',
  'kuitheffen': 'Calf raises',
  'handstand-tegen-muur': 'Wall handstand',
  'russian-twists-gewicht': 'Weighted Russian twists',
  'heupabductie-kabel': 'Cable hip abduction',
  'zijwaartse-beenheffing': 'Side-lying leg raise',
};

const e = (key, name, muscles, equipment, measure) => ({ key, name, en: EN[key], muscles, equipment, measure });

export const CATALOG = [
  // Borst
  e('bankdrukken', 'Bankdrukken', ['chest', 'triceps', 'front-deltoids'], 'losse-gewichten', 'gewicht'),
  e('dumbbell-bankdrukken', 'Dumbbell bankdrukken', ['chest', 'triceps', 'front-deltoids'], 'losse-gewichten', 'gewicht'),
  e('incline-dumbbell-press', 'Incline dumbbell press', ['chest', 'front-deltoids', 'triceps'], 'losse-gewichten', 'gewicht'),
  e('dumbbell-flyes', 'Dumbbell flyes', ['chest', 'front-deltoids'], 'losse-gewichten', 'gewicht'),
  e('chest-press-machine', 'Chest press (machine)', ['chest', 'triceps', 'front-deltoids'], 'machine', 'gewicht'),
  e('cable-crossover', 'Cable crossover', ['chest', 'front-deltoids'], 'machine', 'gewicht'),
  e('pec-deck', 'Pec deck', ['chest'], 'machine', 'gewicht'),
  e('push-ups', 'Push-ups', ['chest', 'triceps', 'front-deltoids'], 'zonder', 'reps'),
  e('dips', 'Dips', ['chest', 'triceps', 'front-deltoids'], 'zonder', 'reps'),
  e('incline-push-ups', 'Incline push-ups', ['chest', 'triceps'], 'zonder', 'reps'),

  // Rug
  e('gebogen-rij', 'Gebogen rij', ['upper-back', 'trapezius', 'biceps', 'back-deltoids'], 'losse-gewichten', 'gewicht'),
  e('eenarmige-dumbbell-rij', 'Eenarmige dumbbell rij', ['upper-back', 'biceps', 'back-deltoids'], 'losse-gewichten', 'gewicht'),
  e('deadlift', 'Deadlift', ['lower-back', 'gluteal', 'hamstring', 'trapezius'], 'losse-gewichten', 'gewicht'),
  e('good-morning', 'Good morning', ['lower-back', 'hamstring'], 'losse-gewichten', 'gewicht'),
  e('shrugs', 'Shrugs', ['trapezius'], 'losse-gewichten', 'gewicht'),
  e('lat-pulldown', 'Lat pulldown', ['upper-back', 'biceps', 'back-deltoids'], 'machine', 'gewicht'),
  e('seated-cable-row', 'Seated cable row', ['upper-back', 'trapezius', 'biceps'], 'machine', 'gewicht'),
  e('face-pull', 'Face pull', ['back-deltoids', 'trapezius'], 'machine', 'gewicht'),
  e('hyperextension-machine', 'Hyperextension (machine)', ['lower-back', 'gluteal'], 'machine', 'gewicht'),
  e('pull-ups', 'Pull-ups', ['upper-back', 'biceps', 'forearm'], 'zonder', 'reps'),
  e('chin-ups', 'Chin-ups', ['upper-back', 'biceps'], 'zonder', 'reps'),
  e('inverted-row', 'Inverted row', ['upper-back', 'biceps', 'back-deltoids'], 'zonder', 'reps'),
  e('back-extension', 'Back extension', ['lower-back', 'gluteal', 'hamstring'], 'zonder', 'reps'),
  e('superman', 'Superman', ['lower-back', 'gluteal'], 'zonder', 'tijd'),
  e('y-t-w-raises', 'Y-T-W raises', ['trapezius', 'back-deltoids'], 'zonder', 'reps'),

  // Schouders
  e('schouderpers', 'Schouderpers', ['front-deltoids', 'triceps', 'trapezius'], 'losse-gewichten', 'gewicht'),
  e('arnold-press', 'Arnold press', ['front-deltoids', 'triceps'], 'losse-gewichten', 'gewicht'),
  e('lateral-raises', 'Lateral raises', ['front-deltoids', 'trapezius'], 'losse-gewichten', 'gewicht'),
  e('front-raises', 'Front raises', ['front-deltoids'], 'losse-gewichten', 'gewicht'),
  e('reverse-flyes', 'Reverse flyes', ['back-deltoids', 'upper-back'], 'losse-gewichten', 'gewicht'),
  e('shoulder-press-machine', 'Shoulder press (machine)', ['front-deltoids', 'triceps'], 'machine', 'gewicht'),
  e('cable-lateral-raise', 'Cable lateral raise', ['front-deltoids'], 'machine', 'gewicht'),
  e('reverse-pec-deck', 'Reverse pec deck', ['back-deltoids', 'upper-back'], 'machine', 'gewicht'),
  e('pike-push-ups', 'Pike push-ups', ['front-deltoids', 'triceps'], 'zonder', 'reps'),
  e('handstand-tegen-muur', 'Handstand tegen de muur', ['front-deltoids', 'triceps', 'trapezius'], 'zonder', 'tijd'),

  // Biceps
  e('bicepscurls', 'Bicepscurls', ['biceps', 'forearm'], 'losse-gewichten', 'gewicht'),
  e('hammer-curls', 'Hammer curls', ['biceps', 'forearm'], 'losse-gewichten', 'gewicht'),
  e('concentration-curls', 'Concentration curls', ['biceps'], 'losse-gewichten', 'gewicht'),
  e('barbell-curl', 'Barbell curl', ['biceps', 'forearm'], 'losse-gewichten', 'gewicht'),
  e('cable-curl', 'Cable curl', ['biceps'], 'machine', 'gewicht'),
  e('preacher-curl-machine', 'Preacher curl (machine)', ['biceps'], 'machine', 'gewicht'),

  // Triceps
  e('triceps-pushdown', 'Triceps pushdown', ['triceps'], 'machine', 'gewicht'),
  e('overhead-cable-extension', 'Overhead cable extension', ['triceps'], 'machine', 'gewicht'),
  e('skull-crushers', 'Skull crushers', ['triceps'], 'losse-gewichten', 'gewicht'),
  e('overhead-triceps-extension', 'Overhead triceps extension', ['triceps'], 'losse-gewichten', 'gewicht'),
  e('close-grip-bankdrukken', 'Close-grip bankdrukken', ['triceps', 'chest', 'front-deltoids'], 'losse-gewichten', 'gewicht'),
  e('triceps-kickback', 'Triceps kickback', ['triceps'], 'losse-gewichten', 'gewicht'),
  e('bench-dips', 'Bench dips', ['triceps', 'front-deltoids'], 'zonder', 'reps'),
  e('diamond-push-ups', 'Diamond push-ups', ['triceps', 'chest'], 'zonder', 'reps'),

  // Onderarmen
  e('wrist-curls', 'Wrist curls', ['forearm'], 'losse-gewichten', 'gewicht'),
  e('reverse-curls', 'Reverse curls', ['forearm', 'biceps'], 'losse-gewichten', 'gewicht'),
  e('farmers-walk', "Farmer's walk", ['forearm', 'trapezius'], 'losse-gewichten', 'tijd'),
  e('dead-hang', 'Dead hang', ['forearm', 'upper-back'], 'zonder', 'tijd'),

  // Buik
  e('plank', 'Plank', ['abs', 'obliques', 'lower-back'], 'zonder', 'tijd'),
  e('side-plank', 'Side plank', ['obliques', 'abs'], 'zonder', 'tijd'),
  e('crunches', 'Crunches', ['abs'], 'zonder', 'reps'),
  e('hanging-leg-raises', 'Hanging leg raises', ['abs', 'obliques'], 'zonder', 'reps'),
  e('russian-twists', 'Russian twists', ['obliques', 'abs'], 'zonder', 'reps'),
  e('dead-bug', 'Dead bug', ['abs'], 'zonder', 'reps'),
  e('bicycle-crunches', 'Bicycle crunches', ['obliques', 'abs'], 'zonder', 'reps'),
  e('mountain-climbers', 'Mountain climbers', ['abs', 'obliques', 'quadriceps'], 'zonder', 'tijd'),
  e('russian-twists-gewicht', 'Russian twists met gewicht', ['obliques', 'abs'], 'losse-gewichten', 'gewicht'),
  e('cable-crunch', 'Cable crunch', ['abs'], 'machine', 'gewicht'),
  e('cable-woodchopper', 'Cable woodchopper', ['obliques', 'abs'], 'machine', 'gewicht'),
  e('crunch-machine', 'Crunch (machine)', ['abs'], 'machine', 'gewicht'),

  // Benen
  e('squat', 'Squat', ['quadriceps', 'gluteal', 'hamstring'], 'losse-gewichten', 'gewicht'),
  e('goblet-squat', 'Goblet squat', ['quadriceps', 'gluteal'], 'losse-gewichten', 'gewicht'),
  e('uitvalspassen', 'Uitvalspassen', ['quadriceps', 'gluteal', 'hamstring'], 'losse-gewichten', 'gewicht'),
  e('bulgarian-split-squat', 'Bulgarian split squat', ['quadriceps', 'gluteal'], 'losse-gewichten', 'gewicht'),
  e('beenpers', 'Beenpers', ['quadriceps', 'gluteal', 'hamstring'], 'machine', 'gewicht'),
  e('leg-extension', 'Leg extension', ['quadriceps'], 'machine', 'gewicht'),
  e('squat-zonder-gewicht', 'Squat zonder gewicht', ['quadriceps', 'gluteal'], 'zonder', 'reps'),
  e('wall-sit', 'Wall sit', ['quadriceps'], 'zonder', 'tijd'),
  e('romanian-deadlift', 'Romanian deadlift', ['hamstring', 'gluteal', 'lower-back'], 'losse-gewichten', 'gewicht'),
  e('leg-curl', 'Leg curl', ['hamstring'], 'machine', 'gewicht'),
  e('nordic-hamstring-curl', 'Nordic hamstring curl', ['hamstring'], 'zonder', 'reps'),
  e('hip-thrust', 'Hip thrust', ['gluteal', 'hamstring'], 'losse-gewichten', 'gewicht'),
  e('cable-kickback', 'Cable kickback', ['gluteal'], 'machine', 'gewicht'),
  e('glute-bridge', 'Glute bridge', ['gluteal', 'hamstring'], 'zonder', 'reps'),
  e('kuitheffen-dumbbells', 'Kuitheffen met dumbbells', ['calves'], 'losse-gewichten', 'gewicht'),
  e('kuitheffen-machine', 'Kuitheffen (machine)', ['calves'], 'machine', 'gewicht'),
  e('kuitheffen', 'Kuitheffen', ['calves'], 'zonder', 'reps'),
  e('sumo-squat', 'Sumo squat', ['adductor', 'gluteal', 'quadriceps'], 'losse-gewichten', 'gewicht'),
  e('adductor-machine', 'Adductor (machine)', ['adductor'], 'machine', 'gewicht'),
  e('copenhagen-plank', 'Copenhagen plank', ['adductor', 'obliques'], 'zonder', 'tijd'),
  e('abductor-machine', 'Abductor (machine)', ['abductors', 'gluteal'], 'machine', 'gewicht'),
  e('heupabductie-kabel', 'Heupabductie (kabel)', ['abductors'], 'machine', 'gewicht'),
  e('zijwaartse-beenheffing', 'Zijwaartse beenheffing', ['abductors', 'gluteal'], 'zonder', 'reps'),
];
