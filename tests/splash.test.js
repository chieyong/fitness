import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splashDelay, MIN_VISIBLE } from '../src/lib/splash.js';

test('het laadscherm blijft minstens de minimumtijd staan', () => {
  assert.equal(splashDelay(300, 0), MIN_VISIBLE - 300);
  assert.equal(splashDelay(1200, 200, 900), 0);
});

test('duurde laden langer dan de minimumtijd, dan meteen weg', () => {
  assert.equal(splashDelay(5000, 0), 0);
});
