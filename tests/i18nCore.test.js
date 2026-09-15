import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LOCALE, normalizeLocale, getStoredLocale, storeLocale, interpolate,
  mergeMessages, createTranslator, placeholders,
} from '../src/i18n/core.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('Engels is de standaard; onbekende talen worden Engels', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.equal(normalizeLocale('fr'), 'en');
  assert.equal(normalizeLocale('nl'), 'nl');
});

test('de taalkeuze wordt onthouden, ook bij geblokkeerde opslag geen fout', () => {
  const s = memory();
  assert.equal(getStoredLocale(s), 'en');
  storeLocale('nl', s);
  assert.equal(getStoredLocale(s), 'nl');
  const broken = { getItem() { throw new Error('nee'); }, setItem() { throw new Error('nee'); } };
  assert.equal(getStoredLocale(broken), 'en');
  assert.doesNotThrow(() => storeLocale('nl', broken));
});

test('invulvelden en samenvoegen', () => {
  assert.equal(interpolate('Hallo {naam}, {x}', { naam: 'Rep' }), 'Hallo Rep, {x}');
  const merged = mergeMessages({ en: { a: 'A' }, nl: { a: 'A-nl' } }, { en: { b: 'B' }, nl: {} });
  assert.deepEqual(merged, { en: { a: 'A', b: 'B' }, nl: { a: 'A-nl' } });
});

test('vertalen met terugval en meervoud', () => {
  const messages = {
    en: { hi: 'Hi {name}', sets: { one: '{count} set', other: '{count} sets' }, onlyEn: 'English' },
    nl: { hi: 'Hoi {name}', sets: { one: '{count} set', other: '{count} sets' } },
  };
  const nl = createTranslator(messages, 'nl');
  assert.equal(nl('hi', { name: 'Chie' }), 'Hoi Chie');
  assert.equal(nl('sets', { count: 1 }), '1 set');
  assert.equal(nl('sets', { count: 3 }), '3 sets');
  assert.equal(nl('onlyEn'), 'English');
  assert.equal(nl('bestaatNiet'), 'bestaatNiet');
});

test('placeholders van tekst en meervoud', () => {
  assert.deepEqual(placeholders('{b} en {a}'), ['a', 'b']);
  assert.deepEqual(placeholders({ one: '{count} set', other: '{count} sets van {name}' }), ['count', 'name']);
});
