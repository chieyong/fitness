import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoleSpec, muscleWeights, musclesByRole, curatedSpec, roleOf } from '../src/lib/muscleWeights.js';
import { ROLE_SPECS } from '../src/data/muscleRoles.js';
import { CATALOG } from '../src/data/catalog.js';
import { templates as program } from '../src/data/program.js';
import { KNOWN_MUSCLES } from '../src/lib/muscleLabels.js';

test('notatie: primair | secundair | tertiair', () => {
  assert.deepEqual([...parseRoleSpec('chest | triceps front-deltoids | abs')],
    [['chest', 1], ['triceps', 0.5], ['front-deltoids', 0.5], ['abs', 0.25]]);
  assert.deepEqual([...parseRoleSpec('shrugs-achtig | | forearm')], [['shrugs-achtig', 1], ['forearm', 0.25]]);
});

test('elke bibliotheekoefening heeft een geldige verdeling die haar spieren dekt', () => {
  for (const c of CATALOG) {
    const spec = ROLE_SPECS[c.key];
    assert.ok(spec, `${c.key} mist een verdeling`);
    const w = parseRoleSpec(spec);
    for (const m of w.keys()) assert.ok(KNOWN_MUSCLES.includes(m), `${c.key}: ${m}`);
    for (const m of c.muscles) assert.ok(w.has(m), `${c.key}: ${m} ontbreekt`);
    assert.equal(w.get(c.muscles[0]), 1, `${c.key}: eerste spier hoort primair`);
  }
  assert.equal(Object.keys(ROLE_SPECS).length, CATALOG.length);
});

test('elke oefening uit het programma wordt herkend, in beide talen', () => {
  for (const x of program.flatMap((t) => t.exercises)) {
    for (const name of [x.name, x.en]) {
      const spec = curatedSpec({ name });
      assert.ok(spec, `${name} niet herkend`);
      const w = parseRoleSpec(spec);
      for (const m of x.muscles) assert.ok(w.has(m), `${name}: ${m} ontbreekt`);
    }
  }
});

test('volgorde van bronnen: eigen rollen, sleutel, naam, dan terugval', () => {
  assert.deepEqual([...muscleWeights({ name: 'x', muscle_roles: { chest: 'primair', abs: 'tertiair', biceps: 0.5 } })],
    [['chest', 1], ['abs', 0.25], ['biceps', 0.5]]);
  assert.equal(muscleWeights({ name: 'iets anders', catalog_key: 'bankdrukken' }).get('triceps'), 0.5);
  assert.equal(muscleWeights({ name: 'Bench press' }).get('chest'), 1);
  assert.equal(muscleWeights({ name: 'Deadlifts' }).get('forearm'), 0.25);
  assert.deepEqual([...muscleWeights({ name: 'Eigen ding', muscle_groups: ['calves', 'abs'] })], [['calves', 1], ['abs', 0.5]]);
  assert.equal(muscleWeights(null).size, 0);
});

test('rollen voor weergave', () => {
  assert.deepEqual(musclesByRole({ name: 'Bankdrukken' }), { primair: ['chest'], secundair: ['triceps', 'front-deltoids'], tertiair: [] });
  assert.equal(roleOf(1), 'primair');
  assert.equal(roleOf(0.5), 'secundair');
  assert.equal(roleOf(0.25), 'tertiair');
});
