/**
 * Print de cijfers waar het wekelijkse advies op gebaseerd wordt -- precies
 * wat er straks naar het model gaat, maar dan leesbaar. Nog geen AI in beeld.
 *
 * Draaien met:  npm run brief            je eigen gegevens uit Supabase
 *               npm run brief -- --demo  de demodata, zonder .env
 *               npm run brief -- --json  de ruwe JSON voor de prompt
 *               npm run brief -- --weeks=12
 */
import { coachBrief } from '../src/lib/coachBrief.js';
import { muscleLabel } from '../src/lib/muscleLabels.js';
import { todayISO, formatDateShort } from '../src/lib/schedule.js';

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};

const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const bar = (n, max, width = 22) => '█'.repeat(Math.round((n / (max || 1)) * width));
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

const today = todayISO();
const weeks = value('weeks', 8);

const data = has('--demo') ? await fromDemo() : await fromSupabase();
const brief = coachBrief({ ...data, today, weeks });

if (has('--json')) {
  console.log(JSON.stringify(brief, null, 2));
  process.exit(0);
}

console.log(`\n${bold(`Trainingsbeeld ${formatDateShort(brief.window.from)} t/m ${formatDateShort(brief.window.to)}`)}  ${dim(`${weeks} afgeronde weken`)}`);

if (brief.empty) {
  console.log('\n  Geen afgeronde trainingen in dit venster.\n');
  process.exit(0);
}

const a = brief.adherence;
console.log(`\n  ${a.completed} trainingen afgerond ${dim(`(${a.perWeek} per week)`)}, ${a.skipped} overgeslagen, ${a.open} blijven staan`);
console.log(`  ${brief.totals.sets} sets over ${brief.totals.exercises} oefeningen ${dim(`(${brief.totals.setsPerWeek} sets per week)`)}`);

console.log(`\n${bold('Gewogen sets per week, per spiergroep')}   ${dim('gedaan · gepland · verschil met de periode ervoor')}`);
const max = Math.max(...brief.muscles.map((m) => Math.max(m.setsPerWeek, m.plannedPerWeek ?? 0)));
for (const m of brief.muscles) {
  if (m.setsPerWeek === 0 && !m.plannedPerWeek) continue;
  const plan = m.plannedPerWeek == null ? '' : dim(` van ${String(m.plannedPerWeek).padStart(4)} gepland`);
  const delta = m.change === 0 ? dim('   =') : (m.change > 0 ? '\x1b[32m' : '\x1b[33m') + signed(m.change).padStart(5) + '\x1b[0m';
  const flag = m.low ? ' \x1b[33m← weinig\x1b[0m' : '';
  console.log(`  ${muscleLabel(m.muscle).padEnd(20)} ${String(m.setsPerWeek).padStart(5)}${plan}  ${delta}  ${bar(m.setsPerWeek, max)}${flag}`);
}

console.log(`\n${bold('Per oefening')}   ${dim('beste prestatie in het venster, verschil, sterren')}`);
for (const e of brief.exercises) {
  const now = e.last ? `${e.last.value} ${e.unit}` : '—';
  const change = e.change == null || e.change === 0 ? dim('geen verandering') : `${signed(e.change)} ${e.unit}`;
  const stars = e.rating == null ? '' : dim(`  ${'★'.repeat(Math.round(e.rating))}${'☆'.repeat(5 - Math.round(e.rating))} ${e.rating}`);
  const stuck = e.plateau ? ` \x1b[33m← ${e.weeksSinceBest} wk geen PR\x1b[0m` : '';
  console.log(`  ${e.name.padEnd(42)} ${now.padStart(9)}  ${change.padEnd(18)} ${dim(`${e.sessions}×`)}${stars}${stuck}`);
  for (const c of e.comments) console.log(`      ${dim(`${formatDateShort(c.date)}: ${c.comment}`)}`);
}

if (brief.neglected.length) {
  console.log(`\n  \x1b[33mWeinig werk:\x1b[0m ${brief.neglected.map((m) => muscleLabel(m)).join(', ')}`);
}
if (brief.missing.length) {
  console.log(`  ${dim(`Komt in geen enkele workout voor: ${brief.missing.map((m) => muscleLabel(m)).join(', ')}`)}`);
}
if (brief.plateaus.length) {
  console.log(`  \x1b[33mPlateau:\x1b[0m ${brief.plateaus.join(', ')}`);
}
console.log();

async function fromDemo() {
  const { generateDemoData } = await import('../src/lib/demo/generate.js');
  const db = generateDemoData({ today });
  console.log(`\n${dim('Demodata — draai zonder --demo voor je eigen gegevens.')}`);
  return {
    logs: db.exercise_logs,
    sessions: db.sessions,
    exercises: db.exercises,
    feedback: db.exercise_feedback ?? [],
    templates: db.templates,
    templateExercises: db.template_exercises,
    settings: db.schedule_settings,
  };
}

async function fromSupabase() {
  const { supabase, isConfigured } = await import('../src/lib/supabase.js');
  if (!isConfigured) {
    console.error('Geen .env gevonden. Draai: npm run brief -- --demo');
    process.exit(1);
  }
  const get = async (table, columns) => {
    const { data, error } = await supabase.from(table).select(columns);
    if (error) { console.error(`${table}: ${error.message}`); process.exit(1); }
    return data ?? [];
  };
  const [logs, sessions, exercises, templates, templateExercises] = await Promise.all([
    get('exercise_logs', 'session_id, exercise_id, set_number, reps, weight_kg, seconds, skipped'),
    get('sessions', 'id, template_id, planned_date, actual_date, status'),
    get('exercises', 'id, name, muscle_groups, catalog_key'),
    get('workout_templates', 'id, label, active, position'),
    get('template_exercises', 'template_id, exercise_id, target_sets'),
  ]);
  // Feedback en instellingen kwamen later; een oude database mist ze nog.
  const feedback = await supabase.from('exercise_feedback').select('session_id, exercise_id, rating, comment');
  const settings = await supabase.from('schedule_settings').select('training_days, rotation').limit(1);
  return {
    logs, sessions, exercises, templates, templateExercises,
    feedback: feedback.data ?? [],
    settings: settings.data?.[0] ?? null,
  };
}
