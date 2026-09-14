import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDemoData } from '../src/lib/demo/generate.js';
import { isTrainingDay, daysBetween } from '../src/lib/schedule.js';
import { seriesFor } from '../src/lib/progress.js';
import { templates as program } from '../src/data/program.js';

const today = '2026-09-13';
const data = generateDemoData({ today });

test('dezelfde seed levert exact dezelfde data', () => {
  assert.deepEqual(generateDemoData({ today }), data);
  assert.notDeepEqual(generateDemoData({ today, seed: 7 }).exercise_logs, data.exercise_logs);
});

test('de demo beslaat ongeveer een half jaar', () => {
  const first = data.sessions.map((s) => s.planned_date).sort()[0];
  assert.ok(daysBetween(first, today) >= 170, `eerste sessie ${first}`);
  assert.ok(data.sessions.length >= 50, `${data.sessions.length} sessies`);
});

test('alle sessies liggen voor vandaag, op een trainingsdag, en zijn afgesloten', () => {
  for (const s of data.sessions) {
    assert.ok(s.planned_date < today);
    assert.ok(isTrainingDay(s.planned_date), s.planned_date);
    assert.ok(['voltooid', 'overgeslagen'].includes(s.status));
  }
});

test('de schema\'s volgen de rotatie A -> B -> C zonder gat', () => {
  const order = [...data.sessions].sort((a, b) => (a.planned_date < b.planned_date ? -1 : 1));
  const pos = (s) => data.templates.find((t) => t.id === s.template_id).position;
  for (let i = 1; i < order.length; i += 1) {
    assert.equal(pos(order[i]), (pos(order[i - 1]) + 1) % 3, order[i].planned_date);
  }
});

test('elke verwijzing bestaat', () => {
  const sessionIds = new Set(data.sessions.map((s) => s.id));
  const exerciseIds = new Set(data.exercises.map((e) => e.id));
  const templateIds = new Set(data.templates.map((t) => t.id));
  for (const l of data.exercise_logs) {
    assert.ok(sessionIds.has(l.session_id));
    assert.ok(exerciseIds.has(l.exercise_id));
  }
  for (const te of data.template_exercises) {
    assert.ok(templateIds.has(te.template_id));
    assert.ok(exerciseIds.has(te.exercise_id));
  }
  assert.equal(new Set(data.exercise_logs.map((l) => l.id)).size, data.exercise_logs.length);
});

test('setnummers lopen per oefening per sessie aaneengesloten vanaf 1', () => {
  const groups = new Map();
  for (const l of data.exercise_logs) {
    const k = `${l.session_id}|${l.exercise_id}`;
    groups.set(k, [...(groups.get(k) ?? []), l.set_number]);
  }
  for (const nums of groups.values()) {
    assert.deepEqual([...nums].sort((a, b) => a - b), nums.map((_, i) => i + 1));
  }
});

test('overgeslagen sessies hebben geen logs', () => {
  const skipped = new Set(data.sessions.filter((s) => s.status === 'overgeslagen').map((s) => s.id));
  assert.ok(data.exercise_logs.every((l) => !skipped.has(l.session_id)));
});

test('er zit echte vooruitgang in', () => {
  const bank = data.exercises.find((e) => e.name === 'Bankdrukken');
  const series = seriesFor(data.exercise_logs, data.sessions, bank.id);
  const early = series.slice(0, 4).map((p) => p.bestWeight);
  const late = series.slice(-4).map((p) => p.bestWeight);
  assert.ok(Math.max(...late) > Math.max(...early), `${early} -> ${late}`);
});

test('de demo bevat overgeslagen oefeningen en opmerkingen', () => {
  assert.ok(data.exercise_logs.some((l) => l.skipped));
  assert.ok(data.sessions.some((s) => s.notes));
  assert.ok(data.exercise_feedback.some((f) => f.comment));
});

test('de demo gebruikt precies het echte programma', () => {
  const names = new Set(program.flatMap((t) => t.exercises.map((e) => e.name)));
  assert.deepEqual(new Set(data.exercises.map((e) => e.name)), names);
  assert.equal(data.template_exercises.length, program.reduce((n, t) => n + t.exercises.length, 0));
});

test('demo-feedback: geldige sterren, geldige verwijzingen, één per oefening per sessie', () => {
  const sessionIds = new Set(data.sessions.map((x) => x.id));
  const exerciseIds = new Set(data.exercises.map((e) => e.id));
  const keys = new Set();
  assert.ok(data.exercise_feedback.length > 100, `${data.exercise_feedback.length} beoordelingen`);
  for (const f of data.exercise_feedback) {
    assert.ok(f.rating >= 1 && f.rating <= 5, String(f.rating));
    assert.ok(sessionIds.has(f.session_id) && exerciseIds.has(f.exercise_id));
    const k = `${f.session_id}|${f.exercise_id}`;
    assert.ok(!keys.has(k), `dubbel: ${k}`);
    keys.add(k);
  }
});
