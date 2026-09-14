/**
 * Demo-bron: dezelfde functies als de Supabase-bron, maar op tabellen in het
 * geheugen. Loggen werkt dus gewoon in de demo; na herladen is alles terug bij
 * de gegenereerde gegevens. Er gaat niets naar de database.
 */
import { generateDemoData } from '../demo/generate.js';
import { planNextSessions } from '../schedule.js';

const HORIZON = 6;
const STORAGE_KEY = 'repz.demo.v1';

/** Wat de structuur van het schema verandert: in de demo niet toegestaan. */
const STRUCTURE = [
  'createTemplate', 'renameTemplate', 'archiveTemplate', 'createExercise',
  'addTemplateExercise', 'deleteTemplateExercise', 'updateTemplateExercisePositions',
];

/** Alles wat iets wijzigt, en dus bewaard moet worden. */
const MUTATORS = [
  ...STRUCTURE, 'ensureUpcomingSessions', 'saveSet', 'deleteSet', 'setExerciseSkipped',
  'closeSession', 'reopenSession', 'saveSessionNote', 'updateTemplateExercise',
  'saveFeedback', 'updateExercise',
];

/** Een bewaarde demo, maar alleen als hij voor vandaag is gemaakt en leesbaar is. */
function readSnapshot(storage, today) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw);
    return snap && snap.today === today && snap.db ? snap : null;
  } catch {
    return null;
  }
}
const byPlannedDate = (a, b) => (a.planned_date < b.planned_date ? -1 : a.planned_date > b.planned_date ? 1 : 0);
const copy = (value) => structuredClone(value);

/**
 * @param storage       optioneel, bijv. sessionStorage: aanpassingen overleven dan
 *                      herladen, tot de browser sluit. Een nieuwe dag begint vers.
 * @param lockStructure in de demo geen workouts of oefeningen toevoegen, verwijderen
 *                      of ordenen; targets, video's, sets en sterren mogen wel.
 */
