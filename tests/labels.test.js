import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KNOWN_MUSCLES, MUSCLE_LABELS_EN, muscleLabel } from '../src/lib/muscleLabels.js';
import { EQUIPMENT_IDS, MEASURE_IDS, equipmentLabel, measureLabel, equipmentOptions } from '../src/data/equipment.js';

test('elke spiergroep heeft een Engels label', () => {
  for (const m of KNOWN_MUSCLES) assert.ok(MUSCLE_LABELS_EN[m], m);
  assert.equal(muscleLabel('gluteal', 'en'), 'glutes');
  assert.equal(muscleLabel('gluteal'), 'bilspieren');
});

test('materiaal en meetwijze in beide talen', () => {
  for (const id of [...EQUIPMENT_IDS, ...MEASURE_IDS]) {
    assert.ok(equipmentLabel(id, 'en') || measureLabel(id, 'en'), id);
    assert.ok(equipmentLabel(id, 'nl') || measureLabel(id, 'nl'), id);
  }
  assert.deepEqual(equipmentOptions('en').map((o) => o.label), ['Free weights', 'Machine or cable', 'No equipment']);
});
