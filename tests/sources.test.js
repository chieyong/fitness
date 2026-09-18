import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoSource, demoStorageKey } from '../src/lib/sources/demo.js';
import { supabaseSource } from '../src/lib/sources/supabase.js';
import * as queries from '../src/lib/queries.js';
import { addDays } from '../src/lib/schedule.js';

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

test('oefening aanmaken en aan een workout koppelen', async () => {
  const src = fresh();
  const ex = await src.createExercise({ name: 'Push-ups', muscle_groups: ['chest'], equipment: 'zonder', measure: 'reps', catalog_key: 'push-ups' });
  const rows = await src.fetchTemplateExercises('demo-tpl-0');
  await src.addTemplateExercise({
    template_id: 'demo-tpl-0', exercise_id: ex.id, position: rows.length + 1, target_sets: 3, target_reps_min: 10,
  });
  const after = await src.fetchTemplateExercises('demo-tpl-0');
  assert.equal(after.length, rows.length + 1);
  assert.equal(after.at(-1).exercise.name, 'Push-ups');
  const all = await src.fetchAllExercises();
  assert.equal(all.find((x) => x.id === ex.id).equipment, 'zonder');
});

test('volgorde wijzigen en een target aanpassen', async () => {
  const src = fresh();
  const rows = await src.fetchTemplateExercises('demo-tpl-0');
  await src.updateTemplateExercisePositions([{ id: rows[0].id, position: 2 }, { id: rows[1].id, position: 1 }]);
  const after = await src.fetchTemplateExercises('demo-tpl-0');
  assert.equal(after[0].id, rows[1].id);
  const changed = await src.updateTemplateExercise(rows[0].id, { target_sets: 5 });
  assert.equal(changed.target_sets, 5);
});

test('oefening uit een workout halen laat de oefening en haar logs staan', async () => {
  const src = fresh();
  const [row] = await src.fetchTemplateExercises('demo-tpl-0');
  const logsBefore = (await src.fetchAllLogs()).filter((l) => l.exercise_id === row.exercise_id).length;
  await src.deleteTemplateExercise(row.id);
  assert.ok(!(await src.fetchTemplateExercises('demo-tpl-0')).some((r) => r.id === row.id));
  assert.ok((await src.fetchAllExercises()).some((e) => e.id === row.exercise_id));
  assert.equal((await src.fetchAllLogs()).filter((l) => l.exercise_id === row.exercise_id).length, logsBefore);
  assert.ok(logsBefore > 0);
});

test('workout toevoegen, hernoemen en archiveren', async () => {
  const src = fresh();
  const d = await src.createTemplate({ label: 'Workout D', position: 3 });
  assert.equal((await src.fetchTemplates()).length, 4);
  assert.equal((await src.renameTemplate(d.id, 'Benen extra')).label, 'Benen extra');

  const templates = await src.fetchTemplates();
  await src.ensureUpcomingSessions(templates, await src.fetchSessions(), today);
  const target = 'demo-tpl-1';
  const before = await src.fetchSessions();
  const history = before.filter((s) => s.template_id === target && s.status !== 'gepland').length;
  assert.ok(before.some((s) => s.template_id === target && s.status === 'gepland'));

  await src.archiveTemplate(target);
  const after = await src.fetchSessions();
  assert.ok(!(await src.fetchTemplates()).some((t) => t.id === target));
  assert.ok(!after.some((s) => s.template_id === target && s.status === 'gepland'));
  assert.equal(after.filter((s) => s.template_id === target).length, history);
});

test('feedback: sterren en opmerking bewaren als één rij per oefening per sessie', async () => {
  const src = fresh();
  const [session] = await src.fetchSessions();
  const [exercise] = await src.fetchAllExercises();
  const key = { session_id: session.id, exercise_id: exercise.id };

  const a = await src.saveFeedback({ ...key, rating: 4, comment: '' });
  const b = await src.saveFeedback({ ...key, rating: 4, comment: '  Ging goed  ' });
  assert.equal(a.id, b.id);
  assert.equal(b.comment, 'Ging goed');
  assert.equal(a.comment, null);

  const mine = (await src.fetchFeedbackForExercises([exercise.id]))
    .filter((f) => f.session_id === session.id);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].rating, 4);

  const cleared = await src.saveFeedback({ ...key, rating: null, comment: null });
  assert.equal(cleared.rating, null);
});

