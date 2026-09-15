import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pairUpdates, similarity, suggestAlternatives, exerciseIdsWithAlternatives, chosenExercise, resolveSessionItem,
} from '../src/lib/alternatives.js';
import { CATALOG } from '../src/data/catalog.js';

const sortById = (list) => [...list].sort((a, b) => a.id.localeCompare(b.id));

test('koppelen is symmetrisch en maakt oude partners los', () => {
  const ex = [
    { id: 'bp', alternative_id: null }, { id: 'sq', alternative_id: null },
    { id: 'lu', alternative_id: 'gs' }, { id: 'gs', alternative_id: 'lu' },
  ];
  assert.deepEqual(sortById(pairUpdates(ex, 'bp', 'sq')), [{ id: 'bp', alternative_id: 'sq' }, { id: 'sq', alternative_id: 'bp' }]);
  // bp koppelen aan gs: lu verliest gs
  assert.deepEqual(sortById(pairUpdates(ex, 'bp', 'gs')),
    [{ id: 'bp', alternative_id: 'gs' }, { id: 'gs', alternative_id: 'bp' }, { id: 'lu', alternative_id: null }]);
  // losmaken
  assert.deepEqual(sortById(pairUpdates(ex, 'lu', null)), [{ id: 'gs', alternative_id: null }, { id: 'lu', alternative_id: null }]);
  assert.deepEqual(pairUpdates(ex, 'lu', 'gs'), []);
  assert.deepEqual(pairUpdates(ex, 'bp', 'bp'), []);
});

test('suggesties delen een primaire spier, meest vergelijkbaar eerst', () => {
  const beenpers = { id: 'bp', name: 'Beenpers', catalog_key: 'beenpers', muscle_groups: ['quadriceps', 'gluteal', 'hamstring'] };
  const exercises = [beenpers, { id: 'curl', name: 'Bicepscurls', muscle_groups: ['biceps', 'forearm'] }];
  const s = suggestAlternatives(beenpers, { exercises, catalog: CATALOG, limit: 50 });
  const names = s.map((c) => (c.kind === 'existing' ? c.exercise.name : c.entry.name));
  assert.ok(names.includes('Squat') && names.includes('Goblet squat'), names.join(', '));
  assert.ok(!names.includes('Bicepscurls') && !names.includes('Beenpers'));
  assert.ok(names.indexOf('Squat') < names.indexOf('Leg extension') || !names.includes('Leg extension'));
  assert.ok(similarity(beenpers, { name: 'Squat', catalog_key: 'squat' }) > similarity(beenpers, { name: 'Leg extension', catalog_key: 'leg-extension' }));
});

test('suggesties: zoeken op naam in beide talen; bestaande oefening wint van bibliotheek', () => {
  const beenpers = { id: 'bp', name: 'Beenpers', catalog_key: 'beenpers' };
  const squat = { id: 'sq', name: 'Squat', catalog_key: 'squat' };
  const s = suggestAlternatives(beenpers, { exercises: [beenpers, squat], catalog: CATALOG, query: 'squat', limit: 20 });
  assert.equal(s.filter((c) => c.kind === 'catalog' && c.entry.key === 'squat').length, 0);
  assert.ok(s.some((c) => c.kind === 'existing' && c.exercise.id === 'sq'));
  assert.ok(suggestAlternatives(beenpers, { exercises: [], catalog: CATALOG, query: 'lunges' }).some((c) => c.entry?.key === 'uitvalspassen'));
});

test('ids voor logs bevatten ook alternatieven', () => {
  const byId = new Map([['a', { id: 'a', alternative_id: 'b' }], ['b', { id: 'b', alternative_id: 'a' }], ['c', { id: 'c' }]]);
  assert.deepEqual(exerciseIdsWithAlternatives([{ exercise_id: 'a' }, { exercise_id: 'c' }], byId).sort(), ['a', 'b', 'c']);
});

test('gekozen oefening: keuze, dan deze sessie, dan vorige keer, dan schema', () => {
  const sessions = [
    { id: 's1', template_id: 'A', planned_date: '2026-09-01', actual_date: '2026-09-01' },
    { id: 's2', template_id: 'B', planned_date: '2026-09-03', actual_date: '2026-09-03' },
    { id: 'nu', template_id: 'A', planned_date: '2026-09-08', actual_date: null },
  ];
  const session = sessions[2];
  const base = { primaryId: 'bp', alternativeId: 'sq', session, date: '2026-09-08', sessions };
  assert.equal(chosenExercise({ ...base, logs: [] }), 'bp');
  const lastTimeSquat = [{ session_id: 's1', exercise_id: 'sq' }, { session_id: 's2', exercise_id: 'bp' }];
  assert.equal(chosenExercise({ ...base, logs: lastTimeSquat }), 'sq');           // vorige keer in workout A
  assert.equal(chosenExercise({ ...base, logs: [...lastTimeSquat, { session_id: 'nu', exercise_id: 'bp' }] }), 'bp');
  assert.equal(chosenExercise({ ...base, logs: [], choice: 'sq' }), 'sq');
  assert.equal(chosenExercise({ ...base, alternativeId: null, logs: lastTimeSquat }), 'bp');
});

test('een sessie-oefening krijgt de gekozen oefening en haar alternatief', () => {
  const exercisesById = new Map([
    ['bp', { id: 'bp', name: 'Beenpers', alternative_id: 'sq' }],
    ['sq', { id: 'sq', name: 'Squat', muscle_groups: ['quadriceps'], alternative_id: 'bp', video_urls: ['x'] }],
  ]);
  const item = { id: 'row1', exercise_id: 'bp', exercise: { id: 'bp', name: 'Beenpers' }, target_sets: 3 };
  const ctx = { exercisesById, session: { id: 'nu', template_id: 'A' }, date: '2026-09-08', logs: [], sessions: [] };
  const normal = resolveSessionItem(item, ctx);
  assert.deepEqual([normal.exercise_id, normal.alternative, normal.swapped], ['bp', { id: 'sq', name: 'Squat' }, false]);
  const swapped = resolveSessionItem(item, { ...ctx, choice: 'sq' });
  assert.deepEqual([swapped.exercise_id, swapped.exercise.name, swapped.alternative, swapped.swapped, swapped.target_sets],
    ['sq', 'Squat', { id: 'bp', name: 'Beenpers' }, true, 3]);
  assert.equal(resolveSessionItem({ id: 'r', exercise_id: 'x', exercise: { name: 'X' } }, { ...ctx, exercisesById: new Map() }).alternative, null);
});
