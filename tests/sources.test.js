import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoSource } from '../src/lib/sources/demo.js';
import { supabaseSource } from '../src/lib/sources/supabase.js';
import * as queries from '../src/lib/queries.js';

const today = '2026-09-13';
const fresh = () => createDemoSource({ today });

test('demo en Supabase bieden precies dezelfde functies', () => {
  assert.deepEqual(Object.keys(fresh()).sort(), Object.keys(supabaseSource).sort());
});

test('de schakelaar stuurt alle queries naar de gekozen bron', async () => {
  queries.setDataSource('demo');
  assert.equal(queries.dataMode(), 'demo');
  const t = await queries.fetchTemplates();
  assert.deepEqual(t.map((x) => x.id), ['demo-tpl-0', 'demo-tpl-1', 'demo-tpl-2']);
  queries.setDataSource('supabase');
  assert.equal(queries.dataMode(), 'supabase');
});

test('saveSet werkt als upsert op sessie, oefening en setnummer', async () => {
  const src = fresh();
  const [session] = await src.fetchSessions();
  const [exercise] = await src.fetchAllExercises();
  const base = { session_id: session.id, exercise_id: exercise.id, set_number: 99 };

  const a = await src.saveSet({ ...base, reps: 8, weight_kg: 20 });
  const b = await src.saveSet({ ...base, reps: 9, weight_kg: 22.5 });
  assert.equal(a.id, b.id);
  const rows = (await src.fetchAllLogs()).filter((l) => l.set_number === 99);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].weight_kg, 22.5);

  await src.deleteSet(a.id);
  assert.equal((await src.fetchAllLogs()).filter((l) => l.set_number === 99).length, 0);
});

test('niet gedaan vervangt de sets van die oefening, en terugdraaien wist ze', async () => {
  const src = fresh();
  const logs = await src.fetchAllLogs();
  const { session_id, exercise_id } = logs.find((l) => !l.skipped);
  const mine = async () => (await src.fetchAllLogs())
    .filter((l) => l.session_id === session_id && l.exercise_id === exercise_id);

  await src.setExerciseSkipped(session_id, exercise_id, true);
  assert.deepEqual((await mine()).map((l) => l.skipped), [true]);
  await src.setExerciseSkipped(session_id, exercise_id, false);
  assert.equal((await mine()).length, 0);
});

test('vooruit plannen vult aan tot zes open sessies, en niet vaker', async () => {
  const src = fresh();
  const templates = await src.fetchTemplates();
  const after = await src.ensureUpcomingSessions(templates, await src.fetchSessions(), today);
  const open = after.filter((s) => s.status === 'gepland');
  assert.equal(open.length, 6);
  assert.ok(open.every((s) => s.planned_date >= today));
  const again = await src.ensureUpcomingSessions(templates, after, today);
  assert.equal(again.length, after.length);
});

test('sessie afronden, heropenen en een opmerking bewaren', async () => {
  const src = fresh();
  const templates = await src.fetchTemplates();
  const sessions = await src.ensureUpcomingSessions(templates, await src.fetchSessions(), today);
  const next = sessions.find((s) => s.status === 'gepland');

  const closed = await src.closeSession(next.id, { status: 'voltooid', actualDate: today, notes: 'Ging lekker' });
  assert.equal(closed.status, 'voltooid');
  assert.equal(closed.notes, 'Ging lekker');
  assert.equal((await src.reopenSession(next.id)).actual_date, null);
  assert.equal((await src.saveSessionNote(next.id, '')).notes, null);
});

test('resultaten zijn kopieën: wijzigen lekt niet terug in de demo', async () => {
  const src = fresh();
  const [t] = await src.fetchTemplates();
  t.label = 'Gekaapt';
  assert.equal((await src.fetchTemplates())[0].label, 'Workout A');
});

test('oefeningen per schema komen met hun oefening en in volgorde', async () => {
  const src = fresh();
  const rows = await src.fetchTemplateExercises('demo-tpl-0');
  assert.equal(rows[0].exercise.name, 'Bankdrukken');
  assert.deepEqual(rows.map((r) => r.position), rows.map((_, i) => i + 1));
  const where = await src.fetchExerciseTemplates(rows[1].exercise_id);
  assert.deepEqual(where.map((w) => w.template.label).sort(), ['Workout A', 'Workout C']);
});

test('twee demo-bronnen delen geen staat', async () => {
  const a = fresh();
  const b = fresh();
  const [s] = await a.fetchSessions();
  await a.saveSessionNote(s.id, 'alleen in a');
  assert.notEqual((await b.fetchSessions())[0].notes, 'alleen in a');
});
