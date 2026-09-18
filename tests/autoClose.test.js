import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionsToAutoClose, workedDate } from '../src/lib/autoClose.js';

// Referentiedatums (2026): di 15 sep, do 17 sep, za 19 sep.
const DI = '2026-09-15';
const DO = '2026-09-17';
const ZA = '2026-09-19';

const session = (id, planned_date, status = 'gepland') => ({ id, planned_date, status });

/** Middags in de lokale tijd, zodat de lokale dag in elke tijdzone klopt. */
const at = (iso, hour = 12) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
};

const set = (session_id, logged_at, extra = {}) =>
  ({ session_id, skipped: false, logged_at, ...extra });

test('ingevulde sessie van een vorige dag sluit vanzelf, op de dag van het werk', () => {
  const sessions = [session('s1', DI)];
  const logs = [set('s1', at(DI)), set('s1', at(DI, 13))];

  assert.deepEqual(sessionsToAutoClose(sessions, logs, DO), [{ id: 's1', actualDate: DI }]);
});

test('vandaag blijft open: je kunt nog bezig zijn', () => {
  const sessions = [session('s1', DI)];

  assert.deepEqual(sessionsToAutoClose(sessions, [set('s1', at(DI))], DI), []);
});

test('doorgewerkt op een latere dag: die dag telt, en pas daarna sluit hij', () => {
  const sessions = [session('s1', DI)];
  const logs = [set('s1', at(DI)), set('s1', at(DO))];

  assert.equal(workedDate(sessions[0], logs), DO);
  assert.deepEqual(sessionsToAutoClose(sessions, logs, DO), []);
  assert.deepEqual(sessionsToAutoClose(sessions, logs, ZA), [{ id: 's1', actualDate: DO }]);
});

test('lege sessie blijft open en schuift door: dat is inhaalwerk', () => {
  assert.deepEqual(sessionsToAutoClose([session('s1', DI)], [], DO), []);
});

test('alleen "niet gedaan" aangevinkt is geen ingevulde sessie', () => {
  const logs = [set('s1', at(DI), { skipped: true })];

  assert.deepEqual(sessionsToAutoClose([session('s1', DI)], logs, DO), []);
});

test('een afgeronde of overgeslagen sessie blijft zoals hij is', () => {
  const sessions = [session('s1', DI, 'voltooid'), session('s2', DI, 'overgeslagen')];
  const logs = [set('s1', at(DI)), set('s2', at(DI))];

  assert.deepEqual(sessionsToAutoClose(sessions, logs, DO), []);
});

test('zonder tijdstempel geldt de plandatum als de dag van het werk', () => {
  const sessions = [session('s1', DI)];
  const logs = [set('s1', null)];

  assert.equal(workedDate(sessions[0], logs), DI);
  assert.deepEqual(sessionsToAutoClose(sessions, logs, DO), [{ id: 's1', actualDate: DI }]);
  assert.deepEqual(sessionsToAutoClose(sessions, logs, DI), []);
});

test('een onleesbaar tijdstempel valt terug op de plandatum', () => {
  const sessions = [session('s1', DI)];

  assert.equal(workedDate(sessions[0], [set('s1', 'gisteren')]), DI);
});

test('logs van een andere sessie tellen niet mee', () => {
  const sessions = [session('s1', DI), session('s2', DO)];
  const logs = [set('s1', at(DI))];

  assert.deepEqual(sessionsToAutoClose(sessions, logs, ZA), [{ id: 's1', actualDate: DI }]);
});
