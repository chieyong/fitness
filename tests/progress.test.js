import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lastPerformance, formatSets, bestSet, volume, setsFor, sessionDate,
} from '../src/lib/progress.js';

const sessions = [
  { id: 's1', planned_date: '2026-09-05', actual_date: '2026-09-05', status: 'voltooid' },
  { id: 's2', planned_date: '2026-09-11', actual_date: '2026-09-11', status: 'voltooid' },
  { id: 's3', planned_date: '2026-09-13', actual_date: null, status: 'gepland' },
];

const log = (session_id, exercise_id, set_number, reps, weight_kg, extra = {}) =>
  ({ session_id, exercise_id, set_number, reps, weight_kg, seconds: null, skipped: false, note: null, ...extra });

const logs = [
  log('s1', 'bank', 1, 10, 14),
  log('s1', 'bank', 2, 10, 12),
  log('s1', 'pers', 1, 10, 12, { note: 'Ging net!' }),
  log('s2', 'bank', 1, 10, 16),
  log('s2', 'bank', 2, 8, 16),
  log('s2', 'plank', 1, null, null, { skipped: true }),
];

test('sessionDate valt terug op de geplande datum', () => {
  assert.equal(sessionDate(sessions[0]), '2026-09-05');
  assert.equal(sessionDate(sessions[2]), '2026-09-13');
});

test('lastPerformance pakt de meest recente eerdere sessie', () => {
  const r = lastPerformance(logs, sessions, 'bank', '2026-09-13');
  assert.equal(r.date, '2026-09-11');
  assert.equal(formatSets(r.sets), '10×16, 8×16');
});

test('lastPerformance kijkt niet vooruit', () => {
  const r = lastPerformance(logs, sessions, 'bank', '2026-09-11');
  assert.equal(r.date, '2026-09-05');          // niet de sessie van 11 sep zelf
  assert.equal(formatSets(r.sets), '10×14, 10×12');
});

test('lastPerformance geeft null zonder eerdere sessie', () => {
  assert.equal(lastPerformance(logs, sessions, 'bank', '2026-09-01'), null);
  assert.equal(lastPerformance(logs, sessions, 'onbekend', '2026-09-13'), null);
});

test('overgeslagen is iets anders dan nooit gedaan', () => {
  const r = lastPerformance(logs, sessions, 'plank', '2026-09-13');
  assert.equal(r.skipped, true);
  assert.deepEqual(r.sets, []);
});

test('een notitie van vorige keer komt mee', () => {
  assert.equal(lastPerformance(logs, sessions, 'pers', '2026-09-13').note, 'Ging net!');
});

test('formatSets kent reps, gewicht en seconden', () => {
  assert.equal(formatSets([{ reps: 10, weight_kg: 14 }]), '10×14');
  assert.equal(formatSets([{ seconds: 45 }, { seconds: 40 }]), '45s, 40s');
  assert.equal(formatSets([{ reps: 12, weight_kg: null }]), '12');
});

test('bestSet kiest zwaarste, bij gelijk gewicht de meeste reps', () => {
  assert.deepEqual(bestSet([{ reps: 10, weight_kg: 14 }, { reps: 8, weight_kg: 16 }]), { reps: 8, weight_kg: 16 });
  assert.deepEqual(bestSet([{ reps: 8, weight_kg: 16 }, { reps: 10, weight_kg: 16 }]), { reps: 10, weight_kg: 16 });
  assert.equal(bestSet([{ seconds: 45 }]), null);
});

test('volume telt reps x gewicht', () => {
  assert.equal(volume([{ reps: 10, weight_kg: 14 }, { reps: 8, weight_kg: 16 }]), 268);
  assert.equal(volume([{ seconds: 45 }]), 0);
});

test('setsFor filtert op sessie en oefening, op setnummer', () => {
  const r = setsFor(logs, 's1', 'bank');
  assert.equal(r.length, 2);
  assert.equal(r[0].set_number, 1);
});
