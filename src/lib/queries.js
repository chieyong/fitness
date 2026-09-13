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

/** Alle gelogde sets van een reeks oefeningen — voedt ook "vorige keer". */
export function fetchLogsForExercises(exerciseIds) {
  if (exerciseIds.length === 0) return Promise.resolve([]);
  return unwrap(
    supabase
      .from('exercise_logs')
      .select('id, session_id, exercise_id, set_number, reps, weight_kg, seconds, skipped, note')
      .in('exercise_id', exerciseIds),
  );
}

/**
 * Schrijft één set weg. De unieke sleutel (sessie, oefening, setnummer) zorgt
 * dat een tweede invoer dezelfde rij bijwerkt in plaats van te verdubbelen.
 */
export async function saveSet(row) {
  const data = await unwrap(
    supabase
      .from('exercise_logs')
      .upsert(row, { onConflict: 'session_id,exercise_id,set_number' })
      .select(),
  );
  return data[0];
}

/** Wist één set (leeggemaakt veld). */
export function deleteSet(id) {
  return unwrap(supabase.from('exercise_logs').delete().eq('id', id).select());
}

/** Markeert een oefening binnen een sessie als overgeslagen, of maakt dat ongedaan. */
export async function setExerciseSkipped(sessionId, exerciseId, skipped) {
  await unwrap(
    supabase.from('exercise_logs').delete()
      .eq('session_id', sessionId).eq('exercise_id', exerciseId).select(),
  );
  if (!skipped) return null;
  return saveSet({
    session_id: sessionId, exercise_id: exerciseId, set_number: 1, skipped: true,
  });
}

/** Rondt een sessie af of slaat 'm over; de datumlogica pakt daarna de volgende op. */
export async function closeSession(sessionId, { status, actualDate, notes }) {
  const data = await unwrap(
    supabase
      .from('sessions')
      .update({ status, actual_date: actualDate, notes: notes || null })
      .eq('id', sessionId)
      .select(),
  );
  return data[0];
}

/** Zet een afgeronde sessie terug op 'gepland'. */
export async function reopenSession(sessionId) {
  const data = await unwrap(
    supabase
      .from('sessions')
      .update({ status: 'gepland', actual_date: null })
      .eq('id', sessionId)
      .select(),
  );
  return data[0];
}

/** Opmerking bij de hele sessie. */
export async function saveSessionNote(sessionId, notes) {
  const data = await unwrap(
    supabase.from('sessions').update({ notes: notes || null }).eq('id', sessionId).select(),
  );
  return data[0];
}

/** Eén oefening uit de bibliotheek. */
export async function fetchExercise(id) {
  const data = await unwrap(
    supabase.from('exercises').select('id, name, muscle_groups, notes').eq('id', id).limit(1),
  );
  return data[0] ?? null;
}

/** In welke schema's een oefening voorkomt, met het target per schema. */
export function fetchExerciseTemplates(exerciseId) {
  return unwrap(
    supabase
      .from('template_exercises')
      .select('*, template:workout_templates(id, label, position)')
      .eq('exercise_id', exerciseId),
  );
}

/** Alle oefeningen die in een schema voorkomen, voor het voortgangsoverzicht. */
export function fetchAllTemplateExercises() {
  return unwrap(
    supabase
      .from('template_exercises')
      .select('exercise_id, position, template_id, exercise:exercises(id, name, muscle_groups)')
      .order('position'),
  );
}
