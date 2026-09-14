import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES, nextTheme, normalizeTheme, effectiveTheme, getThemePreference, setThemePreference,
} from '../src/lib/theme.js';

const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  };
};

test('de knop loopt systeem, licht, donker en weer terug', () => {
  assert.deepEqual(THEMES.map(nextTheme), ['light', 'dark', 'system']);
  assert.equal(nextTheme('onzin'), 'light');
});

test('onbekende waarden worden systeem', () => {
  for (const v of [null, undefined, '', 'blauw']) assert.equal(normalizeTheme(v), 'system');
});

test('systeem volgt de telefoon, een eigen keuze niet', () => {
  assert.equal(effectiveTheme('system', true), 'dark');
  assert.equal(effectiveTheme('system', false), 'light');
  assert.equal(effectiveTheme('light', true), 'light');
  assert.equal(effectiveTheme('dark', false), 'dark');
});

test('een keuze wordt bewaard en op <html> gezet', () => {
  const storage = memoryStorage();
  const root = { dataset: {} };
  assert.equal(setThemePreference('dark', { storage, root }), 'dark');
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(getThemePreference(storage), 'dark');

  setThemePreference('system', { storage, root });
  assert.equal('theme' in root.dataset, false);
  assert.equal(storage.data.size, 0);
  assert.equal(getThemePreference(storage), 'system');
});

test('geblokkeerde opslag breekt niets', () => {
  const broken = {
    getItem() { throw new Error('geblokkeerd'); },
    setItem() { throw new Error('geblokkeerd'); },
    removeItem() { throw new Error('geblokkeerd'); },
  };
  const root = { dataset: {} };
  assert.equal(getThemePreference(broken), 'system');
  assert.equal(setThemePreference('light', { storage: broken, root }), 'light');
  assert.equal(root.dataset.theme, 'light');
});
