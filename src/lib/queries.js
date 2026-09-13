import { supabase } from './supabase.js';
import { planNextSessions } from './schedule.js';

/** Hoeveel sessies er altijd vooruit klaar moeten staan. */
const HORIZON = 6;

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function fetchTemplates() {
  return unwrap(
    supabase.from('workout_templates').select('*').eq('active', true).order('position'),
  );
}

export function fetchSessions() {
  return unwrap(supabase.from('sessions').select('*').order('planned_date'));
}

/** Oefeningen van één schema, in de volgorde waarin ze gedaan worden. */
export function fetchTemplateExercises(templateId) {
  return unwrap(
    supabase
      .from('template_exercises')
      .select('*, exercise:exercises(id, name, muscle_groups, notes)')
      .eq('template_id', templateId)
      .order('position'),
  );
}

/**
 * Zorgt dat er genoeg sessies vooruit gepland staan en geeft de volledige,
 * actuele lijst terug. Idempotent: staat het er al, dan schrijft dit niets.
 */
export async function ensureUpcomingSessions(templates, sessions, today) {
  const toCreate = planNextSessions(templates, sessions, today, HORIZON);
  if (toCreate.length === 0) return sessions;

  await unwrap(supabase.from('sessions').insert(toCreate));
  return fetchSessions();
}
