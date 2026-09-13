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
      { name: 'Bankdrukken', muscles: ['chest', 'triceps', 'front-deltoids'], sets: 4, reps: 10,
        notes: 'Barbell of dumbbell' },
      { name: 'Gebogen rij', muscles: ['upper-back', 'trapezius', 'biceps', 'back-deltoids'], sets: 4, reps: 8,
        notes: 'Barbell, dumbbell of cable; twee uitvoeringen (version 1 / version 2)' },
      { name: 'Schouderpers', muscles: ['front-deltoids', 'triceps', 'trapezius'], sets: 3, reps: 10,
        notes: 'Barbell of dumbbell' },
      { name: 'Beenpers of squats', muscles: ['quadriceps', 'gluteal', 'hamstring'], sets: 3, reps: 10 },
      { name: 'Bicepscurls', muscles: ['biceps', 'forearm'], sets: 3, reps: 12 },
      { name: 'Triceps pushdown of dips', muscles: ['triceps'], sets: 3, reps: 12 },
      { name: 'Plank', muscles: ['abs', 'obliques', 'lower-back'], sets: 3, seconds: 30, secondsMax: 45 },
      { name: 'Hanging leg raises of buikspier crunch', muscles: ['abs', 'obliques'], sets: 3, reps: 15 },
    ],
  },
  {
    label: 'Workout B',
    position: 1,
    exercises: [
      { name: 'Beenpers of squats', muscles: ['quadriceps', 'gluteal', 'hamstring'], sets: 4, reps: 8, repsMax: 10 },
      { name: 'Lat pulldown of pull-ups', muscles: ['upper-back', 'biceps', 'back-deltoids'], sets: 4, reps: 8, repsMax: 10 },
      { name: 'Incline dumbbell press', muscles: ['chest', 'front-deltoids', 'triceps'], sets: 3, reps: 10 },
      { name: 'Romanian deadlift', muscles: ['hamstring', 'gluteal', 'lower-back'], sets: 3, reps: 10 },
      { name: 'Hammer curls', muscles: ['biceps', 'forearm'], sets: 3, reps: 12 },
      { name: 'Skull crushers of overhead triceps extension', muscles: ['triceps'], sets: 3, reps: 12 },
      { name: 'Russian twists', muscles: ['obliques', 'abs'], sets: 3, reps: 20 },
      { name: 'Cable woodchoppers of side plank', muscles: ['obliques', 'abs'], sets: 3, seconds: 30,
        targetNote: 'per kant' },
    ],
  },
  {
    label: 'Workout C',
    position: 2,
    exercises: [
      { name: 'Deadlifts', muscles: ['lower-back', 'gluteal', 'hamstring', 'trapezius', 'upper-back'], sets: 4, reps: 6, repsMax: 8 },
      { name: 'Schouderpers', muscles: ['front-deltoids', 'triceps', 'trapezius'], sets: 3, reps: 10 },
      { name: 'Gebogen rij', muscles: ['upper-back', 'trapezius', 'biceps', 'back-deltoids'], sets: 3, reps: 10 },
      { name: 'Uitvalspassen', muscles: ['quadriceps', 'gluteal', 'hamstring'], sets: 3, reps: 12,
        targetNote: 'per been' },
      { name: 'Concentration curls', muscles: ['biceps'], sets: 3, reps: 12 },
      { name: 'Close-grip bankdrukken', muscles: ['triceps', 'chest', 'front-deltoids'], sets: 3, reps: 10,
        notes: 'Ook met dumbbells' },
      { name: 'Ab wheel of decline crunches', muscles: ['abs', 'obliques'], sets: 3, reps: 15 },
      { name: 'Plank met schouder taps', muscles: ['abs', 'obliques', 'front-deltoids'], sets: 3, reps: 20 },
    ],
  },
];
