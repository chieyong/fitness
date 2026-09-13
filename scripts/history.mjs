/**
 * Print de geimporteerde geschiedenis, zodat je kunt vergelijken met je
 * oorspronkelijke aantekeningen. Draaien met: npm run history
 */
import { supabase } from '../src/lib/supabase.js';
import { formatDateShort } from '../src/lib/schedule.js';

const { data: sessions, error } = await supabase
  .from('sessions')
  .select('id, planned_date, actual_date, status, notes, template:workout_templates(label)')
  .order('planned_date');

if (error) { console.error(error.message); process.exit(1); }

const { data: logs } = await supabase
  .from('exercise_logs')
  .select('session_id, set_number, reps, weight_kg, seconds, skipped, note, exercise:exercises(name)')
  .order('set_number');

let setCount = 0;
let skipCount = 0;

for (const s of sessions) {
  const head = `${formatDateShort(s.planned_date)}  ${s.template?.label ?? '—'}  ${s.status}`;
  console.log(`\n\x1b[1m${head}\x1b[0m${s.notes ? `  — ${s.notes}` : ''}`);

  const mine = logs.filter((l) => l.session_id === s.id);
  if (mine.length === 0) { console.log('  (nog geen logs)'); continue; }

  const byExercise = new Map();
  for (const l of mine) {
    const name = l.exercise?.name ?? '?';
    if (!byExercise.has(name)) byExercise.set(name, []);
    byExercise.get(name).push(l);
  }

  for (const [name, rows] of byExercise) {
    if (rows[0].skipped) {
      console.log(`  ${name.padEnd(46)} \x1b[2mniet gedaan\x1b[0m`);
      skipCount += 1;
      continue;
    }
    setCount += rows.length;
    const sets = rows
      .sort((a, b) => a.set_number - b.set_number)
      .map((r) => (r.seconds ? `${r.seconds}s` : `${r.reps}×${r.weight_kg}`))
      .join(', ');
    const note = rows.find((r) => r.note)?.note;
    console.log(`  ${name.padEnd(46)} ${sets}${note ? `   \x1b[36m${note}\x1b[0m` : ''}`);
  }
}

console.log(`\n${sessions.length} sessies · ${setCount} setregels · ${skipCount} overgeslagen oefeningen\n`);