export function createDemoSource({ today, data, storage = null, lockStructure = false } = {}) {
  const saved = !data && storage ? readSnapshot(storage, today) : null;
  const db = saved?.db ?? copy(data ?? generateDemoData({ today }));
  db.exercise_feedback ??= [];
  // De teller voor nieuwe id's reist mee, anders botsen id's na herladen.
  let counter = saved?.counter ?? 0;

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ today, counter, db }));
    } catch {
      // Vol of geblokkeerd: dan blijft het bij het geheugen van deze pagina.
    }
  };
  const newId = (kind) => `demo-new-${kind}-${++counter}`;

  const exerciseById = (id) => db.exercises.find((e) => e.id === id);
  const templateById = (id) => db.templates.find((t) => t.id === id);
  const logFields = (l) => ({
    id: l.id, session_id: l.session_id, exercise_id: l.exercise_id, set_number: l.set_number,
    reps: l.reps, weight_kg: l.weight_kg, seconds: l.seconds, skipped: l.skipped, note: l.note,
  });

  const updateSession = (id, changes) => {
    const s = db.sessions.find((x) => x.id === id);
    if (!s) throw new Error('Sessie niet gevonden');
    Object.assign(s, changes);
    return copy(s);
  };

  const source = {
    async fetchTemplates() {
      return copy(db.templates.filter((t) => t.active).sort((a, b) => a.position - b.position));
    },

    async fetchSessions() {
      return copy([...db.sessions].sort(byPlannedDate));
    },

    async fetchTemplateExercises(templateId) {
      return copy(db.template_exercises
        .filter((te) => te.template_id === templateId)
        .sort((a, b) => a.position - b.position)
        .map((te) => {
          const e = exerciseById(te.exercise_id);
          return { ...te, exercise: { id: e.id, name: e.name, muscle_groups: e.muscle_groups, notes: e.notes, video_urls: e.video_urls ?? null } };
        }));
    },

    async ensureUpcomingSessions(templates, sessions, today) {
      const toCreate = planNextSessions(templates, sessions, today, HORIZON);
      for (const row of toCreate) {
        db.sessions.push({ id: newId('s'), actual_date: null, notes: null, ...row });
      }
      return this.fetchSessions();
    },

    async fetchLogsForExercises(exerciseIds) {
      const wanted = new Set(exerciseIds);
      return copy(db.exercise_logs.filter((l) => wanted.has(l.exercise_id)).map(logFields));
    },

    async saveSet(row) {
      const existing = db.exercise_logs.find((l) => l.session_id === row.session_id
        && l.exercise_id === row.exercise_id && l.set_number === row.set_number);
      if (existing) {
        Object.assign(existing, row);
        return copy(existing);
      }
      const created = {
        id: newId('l'), reps: null, weight_kg: null, seconds: null, skipped: false, note: null, ...row,
      };
      db.exercise_logs.push(created);
      return copy(created);
    },

    async deleteSet(id) {
      const removed = db.exercise_logs.filter((l) => l.id === id);
      db.exercise_logs = db.exercise_logs.filter((l) => l.id !== id);
      return copy(removed);
    },

    async setExerciseSkipped(sessionId, exerciseId, skipped) {
      db.exercise_logs = db.exercise_logs.filter(
        (l) => !(l.session_id === sessionId && l.exercise_id === exerciseId),
      );
      if (!skipped) return null;
      return this.saveSet({ session_id: sessionId, exercise_id: exerciseId, set_number: 1, skipped: true });
    },

    async closeSession(sessionId, { status, actualDate, notes }) {
      return updateSession(sessionId, { status, actual_date: actualDate, notes: notes || null });
    },

    async reopenSession(sessionId) {
      return updateSession(sessionId, { status: 'gepland', actual_date: null });
    },

    async saveSessionNote(sessionId, notes) {
      return updateSession(sessionId, { notes: notes || null });
    },

    async fetchExercise(id) {
      const e = exerciseById(id);
      return e ? copy({ id: e.id, name: e.name, muscle_groups: e.muscle_groups, notes: e.notes, video_urls: e.video_urls ?? null }) : null;
    },

    async fetchExerciseTemplates(exerciseId) {
      return copy(db.template_exercises
        .filter((te) => te.exercise_id === exerciseId)
        .map((te) => {
          const t = templateById(te.template_id);
          return { ...te, template: { id: t.id, label: t.label, position: t.position } };
        }));
    },

    async fetchAllTemplateExercises() {
      return copy(db.template_exercises
        .sort((a, b) => a.position - b.position)
        .map((te) => {
          const e = exerciseById(te.exercise_id);
          return {
            exercise_id: te.exercise_id, position: te.position, template_id: te.template_id,
            exercise: { id: e.id, name: e.name, muscle_groups: e.muscle_groups },
          };
        }));
    },

    async fetchAllExercises() {
      return copy(db.exercises
        .map((e) => ({
          id: e.id, name: e.name, muscle_groups: e.muscle_groups, notes: e.notes ?? null,
          equipment: e.equipment ?? null, measure: e.measure ?? null, catalog_key: e.catalog_key ?? null,
          video_urls: e.video_urls ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'nl')));
    },

    async createExercise(row) {
      const created = {
        id: newId('ex'), notes: null, video_urls: null, equipment: null, measure: null, catalog_key: null, ...row,
      };
      db.exercises.push(created);
      return copy(created);
    },

    async addTemplateExercise(row) {
      const created = {
        id: newId('te'), target_reps_min: null, target_reps_max: null,
        target_seconds: null, target_seconds_max: null, target_note: null, ...row,
      };
      db.template_exercises.push(created);
      return copy(created);
    },

    async updateTemplateExercise(id, changes) {
      const row = db.template_exercises.find((te) => te.id === id);
      if (!row) throw new Error('Koppeling niet gevonden');
      Object.assign(row, changes);
      return copy(row);
    },

    async deleteTemplateExercise(id) {
      const removed = db.template_exercises.filter((te) => te.id === id);
      db.template_exercises = db.template_exercises.filter((te) => te.id !== id);
      return copy(removed);
    },

    async updateTemplateExercisePositions(changes) {
      for (const { id, position } of changes) {
        const row = db.template_exercises.find((te) => te.id === id);
        if (row) row.position = position;
      }
      return copy(changes);
    },

    async createTemplate({ label, position }) {
      const created = { id: newId('tpl'), label, position, active: true };
      db.templates.push(created);
      return copy(created);
    },

    async renameTemplate(id, label) {
      const t = templateById(id);
      if (!t) throw new Error('Workout niet gevonden');
      t.label = label;
      return copy(t);
    },

    async archiveTemplate(id) {
      const t = templateById(id);
      if (!t) throw new Error('Workout niet gevonden');
      db.sessions = db.sessions.filter((x) => !(x.template_id === id && x.status === 'gepland'));
      t.active = false;
      return copy(t);
    },

    async fetchFeedbackForExercises(exerciseIds) {
      const wanted = new Set(exerciseIds);
      return copy(db.exercise_feedback.filter((f) => wanted.has(f.exercise_id)));
    },

    async saveFeedback({ session_id, exercise_id, rating, comment }) {
      const text = String(comment ?? '').trim();
      const fields = { rating: rating ?? null, comment: text || null };
      const existing = db.exercise_feedback.find((f) => f.session_id === session_id && f.exercise_id === exercise_id);
      if (existing) {
        Object.assign(existing, fields);
        return copy(existing);
      }
      const created = { id: newId('f'), session_id, exercise_id, ...fields };
      db.exercise_feedback.push(created);
      return copy(created);
    },

    async updateExercise(id, changes) {
      const e = exerciseById(id);
      if (!e) throw new Error('Oefening niet gevonden');
      Object.assign(e, changes);
      return copy(e);
    },

    async fetchAllLogs() {
      return copy(db.exercise_logs.map(logFields));
    },
  };

  for (const name of MUTATORS) {
    const original = source[name];
    source[name] = async (...args) => {
      if (lockStructure && STRUCTURE.includes(name)) {
        throw new Error('In de demo kun je geen workouts of oefeningen toevoegen of verwijderen. Log in om je eigen schema op te bouwen.');
      }
      const result = await original.apply(source, args);
      persist();
      return result;
    };
  }

  return source;
}
