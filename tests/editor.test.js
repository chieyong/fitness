import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterCatalog, findExistingExercise, nextPosition, renumber, moveRow, removeRow, defaultTarget, validateTarget, targetColumns, formFromColumns, measureOf, validateOwnExercise, nextTemplateLabel, archiveImpact, validateTemplateLabel, groupByExercise, targetsDiffer, sameTarget,
} from '../src/lib/editor.js';

const catalog = [
  { key: 'push-ups', name: 'Push-ups', muscles: ['chest', 'triceps'], equipment: 'zonder', measure: 'reps' },
  { key: 'dips', name: 'Dips', muscles: ['triceps', 'chest'], equipment: 'zonder', measure: 'reps' },
  { key: 'bankdrukken', name: 'Bankdrukken', muscles: ['chest', 'triceps'], equipment: 'losse-gewichten', measure: 'gewicht' },
  { key: 'leg-curl', name: 'Leg curl', muscles: ['hamstring'], equipment: 'machine', measure: 'gewicht' },
];

const rows = [
  { id: 'a', position: 1 },
  { id: 'b', position: 2 },
  { id: 'c', position: 3 },
];

test('filterCatalog filtert op spier en materiaal, hoofdspier eerst', () => {
  assert.deepEqual(filterCatalog(catalog, { muscle: 'chest' }).map((c) => c.key), ['bankdrukken', 'push-ups', 'dips']);
  assert.deepEqual(filterCatalog(catalog, { muscle: 'triceps' }).map((c) => c.key), ['dips', 'bankdrukken', 'push-ups']);
  assert.deepEqual(filterCatalog(catalog, { muscle: 'chest', equipment: 'zonder' }).map((c) => c.key), ['push-ups', 'dips']);
  assert.deepEqual(filterCatalog(catalog, { query: 'CURL' }).map((c) => c.key), ['leg-curl']);
});

test('een bestaande oefening wordt herkend op sleutel of naam', () => {
  const existing = [
    { id: 1, name: 'Bankdrukken', catalog_key: null },
    { id: 2, name: 'Iets anders', catalog_key: 'dips' },
  ];
  assert.equal(findExistingExercise(existing, catalog[1]).id, 2);          // op sleutel
  assert.equal(findExistingExercise(existing, catalog[2]).id, 1);          // op naam, hoofdletterongevoelig
  assert.equal(findExistingExercise(existing, catalog[0]), null);
});

test('posities: volgende, omnummeren, verplaatsen en weghalen', () => {
  assert.equal(nextPosition(rows), 4);
  assert.equal(nextPosition([]), 1);
  assert.deepEqual(renumber([{ id: 'x', position: 5 }, { id: 'y', position: 2 }]),
    [{ id: 'x', position: 1 }]);
  assert.deepEqual(moveRow(rows, 'b', -1), [{ id: 'b', position: 1 }, { id: 'a', position: 2 }]);
  assert.deepEqual(moveRow(rows, 'a', -1), []);                 // bovenaan kan niet hoger
  assert.deepEqual(moveRow(rows, 'c', +1), []);
  assert.deepEqual(removeRow(rows, 'a'), [{ id: 'b', position: 1 }, { id: 'c', position: 2 }]);
});

test('targets: standaard, validatie en omzetten naar kolommen', () => {
  assert.deepEqual(defaultTarget('tijd'), { sets: 3, secondsMin: 30, secondsMax: 60 });
  assert.deepEqual(validateTarget('gewicht', { sets: 3, repsMin: 8, repsMax: 12 }), []);
  assert.equal(validateTarget('gewicht', { sets: 0, repsMin: 8 }).length, 1);
  assert.equal(validateTarget('gewicht', { sets: 3, repsMin: 12, repsMax: 8 }).length, 1);
  assert.equal(validateTarget('tijd', { sets: 3, secondsMin: '' }).length, 1);

  assert.deepEqual(targetColumns('gewicht', { sets: '4', repsMin: '8', repsMax: '8' }), {
    target_sets: 4, target_reps_min: 8, target_reps_max: null, target_seconds: null, target_seconds_max: null,
  });
  assert.deepEqual(targetColumns('tijd', { sets: 3, secondsMin: 30, secondsMax: 45 }), {
    target_sets: 3, target_reps_min: null, target_reps_max: null, target_seconds: 30, target_seconds_max: 45,
  });
});

