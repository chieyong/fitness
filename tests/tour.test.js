import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOUR_KEY, hasSeenTour, markTourSeen, nextAvailable, placeTip } from '../src/lib/tour.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('de rondleiding wordt onthouden', () => {
  const s = memory();
  assert.equal(hasSeenTour(s), false);
  markTourSeen(s);
  assert.equal(hasSeenTour(s), true);
  assert.equal(s.getItem(TOUR_KEY), 'klaar');
});

test('geblokkeerde opslag: dan niet bij elk bezoek opnieuw', () => {
  const broken = { getItem() { throw new Error('nee'); }, setItem() { throw new Error('nee'); } };
  assert.equal(hasSeenTour(broken), true);
  assert.doesNotThrow(() => markTourSeen(broken));
});

test('stappen waarvan het onderdeel ontbreekt worden overgeslagen, in beide richtingen', () => {
  const steps = [{ target: null }, { target: '.kaart' }, { target: '.video' }, { target: '.tab' }];
  const on = new Set(['.kaart', '.tab']);
  const exists = (sel) => on.has(sel);
  assert.equal(nextAvailable(steps, -1, 1, exists), 0);
  assert.equal(nextAvailable(steps, 1, 1, exists), 3);        // .video ontbreekt
  assert.equal(nextAvailable(steps, 3, -1, exists), 1);
  assert.equal(nextAvailable(steps, 3, 1, exists), -1);
  on.delete('.kaart');
  assert.equal(nextAvailable(steps, 0, 1, exists), 3);        // rustdag: geen oefeningkaart
});

test('het kaartje komt onder het doel als het past', () => {
  const r = placeTip({ top: 100, bottom: 150, left: 100, width: 100 }, { width: 280, height: 150 }, { width: 375, height: 812 });
  assert.equal(r.placement, 'onder');
  assert.equal(r.top, 164);
  assert.ok(r.left >= 16 && r.left + 280 <= 375 - 16);
});

test('onderaan het scherm (zoals de tabbalk) komt het kaartje erboven', () => {
  const r = placeTip({ top: 740, bottom: 800, left: 150, width: 60 }, { width: 280, height: 150 }, { width: 375, height: 812 });
  assert.equal(r.placement, 'boven');
  assert.equal(r.top, 740 - 14 - 150);
});

test('horizontaal altijd binnen beeld, met het pijltje naar het doel', () => {
  const right = placeTip({ top: 20, bottom: 50, left: 330, width: 30 }, { width: 280, height: 120 }, { width: 375, height: 812 });
  assert.equal(right.left, 375 - 16 - 280);
  assert.ok(right.arrow > 200, `pijltje ${right.arrow}`);
  const left = placeTip({ top: 20, bottom: 50, left: 0, width: 20 }, { width: 280, height: 120 }, { width: 375, height: 812 });
  assert.equal(left.left, 16);
  assert.equal(left.arrow, 18);
});

test('past het nergens, dan onder en binnen het scherm geklemd', () => {
  const r = placeTip({ top: 100, bottom: 700, left: 50, width: 275 }, { width: 280, height: 200 }, { width: 375, height: 812 });
  assert.equal(r.placement, 'onder');
  assert.equal(r.top, 812 - 16 - 200);
});
