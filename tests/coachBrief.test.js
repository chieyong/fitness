import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coachBrief, briefWindow, plannedMusclesPerWeek } from '../src/lib/coachBrief.js';

// Vrijdag 13 november 2026; de lopende week begint op maandag 9 november.
const TODAY = '2026-11-13';

const exercises = [
  { id: 'bench', name: 'Bankdrukken', catalog_key: 'bankdrukken', muscle_groups: ['chest'] },
  { id: 'row', name: 'Gebogen rij', catalog_key: 'gebogen-rij', muscle_groups: ['upper-back'] },
  { id: 'plank', name: 'Plank', catalog_key: 'plank', muscle_groups: ['abs'] },
  { id: 'crunch', name: 'Crunches', catalog_key: 'crunches', muscle_groups: ['abs'] },
];

const session = (id, date, status = 'voltooid') =>
  ({ id, template_id: 'a', planned_date: date, actual_date: date, status });

/** Eén oefening in één sessie: `count` sets met hetzelfde getal. */
const sets = (sessionId, exerciseId, count, fields) =>
  Array.from({ length: count }, (_, i) => ({
    session_id: sessionId, exercise_id: exerciseId, set_number: i + 1,
    reps: null, weight_kg: null, seconds: null, skipped: false, ...fields,
  }));

test('het venster loopt over afgeronde weken, de lopende week telt niet mee', () => {
  const w = briefWindow(TODAY, 8);
  assert.equal(w.from, '2026-09-14');
  assert.equal(w.to, '2026-11-08');          // zondag vóór de lopende week
  assert.equal(w.earlier.to, '2026-10-11');  // de twee helften sluiten op elkaar aan
  assert.equal(w.recent.from, '2026-10-12');
});

test('trouw aan het schema: afgerond, overgeslagen en blijven staan apart', () => {
  const sessions = [
    session('s1', '2026-10-13'),
    session('s2', '2026-10-15'),
    session('s3', '2026-10-17', 'overgeslagen'),
    session('s4', '2026-10-20', 'gepland'),
    session('s5', '2026-08-04'),               // vóór het venster
  ];
  const { adherence } = coachBrief({ sessions, exercises, today: TODAY });

  assert.deepEqual(
    { completed: adherence.completed, skipped: adherence.skipped, open: adherence.open },
    { completed: 2, skipped: 1, open: 1 },
  );
  assert.equal(adherence.perWeek, 0.3);        // 2 trainingen over 8 weken
});

test('sets per week tellen naar rol, niet rauw', () => {
  // Bankdrukken: borst primair (x1), triceps en voorste schouder secundair (x0,5).
  const sessions = [session('s1', '2026-10-13')];
  const logs = sets('s1', 'bench', 4, { reps: 8, weight_kg: 60 });
  const { muscles } = coachBrief({ logs, sessions, exercises, today: TODAY, weeks: 4 });

  const of = (m) => muscles.find((x) => x.muscle === m).setsPerWeek;
  assert.equal(of('chest'), 1);                 // 4 sets x 1,0 / 4 weken
  assert.equal(of('triceps'), 0.5);             // 4 sets x 0,5 / 4 weken
  assert.equal(of('front-deltoids'), 0.5);
  assert.equal(of('quadriceps'), 0);
});

test('de twee helften laten zien of het oploopt of inzakt', () => {
  const sessions = [session('s1', '2026-09-15'), session('s2', '2026-10-20')];
  const logs = [
    ...sets('s1', 'bench', 2, { reps: 8, weight_kg: 60 }),
    ...sets('s2', 'bench', 6, { reps: 8, weight_kg: 60 }),
  ];
  const chest = coachBrief({ logs, sessions, exercises, today: TODAY })
    .muscles.find((m) => m.muscle === 'chest');

  assert.equal(chest.earlierPerWeek, 0.5);      // 2 sets over 4 weken
  assert.equal(chest.recentPerWeek, 1.5);       // 6 sets over 4 weken
  assert.equal(chest.change, 1);
});

test('gepland per week komt uit je schema, niet uit je logboek', () => {
  const templates = [{ id: 'a', label: 'Workout A', active: true }, { id: 'b', label: 'Workout B', active: true }];
  const templateExercises = [
    { template_id: 'a', exercise_id: 'bench', target_sets: 4 },
    { template_id: 'b', exercise_id: 'row', target_sets: 3 },
  ];
  const planned = plannedMusclesPerWeek(templates, templateExercises, exercises, { training_days: [2, 4, 6] });

  // Drie trainingsdagen, twee workouts: elke workout komt 1,5 keer per week langs.
  assert.equal(planned.get('chest'), 6);        // 4 x 1,0 x 1,5
  assert.equal(planned.get('triceps'), 3);      // 4 x 0,5 x 1,5
  assert.equal(planned.get('upper-back'), 4.5); // 3 x 1,0 x 1,5
});

