import { test } from 'node:test';
import assert from 'node:assert/strict';
import { muscleTotals, findMuscle, intensities, sortByMetric, busiestBy } from '../src/lib/muscles.js';

const sessions = [
  { id: 's1', planned_date: '2026-09-05', actual_date: '2026-09-05', status: 'voltooid' },
  { id: 's2', planned_date: '2026-09-13', actual_date: '2026-09-13', status: 'voltooid' },
];

const exercises = [
  { id: 'bank', name: 'Bankdrukken', muscle_groups: ['borst', 'triceps'] },
  { id: 'curl', name: 'Bicepscurls', muscle_groups: ['biceps'] },
  { id: 'plank', name: 'Plank', muscle_groups: ['core'] },
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
  assert.equal(borst.byExercise[0].name, 'Bankdrukken');
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
    { id: 'been', name: 'Beenpers', muscle_groups: ['benen'] },
    { id: 'curl', name: 'Curls', muscle_groups: ['biceps'] },
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
    { id: 'been', name: 'Beenpers', muscle_groups: ['benen'] },
    { id: 'curl', name: 'Curls', muscle_groups: ['biceps'] },
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
