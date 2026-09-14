import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG } from '../src/data/catalog.js';
import { EQUIPMENT_IDS, MEASURE_IDS } from '../src/data/equipment.js';
import { KNOWN_MUSCLES } from '../src/lib/muscleLabels.js';
import { templates as program } from '../src/data/program.js';

test('sleutels en namen zijn uniek', () => {
  assert.equal(new Set(CATALOG.map((c) => c.key)).size, CATALOG.length);
  assert.equal(new Set(CATALOG.map((c) => c.name.toLowerCase())).size, CATALOG.length);
});

test('elke oefening heeft geldige spieren, materiaal en meetwijze', () => {
  for (const c of CATALOG) {
    assert.ok(c.muscles.length > 0, c.name);
    for (const m of c.muscles) assert.ok(KNOWN_MUSCLES.includes(m), `${c.name}: ${m}`);
    assert.ok(EQUIPMENT_IDS.includes(c.equipment), `${c.name}: ${c.equipment}`);
    assert.ok(MEASURE_IDS.includes(c.measure), `${c.name}: ${c.measure}`);
  }
});

test('elke spiergroep heeft keuze, en altijd iets zonder hulpmiddelen', () => {
  for (const muscle of KNOWN_MUSCLES) {
    const options = CATALOG.filter((c) => c.muscles.includes(muscle));
    assert.ok(options.length >= 3, `${muscle}: ${options.length}`);
    assert.ok(options.some((c) => c.equipment === 'zonder'), `${muscle} zonder hulpmiddelen`);
  }
});

test('oefeningen die ook in het programma staan, zijn daar identiek aan', () => {
  const inProgram = new Map(program.flatMap((t) => t.exercises).map((x) => [x.name, x]));
  let shared = 0;
  for (const c of CATALOG) {
    const p = inProgram.get(c.name);
    if (!p) continue;
    shared += 1;
    assert.deepEqual([...p.muscles].sort(), [...c.muscles].sort(), `${c.name} spieren`);
    if (p.equipment) assert.equal(p.equipment, c.equipment, `${c.name} materiaal`);
    if (p.measure) assert.equal(p.measure, c.measure, `${c.name} meetwijze`);
  }
  assert.ok(shared >= 10, `${shared} gedeeld`);
});
