/**
 * Draait de echte datalaag tegen Supabase: schema's en sessies ophalen, het
 * schema vooruit aanvullen, en de doorschuiflogica op de uitkomst loslaten.
 * Draaien met: npm run smoke
 */
import {
  fetchTemplates, fetchSessions, fetchTemplateExercises, ensureUpcomingSessions,
} from '../src/lib/queries.js';
import { resolveToday, todayISO, formatDateShort, formatTarget } from '../src/lib/schedule.js';

const today = todayISO();
console.log(`\nVandaag: ${today} (${formatDateShort(today)})\n`);

const templates = await fetchTemplates();
console.log(`Schema's: ${templates.map((t) => t.label).join(', ')}`);

const before = await fetchSessions();
const sessions = await ensureUpcomingSessions(templates, before, today);
console.log(`Sessies: ${before.length} -> ${sessions.length}`);

const label = (id) => templates.find((t) => t.id === id)?.label ?? '—';
for (const s of sessions) {
  console.log(`  ${formatDateShort(s.planned_date)}  ${label(s.template_id)}  ${s.status}`);
}

const view = resolveToday(sessions, today);
console.log(`\nVandaag te doen: ${view.current ? label(view.current.session.template_id) : 'rustdag'}`);

if (view.current) {
  const rows = await fetchTemplateExercises(view.current.session.template_id);
  for (const r of rows) {
    console.log(`  ${r.exercise.name.padEnd(22)} ${formatTarget(r).padEnd(12)} ${r.exercise.muscle_groups.join(', ')}`);
  }
}

console.log(`\nHierna: ${view.upcoming.slice(0, 3).map((e) => `${formatDateShort(e.date)} ${label(e.session.template_id)}`).join(' · ')}\n`);
