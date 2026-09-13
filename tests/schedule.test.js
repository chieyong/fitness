import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, dayOfWeek, isTrainingDay, nextTrainingDay,
  projectSchedule, resolveToday, planNextSessions,
  formatTarget, formatDateLong,
} from '../src/lib/schedule.js';

// Referentiedatums (2026): di 15 sep, do 17 sep, za 19 sep, di 22 sep.
const DI = '2026-09-15';
const WO = '2026-09-16';
const DO = '2026-09-17';
const ZA = '2026-09-19';
const ZO = '2026-09-20';
const DI2 = '2026-09-22';

const templates = [
  { id: 'a', label: 'Workout A', position: 0 },
  { id: 'b', label: 'Workout B', position: 1 },
  { id: 'c', label: 'Workout C', position: 2 },
];

const session = (id, template_id, planned_date, status = 'gepland') =>
  ({ id, template_id, planned_date, status });

test('trainingsdagen zijn di, do, za', () => {
  assert.equal(dayOfWeek(DI), 2);
  assert.ok(isTrainingDay(DI) && isTrainingDay(DO) && isTrainingDay(ZA));
  assert.ok(!isTrainingDay(WO) && !isTrainingDay(ZO));
});

test('nextTrainingDay slaat rustdagen over en respecteert inclusive', () => {
  assert.equal(nextTrainingDay(DI), DO);
  assert.equal(nextTrainingDay(ZA), DI2);           // over het weekend heen
  assert.equal(nextTrainingDay(DI, { inclusive: true }), DI);
  assert.equal(nextTrainingDay(WO, { inclusive: true }), DO);
});

test('op schema: sessie van vandaag is de sessie van vandaag', () => {
  const sessions = [session('s1', 'a', DI), session('s2', 'b', DO)];
  const { current, isRestDay, backlog } = resolveToday(sessions, DI);
  assert.equal(current.session.id, 's1');
  assert.equal(current.shifted, false);
  assert.equal(isRestDay, false);
  assert.equal(backlog.length, 0);
});

test('rustdag zonder achterstand toont geen sessie', () => {
  const sessions = [session('s1', 'a', DO)];
  const { current, isRestDay, upcoming } = resolveToday(sessions, WO);
  assert.equal(current, null);
  assert.equal(isRestDay, true);
  assert.equal(upcoming[0].date, DO);
});

test('gemiste sessie is vandaag in te halen, ook op een rustdag', () => {
  const sessions = [session('s1', 'a', DI), session('s2', 'b', DO)];
  const { current, isTrainingDay: td } = resolveToday(sessions, WO);
  assert.equal(current.session.id, 's1');           // de gemiste A, niet B
  assert.equal(current.shifted, true);
  assert.equal(current.overdue_days, 1);
  assert.equal(td, false);                          // woensdag blijft een rustdag
});

test('alles schuift op: volgorde A -> B -> C blijft intact', () => {
  const sessions = [
    session('s1', 'a', DI),
    session('s2', 'b', DO),
    session('s3', 'c', ZA),
  ];
  const schedule = projectSchedule(sessions, WO);
  assert.deepEqual(
    schedule.map((e) => [e.session.template_id, e.date]),
    [['a', WO], ['b', DO], ['c', ZA]],
  );
});

test('twee gemiste sessies stapelen; geen enkele vervalt', () => {
  const sessions = [
    session('s1', 'a', DI),
    session('s2', 'b', DO),
    session('s3', 'c', ZA),
  ];
  const schedule = projectSchedule(sessions, ZO);   // di, do en za allemaal gemist
  assert.equal(schedule.length, 3);
  assert.deepEqual(
    schedule.map((e) => [e.session.template_id, e.date]),
    [['a', ZO], ['b', DI2], ['c', '2026-09-24']],
  );
  assert.equal(schedule[0].overdue_days, 5);
});

test('afgeronde en overgeslagen sessies tellen niet meer mee', () => {
  const sessions = [
    session('s1', 'a', DI, 'voltooid'),
    session('s2', 'b', DO, 'overgeslagen'),
    session('s3', 'c', ZA),
  ];
  const { current } = resolveToday(sessions, ZA);
  assert.equal(current.session.id, 's3');
  assert.equal(current.shifted, false);
});

test('toekomstige sessies worden niet naar voren getrokken', () => {
  const sessions = [session('s1', 'a', DI2)];
  const schedule = projectSchedule(sessions, DI);
  assert.equal(schedule[0].date, DI2);
});

test('planNextSessions vult aan in rotatie vanaf de laatste sessie', () => {
  const sessions = [session('s1', 'a', DI, 'voltooid')];
  const created = planNextSessions(templates, sessions, DI, 3);
  assert.deepEqual(
    created.map((s) => [s.template_id, s.planned_date]),
    [['b', DO], ['c', ZA], ['a', DI2]],
  );
  assert.ok(created.every((s) => s.status === 'gepland'));
});

test('planNextSessions start bij A als er nog niets is', () => {
  const created = planNextSessions(templates, [], WO, 2);
  assert.deepEqual(
    created.map((s) => [s.template_id, s.planned_date]),
    [['a', DO], ['b', ZA]],
  );
});

test('planNextSessions doet niets als er genoeg openstaat', () => {
  const sessions = [session('s1', 'a', DO), session('s2', 'b', ZA)];
  assert.deepEqual(planNextSessions(templates, sessions, DI, 2), []);
});

test('formatters', () => {
  assert.equal(formatTarget({ target_sets: 3, target_reps_min: 10, target_reps_max: 12 }), '3 × 10-12');
  assert.equal(formatTarget({ target_sets: 3, target_reps_min: 12, target_reps_max: 12 }), '3 × 12');
  assert.equal(formatTarget({ target_sets: 3, target_reps_min: 1, target_seconds: 60 }), '3 × 60 sec');
  assert.equal(formatDateLong(DI, DI), 'Vandaag');
  assert.equal(formatDateLong(WO, DI), 'Morgen');
  assert.equal(formatDateLong(ZA, DI), 'Zaterdag 19 september');
});

test('rond een maandgrens blijft de rekenkunde kloppen', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');   // geen schrikkeljaar
  assert.equal(nextTrainingDay('2026-12-31'), '2027-01-02');
});
