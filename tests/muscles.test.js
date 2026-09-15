import { test } from 'node:test';
import assert from 'node:assert/strict';
import { muscleTotals, findMuscle, intensities, sortByMetric, busiestBy, intensityBucket, muscleSeries, roundSets } from '../src/lib/muscles.js';

const sessions = [
  { id: 's1', planned_date: '2026-09-05', actual_date: '2026-09-05', status: 'voltooid' },
  { id: 's2', planned_date: '2026-09-13', actual_date: '2026-09-13', status: 'voltooid' },
];

const exercises = [
  // Expliciete rollen: deze tests gaan over het optellen, niet over de verdeling.
  { id: 'bank', name: 'Bank', muscle_roles: { borst: 'primair', triceps: 'primair' } },
  { id: 'curl', name: 'Curl', muscle_roles: { biceps: 'primair' } },
  { id: 'plank', name: 'Plankje', muscle_roles: { core: 'primair' } },
];

const log = (session_id, exercise_id, set_number, reps, weight_kg, extra = {}) =>
  ({ session_id, exercise_id, set_number, reps, weight_kg, seconds: null, skipped: false, ...extra });

const logs = [
  log('s1', 'bank', 1, 10, 10),
  log('s1', 'bank', 2, 10, 10),
  log('s1', 'curl', 1, 10, 5),
  log('s2', 'bank', 1, 10, 20),
  log('s1', 'plank', 1, null, null, { skipped: true }),
];

test('een oefening telt voor elke betrokken spiergroep', () => {
  const t = muscleTotals(logs, sessions, exercises);
  assert.equal(findMuscle(t, 'borst').sets, 3);
  assert.equal(findMuscle(t, 'triceps').sets, 3);       // zelfde oefening, beide groepen
  assert.equal(findMuscle(t, 'biceps').sets, 1);
});

test('volume is reps maal gewicht', () => {
  const t = muscleTotals(logs, sessions, exercises);
  assert.equal(findMuscle(t, 'borst').volume, 10 * 10 + 10 * 10 + 10 * 20);
  assert.equal(findMuscle(t, 'biceps').volume, 50);
});

test('overgeslagen oefeningen tellen niet mee', () => {
  assert.equal(findMuscle(muscleTotals(logs, sessions, exercises), 'core'), null);
});

test('het datumbereik filtert sessies', () => {
  const t = muscleTotals(logs, sessions, exercises, { from: '2026-09-10' });
  assert.equal(findMuscle(t, 'borst').sets, 1);
  assert.equal(findMuscle(t, 'biceps'), null);
});

test('per spiergroep staat welke oefeningen bijdroegen', () => {
  const borst = findMuscle(muscleTotals(logs, sessions, exercises), 'borst');
  assert.equal(borst.byExercise.length, 1);
  assert.equal(borst.byExercise[0].name, 'Bank');
  assert.equal(borst.byExercise[0].sets, 3);
});

test('logs van een onbekende oefening of sessie worden genegeerd', () => {
  const vreemd = [...logs, log('weg', 'bank', 1, 10, 10), log('s1', 'onbekend', 1, 10, 10)];
  assert.equal(findMuscle(muscleTotals(vreemd, sessions, exercises), 'borst').sets, 3);
});

test('intensiteit is relatief aan de drukste groep', () => {
  const t = muscleTotals(logs, sessions, exercises);
  const i = intensities(t, 'sets');
  assert.equal(i.get('borst'), 1);
  assert.ok(Math.abs(i.get('biceps') - 1 / 3) < 1e-9);
});

test('intensiteit valt terug op nul zonder data', () => {
  assert.equal(intensities([], 'sets').size, 0);
  const leeg = intensities([{ muscle: 'borst', sets: 0, volume: 0 }], 'sets');
  assert.equal(leeg.get('borst'), 0);
});

test('sets en volume kunnen een andere rangorde geven', () => {
  // Precies het probleem met kg tussen spiergroepen: één zware set beenwerk
  // weegt zwaarder dan drie sets armwerk.
  const ex = [
    { id: 'been', name: 'Been', muscle_roles: { benen: 'primair' } },
    { id: 'curl', name: 'Krul', muscle_roles: { biceps: 'primair' } },
  ];
  const l = [
    log('s1', 'been', 1, 10, 80),
    log('s1', 'curl', 1, 10, 10),
    log('s1', 'curl', 2, 10, 10),
    log('s1', 'curl', 3, 10, 10),
  ];
  const t = muscleTotals(l, sessions, ex);
  assert.equal(t[0].muscle, 'biceps');                       // op sets
  assert.ok(findMuscle(t, 'benen').volume > findMuscle(t, 'biceps').volume); // op kg
});