test('formFromColumns en measureOf lezen bestaande koppelingen', () => {
  assert.deepEqual(formFromColumns({ target_sets: 3, target_seconds: 30, target_seconds_max: null }),
    { sets: 3, secondsMin: 30, secondsMax: '' });
  assert.equal(measureOf({ target_seconds: 30 }, {}), 'tijd');
  assert.equal(measureOf({ target_seconds: null }, { measure: 'reps' }), 'reps');
  assert.equal(measureOf({ target_seconds: null }, null), 'gewicht');
});

test('eigen oefening: naam verplicht en uniek, spier, materiaal en meetwijze', () => {
  const ids = { equipmentIds: ['zonder'], measureIds: ['reps'] };
  const existing = [{ name: 'Burpees' }];
  assert.deepEqual(validateOwnExercise({ name: 'Bear crawl', muscles: ['abs'], equipment: 'zonder', measure: 'reps' }, existing, ids), []);
  assert.equal(validateOwnExercise({ name: ' burpees ', muscles: ['abs'], equipment: 'zonder', measure: 'reps' }, existing, ids).length, 1);
  assert.equal(validateOwnExercise({ name: '', muscles: [], equipment: 'x', measure: 'y' }, existing, ids).length, 4);
});

test('workouts: volgende naam, naamcontrole en wat verwijderen raakt', () => {
  assert.equal(nextTemplateLabel([{ label: 'Workout A' }, { label: 'Workout B' }, { label: 'Workout C' }]), 'Workout D');
  assert.equal(nextTemplateLabel([{ label: 'Workout B' }]), 'Workout A');
  assert.equal(validateTemplateLabel('workout a', [{ id: 1, label: 'Workout A' }]), 'Er is al een workout met die naam.');
  assert.equal(validateTemplateLabel('Workout A', [{ id: 1, label: 'Workout A' }], 1), null);   // eigen naam mag
  assert.equal(validateTemplateLabel('  ', []), 'Geef de workout een naam.');
  assert.deepEqual(archiveImpact([
    { template_id: 't', status: 'gepland' },
    { template_id: 't', status: 'voltooid' },
    { template_id: 't', status: 'overgeslagen' },
    { template_id: 'u', status: 'gepland' },
  ], 't'), { planned: 1, history: 2 });
});

test('meldingen in het Engels, en zoeken en herkennen in beide talen', () => {
  assert.deepEqual(validateTarget('gewicht', { sets: 0, repsMin: 8 }, 'en'), ['Sets must be between 1 and 10.']);
  assert.equal(validateTemplateLabel('  ', [], null, 'en'), 'Give the workout a name.');
  const cat = [{ key: 'bankdrukken', name: 'Bankdrukken', en: 'Bench press', muscles: ['chest'], equipment: 'losse-gewichten', measure: 'gewicht' }];
  assert.equal(filterCatalog(cat, { query: 'bench', locale: 'en' }).length, 1);
  assert.equal(filterCatalog(cat, { query: 'bank', locale: 'en' }).length, 1);
  assert.equal(findExistingExercise([{ id: 1, name: 'Bench press' }], cat[0]).id, 1);
});

test('groupByExercise: elke oefening één keer, met haar workouts', () => {
  const templates = [{ id: 'c', label: 'Workout C', position: 2 }, { id: 'a', label: 'Workout A', position: 0 }];
  const rows = new Map([
    ['a', [
      { id: 'a1', exercise_id: 'bank', exercise: { name: 'Bankdrukken' }, target_sets: 4, target_reps_min: 10 },
      { id: 'a2', exercise_id: 'rij', exercise: { name: 'Gebogen rij' }, target_sets: 4, target_reps_min: 8 },
    ]],
    ['c', [
      { id: 'c1', exercise_id: 'rij', exercise: { name: 'Gebogen rij' }, target_sets: 3, target_reps_min: 10 },
    ]],
  ]);
  const groups = groupByExercise(templates, rows);
  assert.deepEqual(groups.map((g) => [g.name, g.rows.map((r) => r.template.label)]),
    [['Bankdrukken', ['Workout A']], ['Gebogen rij', ['Workout A', 'Workout C']]]);
  assert.equal(targetsDiffer(groups[1].rows.map((r) => r.row)), true);
  assert.equal(targetsDiffer(groups[0].rows.map((r) => r.row)), false);
});

test('sameTarget behandelt leeg en null gelijk', () => {
  assert.equal(sameTarget({ target_sets: 3, target_reps_min: 10 }, { target_sets: 3, target_reps_min: 10, target_reps_max: null }), true);
  assert.equal(sameTarget({ target_sets: 3, target_seconds: 30 }, { target_sets: 3, target_seconds: 45 }), false);
});
