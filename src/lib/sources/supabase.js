import { supabase } from '../supabase.js';
import { isMissingTable, isMissingColumn } from '../dbErrors.js';
import { normalizeScheduleSettings, scheduleOptions } from '../scheduleSettings.js';
import { planNextSessions } from '../schedule.js';

/** Hoeveel sessies er altijd vooruit klaar moeten staan. */
const HORIZON = 6;

async function unwrap(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data ?? [];
}

function fetchTemplates() {
  return unwrap(
    supabase.from('workout_templates').select('*').eq('active', true).order('position'),
  );
}

function fetchSessions() {
  return unwrap(supabase.from('sessions').select('*').order('planned_date'));
}

/** Oefeningen van één schema, in de volgorde waarin ze gedaan worden. */
function fetchTemplateExercises(templateId) {
  return unwrap(
    supabase
      .from('template_exercises')
      .select('*, exercise:exercises(id, name, muscle_groups, notes, video_urls, catalog_key)')
      .eq('template_id', templateId)
      .order('position'),
  );
}

/**
 * Zorgt dat er genoeg sessies vooruit gepland staan en geeft de volledige,
 * actuele lijst terug. Idempotent: staat het er al, dan schrijft dit niets.
 */
async function ensureUpcomingSessions(templates, sessions, today, settings) {
  const toCreate = planNextSessions(templates, sessions, today, HORIZON, scheduleOptions(settings));
  if (toCreate.length === 0) return sessions;

  let { error } = await supabase.from('sessions').insert(toCreate);
  if (error && isMissingColumn(error, 'cycle')) {
    // Migratie 006 nog niet gedraaid: dan plannen zonder rondenummer.
    ({ error } = await supabase.from('sessions').insert(toCreate.map(({ cycle, ...rest }) => rest)));
  }
  if (error) throw new Error(error.message);
  return fetchSessions();
}

