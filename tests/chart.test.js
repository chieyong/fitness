import { test } from 'node:test';
import assert from 'node:assert/strict';
import { niceDomain, niceStep, ticksFor, project } from '../src/lib/chart.js';

test('niceStep rondt af op 1, 2, 2.5 of 5 maal een tienmacht', () => {
  assert.equal(niceStep(0.9), 1);
  assert.equal(niceStep(1.7), 2);
  assert.equal(niceStep(2.3), 2.5);
  assert.equal(niceStep(4), 5);
  assert.equal(niceStep(7), 10);
  assert.equal(niceStep(23), 25);
  assert.equal(niceStep(0), 1);
});

test('niceDomain omsluit de waarden met ronde grenzen', () => {
  const d = niceDomain([59, 66, 73, 79]);
  assert.ok(d.min <= 59 && d.max >= 79);
  assert.equal(d.min % d.step, 0);
});

test('een vlakke reeks krijgt toch hoogte', () => {
  const d = niceDomain([73, 73, 73]);
  assert.ok(d.max > d.min);
  assert.ok(d.min < 73 && d.max > 73);
});

test('lege invoer levert een bruikbaar domein', () => {
  const d = niceDomain([]);
  assert.ok(d.max > d.min);
});

test('ticksFor loopt van min tot en met max', () => {
  const t = ticksFor({ min: 50, max: 90, step: 10 });
  assert.deepEqual(t, [50, 60, 70, 80, 90]);
});

test('ticksFor houdt stand bij stappen van 2.5', () => {
  const t = ticksFor({ min: 0, max: 10, step: 2.5 });
  assert.deepEqual(t, [0, 2.5, 5, 7.5, 10]);
});

test('project plaatst waarden op de as, y omgekeerd', () => {
  const d = { min: 0, max: 100 };
  assert.equal(project(0, d, 200), 0);
  assert.equal(project(100, d, 200), 200);
  assert.equal(project(50, d, 200), 100);
  assert.equal(project(0, d, 200, true), 200);     // y: laagste waarde onderaan
  assert.equal(project(100, d, 200, true), 0);
});

test('project deelt niet door nul bij een plat domein', () => {
  assert.equal(project(5, { min: 5, max: 5 }, 200), 100);
});
