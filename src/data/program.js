/**
 * Het trainingsprogramma: schema's, oefeningen, targets en spiergroepen.
 * Bevat bewust géén gelogde trainingen -- dit bestand gaat mee in de publieke
 * bundel, omdat de demo hetzelfde programma gebruikt. De echte geschiedenis
 * staat in scripts/source-data.mjs en blijft buiten de app.
 */

export const templates = [
  {
    label: 'Workout A',
    position: 0,
    exercises: [
      { name: 'Bankdrukken', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['chest', 'triceps', 'front-deltoids'], sets: 4, reps: 10,
        notes: 'Barbell of dumbbell' },
      { name: 'Gebogen rij', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['upper-back', 'trapezius', 'biceps', 'back-deltoids'], sets: 4, reps: 8,
        notes: 'Barbell, dumbbell of cable; twee uitvoeringen (version 1 / version 2)' },
      { name: 'Schouderpers', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['front-deltoids', 'triceps', 'trapezius'], sets: 3, reps: 10,
        notes: 'Barbell of dumbbell' },
      { name: 'Beenpers of squats', equipment: 'machine', measure: 'gewicht', muscles: ['quadriceps', 'gluteal', 'hamstring'], sets: 3, reps: 10 },
      { name: 'Bicepscurls', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['biceps', 'forearm'], sets: 3, reps: 12 },
      { name: 'Triceps pushdown of dips', equipment: 'machine', measure: 'gewicht', muscles: ['triceps'], sets: 3, reps: 12 },
      { name: 'Plank', equipment: 'zonder', measure: 'tijd', muscles: ['abs', 'obliques', 'lower-back'], sets: 3, seconds: 30, secondsMax: 45 },
      { name: 'Hanging leg raises of buikspier crunch', equipment: 'zonder', measure: 'reps', muscles: ['abs', 'obliques'], sets: 3, reps: 15 },
    ],
  },
  {
    label: 'Workout B',
    position: 1,
    exercises: [
      { name: 'Beenpers of squats', equipment: 'machine', measure: 'gewicht', muscles: ['quadriceps', 'gluteal', 'hamstring'], sets: 4, reps: 8, repsMax: 10 },
      { name: 'Lat pulldown of pull-ups', equipment: 'machine', measure: 'gewicht', muscles: ['upper-back', 'biceps', 'back-deltoids'], sets: 4, reps: 8, repsMax: 10 },
      { name: 'Incline dumbbell press', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['chest', 'front-deltoids', 'triceps'], sets: 3, reps: 10 },
      { name: 'Romanian deadlift', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['hamstring', 'gluteal', 'lower-back'], sets: 3, reps: 10 },
      { name: 'Hammer curls', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['biceps', 'forearm'], sets: 3, reps: 12 },
      { name: 'Skull crushers of overhead triceps extension', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['triceps'], sets: 3, reps: 12 },
      { name: 'Russian twists', equipment: 'zonder', measure: 'reps', muscles: ['obliques', 'abs'], sets: 3, reps: 20 },
      { name: 'Cable woodchoppers of side plank', equipment: 'zonder', measure: 'tijd', muscles: ['obliques', 'abs'], sets: 3, seconds: 30,
        targetNote: 'per kant' },
    ],
  },
  {
    label: 'Workout C',
    position: 2,
    exercises: [
      { name: 'Deadlifts', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['lower-back', 'gluteal', 'hamstring', 'trapezius', 'upper-back'], sets: 4, reps: 6, repsMax: 8 },
      { name: 'Schouderpers', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['front-deltoids', 'triceps', 'trapezius'], sets: 3, reps: 10 },
      { name: 'Gebogen rij', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['upper-back', 'trapezius', 'biceps', 'back-deltoids'], sets: 3, reps: 10 },
      { name: 'Uitvalspassen', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['quadriceps', 'gluteal', 'hamstring'], sets: 3, reps: 12,
        targetNote: 'per been' },
      { name: 'Concentration curls', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['biceps'], sets: 3, reps: 12 },
      { name: 'Close-grip bankdrukken', equipment: 'losse-gewichten', measure: 'gewicht', muscles: ['triceps', 'chest', 'front-deltoids'], sets: 3, reps: 10,
        notes: 'Ook met dumbbells' },
      { name: 'Ab wheel of decline crunches', equipment: 'zonder', measure: 'reps', muscles: ['abs', 'obliques'], sets: 3, reps: 15 },
      { name: 'Plank met schouder taps', equipment: 'zonder', measure: 'reps', muscles: ['abs', 'obliques', 'front-deltoids'], sets: 3, reps: 20 },
    ],
  },
];
