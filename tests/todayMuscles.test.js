import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayMuscles, summarizeMuscles } from '../src/lib/todayMuscles.js';

test('niets gedaan: alle spiergroepen gepland', () => {
  const s = todayMuscles([
    { muscles: ['chest', 'triceps'], status: 'open' },
    { muscles: ['biceps'], status: 'open' },
  ]);
  assert.deepEqual([...s], [['chest', 'gepland'], ['triceps', 'gepland'], ['biceps', 'gepland']]);
});

test('klaar pas als alle oefeningen voor die spier klaar zijn', () => {
  const s = todayMuscles([
    { muscles: ['chest', 'triceps'], status: 'klaar' },
    { muscles: ['triceps'], status: 'open' },
    { muscles: ['biceps'], status: 'bezig' },
  ]);
  assert.equal(s.get('chest'), 'klaar');
  assert.equal(s.get('triceps'), 'bezig');
  assert.equal(s.get('biceps'), 'bezig');
});

test('overgeslagen telt niet mee; alleen overgeslagen valt weg', () => {
  const s = todayMuscles([
    { muscles: ['chest'], status: 'klaar' },
    { muscles: ['chest', 'abs'], status: 'overgeslagen' },
  ]);
  assert.equal(s.get('chest'), 'klaar');
  assert.equal(s.has('abs'), false);
});

test('dubbele spiergroep binnen één oefening telt één keer, en samenvatting', () => {
  const s = todayMuscles([
    { muscles: ['chest', 'chest'], status: 'klaar' },
    { muscles: ['calves'], status: 'open' },
    { status: 'open' },
  ]);
  assert.deepEqual(summarizeMuscles(s), { total: 2, done: 1, remaining: ['calves'] });
});