test("video's bij een oefening opslaan en terugzien in het schema", async () => {
  const src = fresh();
  const [row] = await src.fetchTemplateExercises('demo-tpl-0');
  const urls = ['https://www.youtube.com/watch?v=abcdefghijk'];
  const updated = await src.updateExercise(row.exercise_id, { video_urls: urls });
  assert.deepEqual(updated.video_urls, urls);
  const again = await src.fetchTemplateExercises('demo-tpl-0');
  assert.deepEqual(again[0].exercise.video_urls, urls);
  assert.deepEqual((await src.fetchAllExercises()).find((e) => e.id === row.exercise_id).video_urls, urls);
});

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test('demo-aanpassingen overleven herladen, maar een nieuwe dag begint vers', async () => {
  const storage = memoryStorage();
  const url = 'https://www.youtube.com/watch?v=abcdefghijk';
  const a = createDemoSource({ today, storage });
  const [row] = await a.fetchTemplateExercises('demo-tpl-0');
  await a.updateTemplateExercise(row.id, { target_sets: 7 });
  await a.updateExercise(row.exercise_id, { video_urls: [url] });

  const reloaded = createDemoSource({ today, storage });
  const [again] = await reloaded.fetchTemplateExercises('demo-tpl-0');
  assert.equal(again.target_sets, 7);
  assert.deepEqual(again.exercise.video_urls, [url]);

  const tomorrow = createDemoSource({ today: '2026-09-20', storage });
  assert.notEqual((await tomorrow.fetchTemplateExercises('demo-tpl-0'))[0].target_sets, 7);
});

test('nieuwe id\'s botsen niet na herladen', async () => {
  const storage = memoryStorage();
  const a = createDemoSource({ today, storage });
  const [s1] = await a.fetchSessions();
  const [e1] = await a.fetchAllExercises();
  const first = await a.saveSet({ session_id: s1.id, exercise_id: e1.id, set_number: 99, reps: 5 });
  const b = createDemoSource({ today, storage });
  const second = await b.saveSet({ session_id: s1.id, exercise_id: e1.id, set_number: 98, reps: 6 });
  assert.notEqual(first.id, second.id);
  assert.equal((await b.fetchAllLogs()).filter((l) => l.id === first.id).length, 1);
});

test('kapotte opslag valt terug op een verse demo', async () => {
  const storage = memoryStorage();
  storage.setItem(demoStorageKey('nl'), '{kapot');
  assert.equal((await createDemoSource({ today, storage }).fetchTemplates()).length, 3);
});

test('met de structuur op slot mogen targets wel, workouts en oefeningen niet', async () => {
  const src = createDemoSource({ today, lockStructure: true });
  await assert.rejects(src.createTemplate({ label: 'Workout D', position: 3 }), /demo/);
  await assert.rejects(src.renameTemplate('demo-tpl-0', 'X'), /demo/);
  await assert.rejects(src.archiveTemplate('demo-tpl-0'), /demo/);
  const [row] = await src.fetchTemplateExercises('demo-tpl-0');
  await assert.rejects(src.deleteTemplateExercise(row.id), /demo/);
  await assert.rejects(src.addTemplateExercise({ template_id: 'demo-tpl-0', exercise_id: row.exercise_id, position: 99, target_sets: 3 }), /demo/);
  assert.equal((await src.updateTemplateExercise(row.id, { target_sets: 2 })).target_sets, 2);
  assert.ok(await src.updateExercise(row.exercise_id, { video_urls: null }));
});

test('planning: standaard, opslaan en opschonen', async () => {
  const src = fresh();
  assert.deepEqual(await src.fetchScheduleSettings(), { training_days: [2, 4, 6], rotation: 'volgorde' });
  const saved = await src.saveScheduleSettings({ training_days: [5, 1, 1, 9], rotation: 'willekeurig' });
  assert.deepEqual(saved, { training_days: [1, 5], rotation: 'willekeurig' });
  assert.deepEqual(await src.fetchScheduleSettings(), saved);
});