/** Alle gelogde sets van een reeks oefeningen — voedt ook "vorige keer". */
function fetchLogsForExercises(exerciseIds) {
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
async function saveSet(row) {
  const data = await unwrap(
    supabase
      .from('exercise_logs')
      .upsert(row, { onConflict: 'session_id,exercise_id,set_number' })
      .select(),
  );
  return data[0];
}

/** Wist één set (leeggemaakt veld). */
function deleteSet(id) {
  return unwrap(supabase.from('exercise_logs').delete().eq('id', id).select());
}

/** Markeert een oefening binnen een sessie als overgeslagen, of maakt dat ongedaan. */
async function setExerciseSkipped(sessionId, exerciseId, skipped) {
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
async function closeSession(sessionId, { status, actualDate, notes }) {
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
async function reopenSession(sessionId) {
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
async function saveSessionNote(sessionId, notes) {
  const data = await unwrap(
    supabase.from('sessions').update({ notes: notes || null }).eq('id', sessionId).select(),
  );
  return data[0];
}

/** Eén oefening uit de bibliotheek. */
async function fetchExercise(id) {
  const data = await unwrap(
    supabase.from('exercises').select('id, name, muscle_groups, notes, catalog_key').eq('id', id).limit(1),
  );
  return data[0] ?? null;
}

/** In welke schema's een oefening voorkomt, met het target per schema. */
function fetchExerciseTemplates(exerciseId) {
  return unwrap(
    supabase
      .from('template_exercises')
      .select('*, template:workout_templates(id, label, position)')
      .eq('exercise_id', exerciseId),
  );
}

/** Alle oefeningen die in een schema voorkomen, voor het voortgangsoverzicht. */
function fetchAllTemplateExercises() {
  return unwrap(
    supabase
      .from('template_exercises')
      .select('exercise_id, position, template_id, exercise:exercises(id, name, muscle_groups, catalog_key)')
      .order('position'),
  );
}

/** Alle oefeningen uit de bibliotheek. */
function fetchAllExercises() {
  // '*' in plaats van een kolomlijst: werkt zowel vóór als na migratie 004.
  return unwrap(supabase.from('exercises').select('*').order('name'));
}

/** Alle gelogde sets — basis voor de spiergroep-aggregatie. */
function fetchAllLogs() {
  return unwrap(
    supabase
      .from('exercise_logs')
      .select('id, session_id, exercise_id, set_number, reps, weight_kg, seconds, skipped'),
  );
}

/** Nieuwe oefening in de bibliotheek. */
async function createExercise(row) {
  const data = await unwrap(supabase.from('exercises').insert(row).select());
  return data[0];
}

/** Oefening aan een workout koppelen. */
async function addTemplateExercise(row) {
  const data = await unwrap(supabase.from('template_exercises').insert(row).select());
  return data[0];
}

/** Target van een koppeling wijzigen. */
async function updateTemplateExercise(id, changes) {
  const data = await unwrap(supabase.from('template_exercises').update(changes).eq('id', id).select());
  return data[0];
}

/** Oefening uit een workout halen. De oefening en haar logs blijven bestaan. */
function deleteTemplateExercise(id) {
  return unwrap(supabase.from('template_exercises').delete().eq('id', id).select());
}

/** Nieuwe volgorde binnen een workout: [{ id, position }]. */
async function updateTemplateExercisePositions(changes) {
  for (const { id, position } of changes) {
    await unwrap(supabase.from('template_exercises').update({ position }).eq('id', id).select());
  }
  return changes;
}

/** Nieuwe workout. */
async function createTemplate({ label, position }) {
  const data = await unwrap(supabase.from('workout_templates').insert({ label, position, active: true }).select());
  return data[0];
}

async function renameTemplate(id, label) {
  const data = await unwrap(supabase.from('workout_templates').update({ label }).eq('id', id).select());
  return data[0];
}

/**
 * Workout verwijderen = archiveren. Afgeronde trainingen blijven bewaard; alleen
 * de nog geplande sessies van deze workout vervallen, zodat de planning opnieuw
 * rond de overgebleven workouts roteert.
 */
async function archiveTemplate(id) {
  await unwrap(supabase.from('sessions').delete().eq('template_id', id).eq('status', 'gepland').select());
  const data = await unwrap(supabase.from('workout_templates').update({ active: false }).eq('id', id).select());
  return data[0];
}

/** Sterren en opmerkingen bij een reeks oefeningen. */
async function fetchFeedbackForExercises(exerciseIds) {
  if (exerciseIds.length === 0) return [];
  const { data, error } = await supabase.from('exercise_feedback')
    .select('id, session_id, exercise_id, rating, comment')
    .in('exercise_id', exerciseIds);
  // Is migratie 005 nog niet gedraaid, dan gewoon geen feedback: het scherm van
  // vandaag hoort daar niet op vast te lopen.
  if (error && isMissingTable(error, 'exercise_feedback')) return [];
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Hoe het ging bij één oefening in één sessie; één rij per combinatie. */
async function saveFeedback({ session_id, exercise_id, rating, comment }) {
  const text = String(comment ?? '').trim();
  const probe = await supabase.from('exercise_feedback').select('id').limit(1);
  if (probe.error && isMissingTable(probe.error, 'exercise_feedback')) {
    throw new Error('Sterren en toelichting kunnen nog niet worden bewaard: draai migratie 005 in Supabase.');
  }
  const data = await unwrap(
    supabase.from('exercise_feedback')
      .upsert({
        session_id, exercise_id,
        rating: rating ?? null,
        comment: text || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'session_id,exercise_id' })
      .select('id, session_id, exercise_id, rating, comment'),
  );
  return data[0];
}

/** Een oefening zelf aanpassen, bijvoorbeeld haar video's. */
async function updateExercise(id, changes) {
  const data = await unwrap(supabase.from('exercises').update(changes).eq('id', id).select());
  return data[0];
}

/** Trainingsdagen en volgorde; de standaard als migratie 006 nog niet gedraaid is. */
async function fetchScheduleSettings() {
  const { data, error } = await supabase.from('schedule_settings')
    .select('training_days, rotation').eq('id', 1).maybeSingle();
  if (error && isMissingTable(error, 'schedule_settings')) return normalizeScheduleSettings(null);
  if (error) throw new Error(error.message);
  return normalizeScheduleSettings(data);
}

async function saveScheduleSettings(settings) {
  const clean = normalizeScheduleSettings(settings);
  const { data, error } = await supabase.from('schedule_settings')
    .upsert({ id: 1, ...clean, updated_at: new Date().toISOString() })
    .select('training_days, rotation').single();
  if (error && isMissingTable(error, 'schedule_settings')) {
    throw new Error('De planning kan nog niet worden bewaard: draai migratie 006 in Supabase.');
  }
  if (error) throw new Error(error.message);
  return normalizeScheduleSettings(data);
}

/**
 * Na een andere planning: geplande trainingen vanaf vandaag opnieuw indelen.
 * Trainingen waarin al iets gelogd of beoordeeld is, blijven altijd staan.
 */
async function replanUpcoming(today) {
  const open = await unwrap(supabase.from('sessions').select('id').eq('status', 'gepland').gte('planned_date', today));
  if (open.length === 0) return 0;
  const ids = open.map((x) => x.id);
  const logged = await unwrap(supabase.from('exercise_logs').select('session_id').in('session_id', ids));
  const rated = await supabase.from('exercise_feedback').select('session_id').in('session_id', ids);
  if (rated.error && !isMissingTable(rated.error, 'exercise_feedback')) throw new Error(rated.error.message);
  const keep = new Set([...logged, ...(rated.data ?? [])].map((x) => x.session_id));
  const remove = ids.filter((id) => !keep.has(id));
  if (remove.length) await unwrap(supabase.from('sessions').delete().in('id', remove).select('id'));
  return remove.length;
}

/** Echte gegevens, voor de ingelogde eigenaar. */
export const supabaseSource = {
  fetchScheduleSettings,
  saveScheduleSettings,
  replanUpcoming,
  fetchFeedbackForExercises,
  saveFeedback,
  updateExercise,
  createExercise,
  addTemplateExercise,
  updateTemplateExercise,
  deleteTemplateExercise,
  updateTemplateExercisePositions,
  createTemplate,
  renameTemplate,
  archiveTemplate,
  fetchTemplates,
  fetchSessions,
  fetchTemplateExercises,
  ensureUpcomingSessions,
  fetchLogsForExercises,
  saveSet,
  deleteSet,
  setExerciseSkipped,
  closeSession,
  reopenSession,
  saveSessionNote,
  fetchExercise,
  fetchExerciseTemplates,
  fetchAllTemplateExercises,
  fetchAllExercises,
  fetchAllLogs,
};
