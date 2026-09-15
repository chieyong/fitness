import { test } from 'node:test';
import assert from 'node:assert/strict';
import messages from '../src/i18n/messages/index.js';
import { placeholders } from '../src/i18n/core.js';

test('elke tekst bestaat in het Engels én in het Nederlands', () => {
  const en = Object.keys(messages.en).sort();
  const nl = Object.keys(messages.nl).sort();
  assert.deepEqual(en.filter((k) => !nl.includes(k)), [], 'ontbreekt in het Nederlands');
  assert.deepEqual(nl.filter((k) => !en.includes(k)), [], 'ontbreekt in het Engels');
  assert.ok(en.length > 50, `${en.length} teksten`);
});

test('invulvelden zijn in beide talen gelijk', () => {
  for (const key of Object.keys(messages.en)) {
    assert.deepEqual(placeholders(messages.nl[key]), placeholders(messages.en[key]), key);
  }
});
