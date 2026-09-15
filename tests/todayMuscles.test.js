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
  // abs doet alleen tertiair mee en telt dus niet mee in de teller
  assert.deepEqual(summarizeMuscles(s), { total: 3, done: 1, remaining: ['chest', 'biceps'] });
  assert.equal(s.has('abs'), true);
});

test('tertiair werk in een open oefening houdt een spier niet tegen', () => {
  const s = todayMuscles([
    { weights: w({ chest: 1, triceps: 0.5 }), targetSets: 4, doneSets: 4 },
    { weights: w({ obliques: 1, chest: 0.25 }), targetSets: 3, doneSets: 0 },
  ]);
  assert.equal(s.get('chest').state, 'klaar');
  assert.equal(s.get('chest').fraction, 1);          // kleur volledig, net als de teller
  assert.equal(s.get('triceps').state, 'klaar');
  assert.equal(s.get('obliques').state, 'gepland');
  assert.deepEqual(summarizeMuscles(s), { total: 3, done: 2, remaining: ['obliques'] });
});

test('secundair werk in een open oefening houdt een spier wél tegen', () => {
  const s = todayMuscles([
    { weights: w({ biceps: 1 }), targetSets: 3, doneSets: 3 },
    { weights: w({ 'upper-back': 1, biceps: 0.5 }), targetSets: 4, doneSets: 2 },
  ]);
  assert.equal(s.get('biceps').state, 'bezig');
  assert.ok(Math.abs(s.get('biceps').fraction - 4 / 5) < 1e-9);
});

test('alleen tertiair: klaar als dat werk af is, maar telt niet mee', () => {
  const s = todayMuscles([{ weights: w({ 'upper-back': 1, forearm: 0.25 }), targetSets: 4, doneSets: 4 }]);
  assert.equal(s.get('forearm').state, 'klaar');
  assert.equal(s.get('forearm').counted, false);
  assert.deepEqual(summarizeMuscles(s), { total: 1, done: 1, remaining: [] });
});