test('de drukste groep volgt de gekozen maat', () => {
  const ex = [
    { id: 'been', name: 'Been', muscle_roles: { benen: 'primair' } },
    { id: 'curl', name: 'Krul', muscle_roles: { biceps: 'primair' } },
  ];
  const l = [
    log('s1', 'been', 1, 10, 80),
    log('s1', 'curl', 1, 10, 10),
    log('s1', 'curl', 2, 10, 10),
    log('s1', 'curl', 3, 10, 10),
  ];
  const t = muscleTotals(l, sessions, ex);
  assert.equal(busiestBy(t, 'sets').muscle, 'biceps');
  assert.equal(busiestBy(t, 'volume').muscle, 'benen');
  assert.equal(sortByMetric(t, 'volume')[0].muscle, 'benen');
  assert.equal(busiestBy([], 'sets'), null);
});

test('intensiteit valt in de juiste stap van de schaal', () => {
  assert.equal(intensityBucket(0), 0);
  assert.equal(intensityBucket(null), 0);
  assert.equal(intensityBucket(0.01), 1);
  assert.equal(intensityBucket(0.2), 1);
  assert.equal(intensityBucket(0.21), 2);
  assert.equal(intensityBucket(1), 5);
  assert.equal(intensityBucket(1.5), 5);      // nooit buiten de schaal
});

test('muscleSeries geeft één punt per training voor die spiergroep', () => {
  const r = muscleSeries(logs, sessions, exercises, 'borst');
  assert.deepEqual(r.map((p) => p.date), ['2026-09-05', '2026-09-13']);
  assert.equal(r[0].sets, 2);                    // twee sets bankdrukken op 5/9
  assert.equal(r[1].sets, 1);
  assert.equal(r[0].volume, 200);
});

test('muscleSeries telt meerdere oefeningen binnen dezelfde training op', () => {
  const ex = [
    { id: 'a', name: 'A', muscle_roles: { triceps: 'primair' } },
    { id: 'b', name: 'B', muscle_roles: { triceps: 'primair' } },
  ];
  const l = [
    log('s1', 'a', 1, 10, 10),
    log('s1', 'a', 2, 10, 10),
    log('s1', 'b', 1, 10, 20),
  ];
  const r = muscleSeries(l, sessions, ex, 'triceps');
  assert.equal(r.length, 1);
  assert.equal(r[0].sets, 3);
  assert.equal(r[0].volume, 400);
});

test('muscleSeries respecteert het datumbereik en slaat overgeslagen over', () => {
  assert.equal(muscleSeries(logs, sessions, exercises, 'borst', { from: '2026-09-10' }).length, 1);
  assert.deepEqual(muscleSeries(logs, sessions, exercises, 'core'), []);
});

test('secundair telt half en tertiair een kwart, in totalen en reeks', () => {
  const ex = [{ id: 'bank', name: 'Bank', muscle_roles: { chest: 'primair', triceps: 'secundair', abs: 'tertiair' } }];
  const l = [log('s1', 'bank', 1, 10, 20), log('s1', 'bank', 2, 10, 20), log('s1', 'bank', 3, 10, 20), log('s1', 'bank', 4, 10, 20)];
  const t = muscleTotals(l, sessions, ex);
  assert.equal(findMuscle(t, 'chest').sets, 4);
  assert.equal(findMuscle(t, 'triceps').sets, 2);
  assert.equal(findMuscle(t, 'abs').sets, 1);
  assert.equal(findMuscle(t, 'triceps').volume, 400);
  // per oefening de echte sets, met het gewicht erbij
  assert.deepEqual(findMuscle(t, 'triceps').byExercise[0], { exerciseId: 'bank', name: 'Bank', weight: 0.5, sets: 4, volume: 800 });
  assert.equal(muscleSeries(l, sessions, ex, 'abs')[0].sets, 1);
});

test('echte namen krijgen hun verdeling uit de bibliotheek', () => {
  const ex = [{ id: 'bp', name: 'Bankdrukken', muscle_groups: ['chest', 'triceps', 'front-deltoids'] }];
  const t = muscleTotals([log('s1', 'bp', 1, 10, 20), log('s1', 'bp', 2, 10, 20)], sessions, ex);
  assert.equal(findMuscle(t, 'chest').sets, 2);
  assert.equal(findMuscle(t, 'triceps').sets, 1);
});

test('roundSets rondt af op één decimaal', () => {
  assert.equal(roundSets(12.25), 12.3);
  assert.equal(roundSets(0.1 + 0.2), 0.3);
  assert.equal(roundSets(undefined), 0);
});
