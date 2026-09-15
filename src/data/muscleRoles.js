/**
 * Hoe zwaar elke oefening elke spiergroep belast: primair, secundair, tertiair.
 * Notatie: 'primair | secundair | tertiair', spieren met spaties gescheiden.
 * Sleutels zijn die van de bibliotheek (catalog.js); ALIASES koppelt namen uit
 * het programma die geen bibliotheeknaam zijn.
 */
export const ROLE_SPECS = {
  // Borst
  'bankdrukken': 'chest | triceps front-deltoids',
  'dumbbell-bankdrukken': 'chest | triceps front-deltoids',
  'incline-dumbbell-press': 'chest | front-deltoids | triceps',
  'dumbbell-flyes': 'chest | front-deltoids',
  'chest-press-machine': 'chest | triceps front-deltoids',
  'cable-crossover': 'chest | front-deltoids',
  'pec-deck': 'chest',
  'push-ups': 'chest | triceps front-deltoids | abs',
  'dips': 'chest triceps | front-deltoids',
  'incline-push-ups': 'chest | triceps | front-deltoids',

  // Rug
  'gebogen-rij': 'upper-back | trapezius back-deltoids biceps | forearm lower-back',
  'eenarmige-dumbbell-rij': 'upper-back | back-deltoids biceps | forearm',
  'deadlift': 'lower-back gluteal hamstring | trapezius quadriceps | forearm upper-back',
  'good-morning': 'hamstring lower-back | gluteal',
  'shrugs': 'trapezius | | forearm',
  'lat-pulldown': 'upper-back | biceps back-deltoids | forearm',
  'seated-cable-row': 'upper-back | trapezius biceps back-deltoids | forearm',
  'face-pull': 'back-deltoids | trapezius upper-back',
  'hyperextension-machine': 'lower-back | gluteal hamstring',
  'pull-ups': 'upper-back | biceps back-deltoids | forearm abs',
  'chin-ups': 'upper-back biceps | back-deltoids | forearm',
  'inverted-row': 'upper-back | biceps back-deltoids | forearm',
  'back-extension': 'lower-back | gluteal hamstring',
  'superman': 'lower-back | gluteal | hamstring',
  'y-t-w-raises': 'back-deltoids trapezius | upper-back',

  // Schouders
  'schouderpers': 'front-deltoids | triceps | trapezius',
  'arnold-press': 'front-deltoids | triceps | trapezius',
  'lateral-raises': 'front-deltoids | trapezius',
  'front-raises': 'front-deltoids | | chest',
  'reverse-flyes': 'back-deltoids | upper-back trapezius',
  'shoulder-press-machine': 'front-deltoids | triceps',
  'cable-lateral-raise': 'front-deltoids | | trapezius',
  'reverse-pec-deck': 'back-deltoids | upper-back trapezius',
  'pike-push-ups': 'front-deltoids | triceps | chest',
  'handstand-tegen-muur': 'front-deltoids | triceps trapezius | abs',

  // Biceps
  'bicepscurls': 'biceps | forearm',
  'hammer-curls': 'biceps forearm',
  'concentration-curls': 'biceps',
  'barbell-curl': 'biceps | forearm',
  'cable-curl': 'biceps | | forearm',
  'preacher-curl-machine': 'biceps',

  // Triceps
  'triceps-pushdown': 'triceps',
  'overhead-cable-extension': 'triceps',
  'skull-crushers': 'triceps',
  'overhead-triceps-extension': 'triceps',
  'close-grip-bankdrukken': 'triceps | chest front-deltoids',
  'triceps-kickback': 'triceps',
  'bench-dips': 'triceps | front-deltoids | chest',
  'diamond-push-ups': 'triceps | chest | front-deltoids',

  // Onderarmen
  'wrist-curls': 'forearm',
  'reverse-curls': 'forearm | biceps',
  'farmers-walk': 'forearm trapezius | | abs',
  'dead-hang': 'forearm | upper-back',

  // Buik
  'plank': 'abs | obliques | lower-back',
  'side-plank': 'obliques | abs',
  'crunches': 'abs',
  'hanging-leg-raises': 'abs | obliques | forearm',
  'russian-twists': 'obliques | abs',
  'dead-bug': 'abs | obliques',
  'bicycle-crunches': 'obliques abs',
  'mountain-climbers': 'abs | obliques | quadriceps front-deltoids',
  'russian-twists-gewicht': 'obliques | abs',
  'cable-crunch': 'abs | obliques',
  'cable-woodchopper': 'obliques | abs | front-deltoids',
  'crunch-machine': 'abs',

  // Benen
  'squat': 'quadriceps gluteal | hamstring adductor | lower-back',
  'goblet-squat': 'quadriceps gluteal | adductor | abs',
  'uitvalspassen': 'quadriceps gluteal | hamstring | adductor calves',
  'bulgarian-split-squat': 'quadriceps gluteal | hamstring adductor',
  'beenpers': 'quadriceps | gluteal | hamstring adductor',
  'leg-extension': 'quadriceps',
  'squat-zonder-gewicht': 'quadriceps | gluteal | hamstring',
  'wall-sit': 'quadriceps | gluteal',
  'romanian-deadlift': 'hamstring | gluteal lower-back | forearm',
  'leg-curl': 'hamstring | | calves',
  'nordic-hamstring-curl': 'hamstring',
  'hip-thrust': 'gluteal | hamstring | quadriceps',
  'cable-kickback': 'gluteal | hamstring',
  'glute-bridge': 'gluteal | hamstring',
  'kuitheffen-dumbbells': 'calves',
  'kuitheffen-machine': 'calves',
  'kuitheffen': 'calves',
  'sumo-squat': 'adductor gluteal | quadriceps | hamstring',
  'adductor-machine': 'adductor',
  'copenhagen-plank': 'adductor | obliques',
  'abductor-machine': 'abductors | gluteal',
  'heupabductie-kabel': 'abductors | gluteal',
  'zijwaartse-beenheffing': 'abductors | gluteal',
};

/**
 * Namen uit het programma (Nederlands en Engels) die geen bibliotheeknaam zijn:
 * naar een bibliotheeksleutel, of met een eigen verdeling.
 */
export const ALIASES = {
  'beenpers of squats': 'beenpers',
  'leg press or squats': 'beenpers',
  'triceps pushdown of dips': 'triceps | | chest front-deltoids',
  'triceps pushdown or dips': 'triceps | | chest front-deltoids',
  'hanging leg raises of buikspier crunch': 'hanging-leg-raises',
  'hanging leg raises or crunches': 'hanging-leg-raises',
  'lat pulldown of pull-ups': 'lat-pulldown',
  'lat pulldown or pull-ups': 'lat-pulldown',
  'skull crushers of overhead triceps extension': 'skull-crushers',
  'skull crushers or overhead triceps extension': 'skull-crushers',
  'cable woodchoppers of side plank': 'cable-woodchopper',
  'cable woodchoppers or side plank': 'cable-woodchopper',
  'deadlifts': 'deadlift',
  'ab wheel of decline crunches': 'abs | obliques | lower-back',
  'ab wheel or decline crunches': 'abs | obliques | lower-back',
  'plank met schouder taps': 'abs | obliques | front-deltoids',
  'plank with shoulder taps': 'abs | obliques | front-deltoids',
};
