/**
 * Genereert supabase/seed.sql uit scripts/source-data.mjs.
 * Draaien met: npm run generate-seed
 */
import { writeFileSync } from 'node:fs';
import { templates, history, SKIP, ASSUMPTIONS } from './source-data.mjs';

const q = (v) => (v === undefined || v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === undefined || v === null ? 'null' : String(v));
const arr = (items) => `array[${items.map(q).join(', ')}]`;

const out = [];
const w = (s = '') => out.push(s);

w('-- GEGENEREERD BESTAND — niet met de hand aanpassen.');
w('-- Bron: scripts/source-data.mjs — pas die aan en draai `npm run generate-seed`.');
w('--');
w('-- Aannames bij het overzetten van de bestaande aantekeningen:');
for (const a of ASSUMPTIONS) w(`--   - ${a}`);
w();
w('begin;');
w();
w('-- Schoon beginnen: dit vervangt de placeholder-seed volledig.');
w('delete from exercise_feedback;');
w('delete from exercise_logs;');
w('delete from sessions;');
w('delete from template_exercises;');
w('delete from exercises;');
w('delete from workout_templates;');
w();

/**
 * Oefeningen: uniek op naam, in volgorde van voorkomen. Dezelfde oefening mag in
 * meerdere schema's zitten -- targets mogen dan per schema verschillen, maar de
 * spiergroepen niet, want daarop wordt later geaggregeerd.
 */
const seen = new Map();
const problems = [];

for (const t of templates) {
  for (const e of t.exercises) {
    const known = seen.get(e.name);
    if (!known) {
      seen.set(e.name, e);
      continue;
    }
    if (known.equipment !== e.equipment || known.measure !== e.measure) {
      problems.push(`"${e.name}" heeft verschillend materiaal of meetwijze in ${t.label}`);
    }
    if (known.muscles.join() !== e.muscles.join()) {
      problems.push(`"${e.name}" heeft verschillende spiergroepen: [${known.muscles}] en [${e.muscles}] (${t.label})`);
    }
  }
}

// Elke gelogde oefening moet in het schema van die sessie zitten; anders is er
// een naam verschreven en verdwijnt de regel stilzwijgend bij het joinen.
for (const h of history) {
  const template = templates.find((t) => t.label === h.template);
  if (!template) {
    problems.push(`Sessie ${h.date} verwijst naar onbekend schema "${h.template}"`);
    continue;
  }
  const inTemplate = new Set(template.exercises.map((e) => e.name));
  for (const name of Object.keys(h.logs)) {
    if (!inTemplate.has(name)) {
      problems.push(`Sessie ${h.date}: "${name}" staat niet in ${h.template}`);
    }
  }
}

if (problems.length > 0) {
  console.error('\nDe brondata is niet consistent:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nCorrigeer scripts/source-data.mjs en draai opnieuw.\n');
  process.exit(1);
}

w('insert into exercises (name, muscle_groups, notes, equipment, measure) values');
w([...seen.values()]
  .map((e) => `  (${q(e.name)}, ${arr(e.muscles)}, ${q(e.notes)}, ${q(e.equipment)}, ${q(e.measure)})`)
  .join(',\n') + ';');
w();

w('insert into workout_templates (label, position) values');
w(templates.map((t) => `  (${q(t.label)}, ${n(t.position)})`).join(',\n') + ';');
w();

for (const t of templates) {
  w(`-- ${t.label}`);
  w('insert into template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_seconds, target_seconds_max, target_note)');
  w('select t.id, e.id, v.position, v.sets, v.reps_min, v.reps_max, v.seconds, v.seconds_max, v.target_note');
  w('from (values');
  w(t.exercises
    .map((e, i) => `  (${q(e.name)}, ${i + 1}, ${n(e.sets)}, ${n(e.reps)}::int, ${n(e.repsMax)}::int, ${n(e.seconds)}::int, ${n(e.secondsMax)}::int, ${q(e.targetNote)}::text)`)
    .join(',\n'));
  w(') as v(name, position, sets, reps_min, reps_max, seconds, seconds_max, target_note)');
  w('join exercises e on e.name = v.name');
  w(`join workout_templates t on t.label = ${q(t.label)};`);
  w();
}

w('-- Geschiedenis: één sessie per trainingsdag, één rij per set.');
for (const h of history) {
  w(`-- ${h.date} — ${h.template}`);
  w(`insert into sessions (template_id, planned_date, actual_date, status)`);
  w(`select id, ${q(h.date)}, ${q(h.date)}, 'voltooid' from workout_templates where label = ${q(h.template)};`);
  w();

  const rows = [];
  for (const [name, value] of Object.entries(h.logs)) {
    if (value === SKIP) {
      rows.push(`  (${q(name)}, 1, null::int, null::numeric, true, null::text)`);
      continue;
    }
    const sets = Array.isArray(value) ? value : value.sets;
    const note = Array.isArray(value) ? null : value.note;
    sets.forEach(([reps, weight], i) => {
      rows.push(`  (${q(name)}, ${i + 1}, ${n(reps)}::int, ${n(weight)}::numeric, false, ${i === 0 ? q(note) : 'null'}::text)`);
    });
  }

  w('insert into exercise_logs (session_id, exercise_id, set_number, reps, weight_kg, skipped, note)');
  w('select s.id, e.id, v.set_number, v.reps, v.weight_kg, v.skipped, v.note');
  w('from (values');
  w(rows.join(',\n'));
  w(') as v(name, set_number, reps, weight_kg, skipped, note)');
  w('join exercises e on e.name = v.name');
  w('join workout_templates t on t.label = ' + q(h.template));
  w(`join sessions s on s.template_id = t.id and s.planned_date = ${q(h.date)};`);
  w();
}

w('-- Opmerkingen per oefening ook als feedback, zoals migratie 005 doet.');
w('insert into exercise_feedback (session_id, exercise_id, comment)');
w("select session_id, exercise_id, string_agg(note, ' ' order by set_number)");
w("from exercise_logs where note is not null and btrim(note) <> ''");
w('group by session_id, exercise_id;');
w();
w('commit;');
w();

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n'));
const shared = [...seen.keys()].filter(
  (name) => templates.filter((t) => t.exercises.some((e) => e.name === name)).length > 1,
);

console.log(`seed.sql geschreven — ${seen.size} oefeningen, ${templates.length} schema's, ${history.length} sessies.`);
if (shared.length > 0) {
  console.log(`Gedeeld over meerdere schema's: ${shared.join(', ')}`);
}
