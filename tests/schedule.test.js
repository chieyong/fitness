import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, dayOfWeek, isTrainingDay, nextTrainingDay,
  projectSchedule, resolveToday, planNextSessions,
  formatTarget, formatDateLong, formatDateShort,
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

test('een sessie die vandaag gepland staat blijft vandaag staan', () => {
  // Zondag is geen trainingsdag, maar deze sessie staat er expliciet op --
  // bijvoorbeeld na het heropenen van een afgeronde training.
  const sessions = [session('s1', 'a', ZO), session('s2', 'b', DI2)];
  const view = resolveToday(sessions, ZO);
  assert.equal(view.current.session.id, 's1');
  assert.equal(view.current.shifted, false);
  assert.equal(view.isRestDay, false);
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

test('een afgeronde sessie is zichtbaar op zijn eigen dag', () => {
  const sessions = [
    { id: 's1', template_id: 'a', planned_date: DI, actual_date: DI, status: 'voltooid' },
    session('s2', 'b', DO),
  ];
  const view = resolveToday(sessions, DI);
  assert.equal(view.current, null);          // niets meer te doen
  assert.equal(view.done.id, 's1');
  assert.equal(view.isRestDay, false);       // maar het was geen rustdag
});

test('een afgeronde sessie blokkeert de planning van vandaag niet', () => {
  const sessions = [
    { id: 's1', template_id: 'a', planned_date: DI, actual_date: DI, status: 'voltooid' },
    session('s2', 'b', DI),
  ];
  const view = resolveToday(sessions, DI);
  assert.equal(view.current.session.id, 's2');
  assert.equal(view.done.id, 's1');
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
  assert.equal(formatTarget({ target_sets: 3, target_seconds: 60 }), '3 × 60 sec');
  assert.equal(formatTarget({ target_sets: 3, target_seconds: 30, target_seconds_max: 45 }), '3 × 30-45 sec');
  assert.equal(formatTarget({ target_sets: 3, target_reps_min: 12, target_note: 'per been' }), '3 × 12 per been');
  assert.equal(formatTarget({ target_sets: 3, target_seconds: 30, target_note: 'per kant' }), '3 × 30 sec per kant');
  assert.equal(formatDateLong(DI, DI), 'Vandaag');
  assert.equal(formatDateLong(WO, DI), 'Morgen');
  assert.equal(formatDateLong(ZA, DI), 'Zaterdag 19 september');
});

test('rond een maandgrens blijft de rekenkunde kloppen', () => {
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');   // geen schrikkeljaar
  assert.equal(nextTrainingDay('2026-12-31'), '2027-01-02');
});

// Voorspelbaar 'toeval' voor de tests.
const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

test('willekeurig: elke ronde bevat elke workout precies één keer', () => {
  const created = planNextSessions(templates, [], DI, 9, { rotation: 'willekeurig', random: seeded(7) });
  for (let r = 0; r < 3; r += 1) {
    const round = created.slice(r * 3, r * 3 + 3);
    assert.deepEqual(round.map((x) => x.template_id).sort(), ['a', 'b', 'c']);
    assert.ok(round.every((x) => x.cycle === r + 1), `ronde ${r + 1}`);
  }
});

test('willekeurig: nooit twee keer dezelfde workout achter elkaar, ook niet over een rondegrens', () => {
  for (let seed = 1; seed < 80; seed += 1) {
    const c = planNextSessions(templates, [], DI, 12, { rotation: 'willekeurig', random: seeded(seed) });
    for (let i = 1; i < c.length; i += 1) {
      assert.notEqual(c[i].template_id, c[i - 1].template_id, `seed ${seed}, positie ${i}`);
    }
  }
});

test('willekeurig: een halve ronde wordt eerst afgemaakt', () => {
  const history = [
    { ...session('s1', 'b', '2026-09-08', 'voltooid'), cycle: 4 },
    { ...session('s2', 'a', '2026-09-10', 'voltooid'), cycle: 4 },
  ];
  const c = planNextSessions(templates, history, DI, 2, { rotation: 'willekeurig', random: seeded(3) });
  assert.equal(c[0].template_id, 'c');
  assert.equal(c[0].cycle, 4);
  assert.equal(c[1].cycle, 5);
  assert.notEqual(c[1].template_id, 'c');
});

test('willekeurig: geschiedenis zonder rondenummers begint een nieuwe ronde', () => {
  const history = [session('s1', 'a', '2026-09-10', 'voltooid')];
  const c = planNextSessions(templates, history, DI, 3, { rotation: 'willekeurig', random: seeded(11) });
  assert.deepEqual(c.map((x) => x.cycle), [1, 1, 1]);
  assert.deepEqual(c.map((x) => x.template_id).sort(), ['a', 'b', 'c']);
  assert.notEqual(c[0].template_id, 'a');
});

test('willekeurig: een verwijderde workout telt niet mee in de lopende ronde', () => {
  const active = templates.filter((t) => t.id !== 'c');
  const history = [
    { ...session('s1', 'c', '2026-09-08', 'voltooid'), cycle: 2 },
    { ...session('s2', 'a', '2026-09-10', 'voltooid'), cycle: 2 },
  ];
  const c = planNextSessions(active, history, DI, 1, { rotation: 'willekeurig', random: seeded(5) });
  assert.equal(c[0].template_id, 'b');
  assert.equal(c[0].cycle, 2);
});

test('op volgorde blijft zoals het was, zonder rondenummer', () => {
  const c = planNextSessions(templates, [session('s1', 'a', DI, 'voltooid')], DI, 3);
  assert.deepEqual(c.map((x) => x.template_id), ['b', 'c', 'a']);
  assert.ok(c.every((x) => x.cycle === null));
});

test('eigen trainingsdagen: maandag, woensdag en vrijdag', () => {
  const c = planNextSessions(templates, [], '2026-09-14', 4, { trainingDays: [1, 3, 5] });
  assert.deepEqual(c.map((x) => x.planned_date), ['2026-09-14', '2026-09-16', '2026-09-18', '2026-09-21']);
});

test('ligt de laatste training in het verleden, dan telt vandaag als trainingsdag mee', () => {
  // Gisteren (zondag) getraind, vandaag is dinsdag een trainingsdag: vandaag hoort erbij.
  const c = planNextSessions(templates, [session('s1', 'a', ZO, 'voltooid')], DI2, 2);
  assert.equal(c[0].planned_date, DI2);
  // Staat er vandaag al een training, dan pas de volgende trainingsdag.
  const d = planNextSessions(templates, [session('s1', 'a', DI, 'voltooid')], DI, 1);
  assert.equal(d[0].planned_date, DO);
});

test('willekeurig: een nieuwe ronde heeft altijd een andere volgorde dan de vorige', () => {
  for (let seed = 1; seed < 150; seed += 1) {
    const c = planNextSessions(templates, [], DI, 15, { rotation: 'willekeurig', random: seeded(seed) });
    const rounds = [0, 3, 6, 9, 12].map((i) => c.slice(i, i + 3).map((x) => x.template_id).join(''));
    for (let r = 1; r < rounds.length; r += 1) {
      assert.notEqual(rounds[r], rounds[r - 1], `seed ${seed}, ronde ${r + 1}: ${rounds.join(' | ')}`);
    }
    for (let i = 1; i < c.length; i += 1) assert.notEqual(c[i].template_id, c[i - 1].template_id);
  }
});

test('willekeurig: ook na een eerder afgeronde ronde uit de geschiedenis een andere volgorde', () => {
  const history = [
    { ...session('s1', 'c', '2026-09-08', 'voltooid'), cycle: 3 },
    { ...session('s2', 'b', '2026-09-10', 'voltooid'), cycle: 3 },
    { ...session('s3', 'a', '2026-09-12', 'voltooid'), cycle: 3 },
  ];
  for (let seed = 1; seed < 100; seed += 1) {
    const c = planNextSessions(templates, history, DI, 3, { rotation: 'willekeurig', random: seeded(seed) });
    assert.notEqual(c.map((x) => x.template_id).join(''), 'cba', `seed ${seed}`);
    assert.notEqual(c[0].template_id, 'a');
    assert.ok(c.every((x) => x.cycle === 4));
  }
});

test('datums en targets in het Engels', () => {
  assert.equal(formatDateShort('2026-09-15', 'en'), 'Tue 15 Sep');
  assert.equal(formatDateLong('2026-09-19', '2026-09-15', 'en'), 'Saturday 19 September');
  assert.equal(formatDateLong('2026-09-15', '2026-09-15', 'en'), 'Today');
  assert.equal(formatDateLong('2026-09-16', '2026-09-15', 'en'), 'Tomorrow');
  assert.equal(formatTarget({ target_sets: 3, target_reps_min: 12, target_note: 'per been' }, 'en'), '3 × 12 per leg');
  assert.equal(formatTarget({ target_sets: 3, target_seconds: 30, target_note: 'per kant' }, 'en'), '3 × 30 sec per side');
  assert.equal(formatDateShort('2026-09-15'), 'di 15 sep');
});
