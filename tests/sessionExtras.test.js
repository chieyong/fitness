import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraItems } from '../src/lib/sessionExtras.js';
import { createDemoSource } from '../src/lib/sources/demo.js';

const byId = new Map([
  ['lat', { id: 'lat', name: 'Lat pulldown', muscle_groups: ['upper-back'] }],
  ['curl', { id: 'curl', name: 'Curl', muscle_groups: ['biceps'] }],
]);

test('extra oefeningen krijgen dezelfde vorm als de workout, op volgorde, zonder dubbele', () => {
  const extras = [
    { id: 'x2', session_id: 's', exercise_id: 'curl', position: 2, target_sets: 3, target_reps_min: 12 },
    { id: 'x1', session_id: 's', exercise_id: 'lat', position: 1, target_sets: 3, target_reps_min: 10 },
    { id: 'x3', session_id: 's', exercise_id: 'weg', position: 3, target_sets: 2 },
  ];
  const items = extraItems(extras, byId, []);
  assert.deepEqual(items.map((i) => i.id), ['extra:x1', 'extra:x2']);
  assert.equal(items[0].exercise.name, 'Lat pulldown');
  assert.equal(items[0].extra, true);
  assert.equal(items[0].extraId, 'x1');
  assert.equal(items[0].target_sets, 3);
  // Staat de oefening al in de workout, dan niet nog eens als extra.
  assert.deepEqual(extraItems(extras, byId, [{ exercise_id: 'lat' }]).map((i) => i.id), ['extra:x2']);
});

test('demo: extra oefening toevoegen, ophalen en weer weghalen, alleen bij die sessie', async () => {
  const src = createDemoSource({ today: '2026-09-13', lockStructure: true });
  const [a, b] = await src.fetchSessions();
  const [exercise] = await src.fetchAllExercises();
  const row = await src.addSessionExercise({ session_id: a.id, exercise_id: exercise.id, position: 1, target_sets: 3 });
  assert.equal((await src.fetchSessionExercises(a.id)).length, 1);
  assert.equal((await src.fetchSessionExercises(b.id)).length, 0);
  await assert.rejects(src.addSessionExercise({ session_id: a.id, exercise_id: exercise.id, position: 2, target_sets: 3 }));
  await src.deleteSessionExercise(row.id);
  assert.equal((await src.fetchSessionExercises(a.id)).length, 0);
});
