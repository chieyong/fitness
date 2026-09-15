import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayMuscles, summarizeMuscles } from '../src/lib/todayMuscles.js';

const w = (obj) => new Map(Object.entries(obj));

test('nadruk: primair zwaarder dan secundair, opgeteld over oefeningen', () => {
  const s = todayMuscles([
    { weights: w({ chest: 1, triceps: 0.5 }), targetSets: 4, doneSets: 0 },
    { weights: w({ triceps: 1 }), targetSets: 2, doneSets: 0 },
  ]);
  assert.equal(s.get('chest').load, 4);
  assert.equal(s.get('triceps').load, 4);
  assert.equal(s.get('chest').focus, 1);
  assert.equal(s.get('chest').state, 'gepland');
});

test('voortgang is gedane gewogen sets gedeeld door geplande', () => {
  const s = todayMuscles([
    { weights: w({ chest: 1, triceps: 0.5 }), targetSets: 4, doneSets: 4 },
    { weights: w({ triceps: 1 }), targetSets: 4, doneSets: 0 },
  ]);
  assert.equal(s.get('chest').fraction, 1);
  assert.equal(s.get('chest').state, 'klaar');
  assert.ok(Math.abs(s.get('triceps').fraction - 2 / 6) < 1e-9);
  assert.equal(s.get('triceps').state, 'bezig');
});

test('meer sets dan het target telt niet extra; overgeslagen telt niet mee', () => {
  const s = todayMuscles([
    { weights: w({ chest: 1 }), targetSets: 3, doneSets: 5 },
    { weights: w({ chest: 1, abs: 0.25 }), targetSets: 3, doneSets: 0, skipped: true },
  ]);
  assert.equal(s.get('chest').fraction, 1);
  assert.equal(s.has('abs'), false);
});

test('samenvatting: nog te gaan op nadruk gesorteerd', () => {
  const s = todayMuscles([
    { weights: w({ chest: 1, abs: 0.25 }), targetSets: 4, doneSets: 0 },
    { weights: w({ calves: 1 }), targetSets: 2, doneSets: 2 },
    { weights: w({ biceps: 0.5 }), targetSets: 4, doneSets: 0 },
  ]);
  assert.deepEqual(summarizeMuscles(s), { total: 4, done: 1, remaining: ['chest', 'biceps', 'abs'] });
});