test('vooruit plannen volgt de gekozen trainingsdagen', async () => {
  const src = fresh();
  const all = await src.ensureUpcomingSessions(await src.fetchTemplates(), await src.fetchSessions(), today,
    { training_days: [1, 3, 5], rotation: 'volgorde' });
  const open = all.filter((x) => x.status === 'gepland');
  assert.equal(open.length, 6);
  for (const x of open) {
    assert.ok([1, 3, 5].includes(new Date(`${x.planned_date}T00:00:00Z`).getUTCDay()), x.planned_date);
  }
});

test('opnieuw indelen wist alleen toekomstige geplande trainingen zonder logs', async () => {
  const src = fresh();
  const all = await src.ensureUpcomingSessions(await src.fetchTemplates(), await src.fetchSessions(), today);
  const open = all.filter((x) => x.status === 'gepland');
  const [first, second] = open;
  const [ex] = await src.fetchAllExercises();
  await src.saveSet({ session_id: first.id, exercise_id: ex.id, set_number: 1, reps: 5 });
  const removed = await src.replanUpcoming(today);
  const after = await src.fetchSessions();
  assert.equal(removed, open.length - 1);
  assert.ok(after.some((x) => x.id === first.id));
  assert.ok(!after.some((x) => x.id === second.id));
});

test('in de demo is ook de planning op slot; zonder slot blijft hij bewaard', async () => {
  const locked = createDemoSource({ today, lockStructure: true, locale: 'en' });
  await assert.rejects(locked.saveScheduleSettings({ training_days: [1], rotation: 'willekeurig' }), /demo/i);
  await assert.rejects(locked.replanUpcoming(today), /demo/i);

  const storage = memoryStorage();
  const a = createDemoSource({ today, storage });
  await a.saveScheduleSettings({ training_days: [1], rotation: 'willekeurig' });
  const b = createDemoSource({ today, storage });
  assert.deepEqual(await b.fetchScheduleSettings(), { training_days: [1], rotation: 'willekeurig' });
});

test('Engelse demo: Engelse namen, en een eigen opslag per taal', async () => {
  const storage = memoryStorage();
  const en = createDemoSource({ today, storage, locale: 'en' });
  const names = (await en.fetchAllExercises()).map((e) => e.name);
  assert.ok(names.includes('Bench press') && names.includes('Lunges'), names.join(', '));
  assert.ok(!names.includes('Bankdrukken'));
  const [row] = await en.fetchTemplateExercises('demo-tpl-0');
  await en.updateTemplateExercise(row.id, { target_sets: 9 });
  const nl = createDemoSource({ today, storage, locale: 'nl' });
  assert.notEqual((await nl.fetchTemplateExercises('demo-tpl-0'))[0].target_sets, 9);
  assert.ok((await nl.fetchAllExercises()).some((e) => e.name === 'Bankdrukken'));
});

test('een ingevulde sessie sluit vanzelf zodra die dag voorbij is', async () => {
  const src = fresh();
  await src.ensureUpcomingSessions(await src.fetchTemplates(), await src.fetchSessions(), today);
  const open = (await src.fetchSessions()).find((s) => s.status === 'gepland');
  const morgen = addDays(open.planned_date, 1);
  const [exercise] = await src.fetchAllExercises();
  await src.saveSet({ session_id: open.id, exercise_id: exercise.id, set_number: 1, reps: 10, weight_kg: 40 });

  // Op de dag zelf verandert er niets: je kunt nog bezig zijn.
  const zelfde = await src.closeStaleSessions(await src.fetchSessions(), open.planned_date);
  assert.equal(zelfde.find((s) => s.id === open.id).status, 'gepland');

  const na = await src.closeStaleSessions(zelfde, morgen);
  const closed = na.find((s) => s.id === open.id);
  assert.equal(closed.status, 'voltooid');
  assert.equal(closed.actual_date, open.planned_date);
});

test('een sessie waar niets in staat blijft open en schuift door', async () => {
  const src = fresh();
  await src.ensureUpcomingSessions(await src.fetchTemplates(), await src.fetchSessions(), today);
  const open = (await src.fetchSessions()).find((s) => s.status === 'gepland');
  const na = await src.closeStaleSessions(await src.fetchSessions(), '2026-09-30');
  assert.equal(na.find((s) => s.id === open.id).status, 'gepland');
});
