import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimal, parseWhole, formatNumber } from '../src/lib/input.js';

test('komma en punt zijn allebei een decimaalteken', () => {
  assert.equal(parseDecimal('22,5'), 22.5);
  assert.equal(parseDecimal('22.5'), 22.5);
  assert.equal(parseDecimal(' 14 '), 14);
});

test('lege en ongeldige invoer levert null', () => {
  for (const v of ['', '  ', null, undefined, 'abc']) assert.equal(parseDecimal(v), null);
});

test('reps en seconden zijn hele getallen', () => {
  assert.equal(parseWhole('10'), 10);
  assert.equal(parseWhole('10,6'), 11);
  assert.equal(parseWhole(''), null);
});

test('formatNumber laat geen overbodige nullen zien', () => {
  assert.equal(formatNumber(20.30), '20.3');
  assert.equal(formatNumber(14), '14');
  assert.equal(formatNumber(null), '');
});