test('een spier die in geen enkele workout voorkomt is iets anders dan een spier die je liet liggen', () => {
  const templates = [{ id: 'a', label: 'Workout A', active: true }];
  const templateExercises = [{ template_id: 'a', exercise_id: 'bench', target_sets: 4 }];
  const sessions = [session('s1', '2026-10-13')];
  const logs = sets('s1', 'bench', 1, { reps: 8, weight_kg: 60 });

  const brief = coachBrief({
    logs, sessions, exercises, templates, templateExercises, today: TODAY,
  });

  assert.ok(brief.missing.includes('calves'));      // staat nergens gepland
  assert.ok(!brief.neglected.includes('calves'));   // dus geen verwijt
  assert.ok(brief.neglected.includes('chest'));     // wel gepland, te weinig gedaan
});

test('per oefening: beginstand, eindstand en het verschil, in de eigen maat', () => {
  const sessions = [
    session('s1', '2026-09-15'), session('s2', '2026-10-13'), session('s3', '2026-11-03'),
  ];
  const logs = [
    ...sets('s1', 'bench', 3, { reps: 8, weight_kg: 60 }),
    ...sets('s2', 'bench', 3, { reps: 8, weight_kg: 65 }),
    ...sets('s3', 'bench', 3, { reps: 8, weight_kg: 70 }),
    ...sets('s1', 'plank', 2, { seconds: 40 }),
    ...sets('s3', 'plank', 2, { seconds: 55 }),
    ...sets('s1', 'crunch', 2, { reps: 15 }),
    ...sets('s3', 'crunch', 2, { reps: 20 }),
  ];
  const { exercises: lines } = coachBrief({ logs, sessions, exercises, today: TODAY });
  const line = (name) => lines.find((e) => e.name === name);

  assert.deepEqual(
    { unit: line('Bankdrukken').unit, change: line('Bankdrukken').change, sessions: line('Bankdrukken').sessions },
    { unit: 'kg', change: 10, sessions: 3 },
  );
  // Seconden en herhalingen zijn ook maten: zonder die twee zou een plank of
  // een crunch nooit vooruitgang laten zien.
  assert.deepEqual({ unit: line('Plank').unit, change: line('Plank').change }, { unit: 'sec', change: 15 });
  assert.deepEqual({ unit: line('Crunches').unit, change: line('Crunches').change }, { unit: 'reps', change: 5 });
});

test('plateau: weken sinds je laatste beste prestatie, en pas vanaf drie keer doen', () => {
  const sessions = [
    session('s1', '2026-09-15'), session('s2', '2026-09-22'),
    session('s3', '2026-09-29'), session('s4', '2026-11-03'),
  ];
  const stuck = ['s1', 's2', 's3', 's4'].flatMap((id) => sets(id, 'bench', 3, { reps: 8, weight_kg: 60 }));
  const line = (logs) => coachBrief({ logs, sessions, exercises, today: TODAY }).exercises[0];

  // Vier keer hetzelfde gewicht: de beste prestatie staat op de eerste keer.
  assert.equal(line(stuck).best.date, '2026-09-15');
  assert.equal(line(stuck).weeksSinceBest, 7);
  assert.equal(line(stuck).plateau, true);

  // Dezelfde reeks, maar de laatste keer een kilo erbij: geen plateau.
  const progressing = [
    ...stuck.filter((l) => l.session_id !== 's4'),
    ...sets('s4', 'bench', 3, { reps: 8, weight_kg: 61 }),
  ];
  assert.equal(line(progressing).plateau, false);
  assert.equal(line(progressing).weeksSinceBest, 0);

  // Eén keer gedaan is geen plateau, hoe lang geleden ook.
  const once = sets('s1', 'bench', 3, { reps: 8, weight_kg: 60 });
  assert.equal(line(once).plateau, false);
});

test('sterren en toelichtingen reizen mee, nieuwste eerst', () => {
  const sessions = [session('s1', '2026-09-15'), session('s2', '2026-10-20')];
  const logs = [
    ...sets('s1', 'bench', 3, { reps: 8, weight_kg: 60 }),
    ...sets('s2', 'bench', 3, { reps: 8, weight_kg: 62 }),
  ];
  const feedback = [
    { session_id: 's1', exercise_id: 'bench', rating: 4, comment: 'Voelde licht' },
    { session_id: 's2', exercise_id: 'bench', rating: 2, comment: 'Laatste set met hulp' },
  ];
  const line = coachBrief({ logs, sessions, exercises, feedback, today: TODAY }).exercises[0];

  assert.equal(line.rating, 3);
  assert.deepEqual(line.comments.map((c) => c.comment), ['Laatste set met hulp', 'Voelde licht']);
});

test('overgeslagen oefeningen zijn geen werk', () => {
  const sessions = [session('s1', '2026-10-13')];
  const logs = sets('s1', 'bench', 1, { skipped: true });
  const brief = coachBrief({ logs, sessions, exercises, today: TODAY });

  assert.equal(brief.exercises.length, 0);
  assert.equal(brief.muscles.find((m) => m.muscle === 'chest').setsPerWeek, 0);
});

test('zonder trainingen in het venster is het briefje leeg, niet kapot', () => {
  const brief = coachBrief({ sessions: [session('s1', '2026-01-06')], exercises, today: TODAY });

  assert.equal(brief.empty, true);
  assert.deepEqual(brief.exercises, []);
  assert.equal(brief.totals.sets, 0);
});
