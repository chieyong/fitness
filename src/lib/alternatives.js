/**
 * Alternatieven: per oefening één vergelijkbare oefening om in een sessie naar te
 * wisselen. Puur.
 */
import { muscleWeights } from './muscleWeights.js';
import { sessionDate } from './progress.js';

const norm = (s) => String(s ?? '').trim().toLocaleLowerCase('nl');

/**
 * Wijzigingen om `id` aan `alternativeId` te koppelen (of los te maken met null).
 * Paren blijven symmetrisch: oude partners die terugwezen, worden losgemaakt.
 * @returns [{ id, alternative_id }]
 */
export function pairUpdates(exercises, id, alternativeId) {
  if (alternativeId === id) return [];
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const current = byId.get(id)?.alternative_id ?? null;
  const target = alternativeId ?? null;
  if (current === target && (!target || byId.get(target)?.alternative_id === id)) return [];

  const changes = new Map();
  if (current && current !== target && byId.get(current)?.alternative_id === id) changes.set(current, null);
  if (target) {
    const theirs = byId.get(target)?.alternative_id ?? null;
    if (theirs && theirs !== id && byId.get(theirs)?.alternative_id === target) changes.set(theirs, null);
    changes.set(target, id);
  }
  changes.set(id, target);
  return [...changes].map(([key, value]) => ({ id: key, alternative_id: value }));
}

/** Hoeveel twee oefeningen dezelfde spieren belasten: som van de kleinste gewichten. */
export function similarity(a, b) {
  const wa = muscleWeights(a);
  const wb = muscleWeights(b);
  let score = 0;
  for (const [m, w] of wa) if (wb.has(m)) score += Math.min(w, wb.get(m));
  return score;
}

const asExercise = (entry) => ({ catalog_key: entry.key, name: entry.name, muscle_groups: entry.muscles });

const sameAsCatalog = (exercise, entry) => Boolean(exercise) && (
  (exercise.catalog_key && exercise.catalog_key === entry.key)
  || norm(exercise.name) === norm(entry.name)
  || (entry.en && norm(exercise.name) === norm(entry.en))
);

/**
 * Kandidaten om als alternatief te kiezen: eigen oefeningen en bibliotheekoefeningen
 * die je nog niet hebt. Zonder zoekterm alleen oefeningen die een primaire spier
 * delen, meest vergelijkbaar eerst; met zoekterm alles wat op naam past.
 *
 * @returns [{ kind: 'existing', exercise } | { kind: 'catalog', entry }]
 */
export function suggestAlternatives(exercise, { exercises = [], catalog = [], query = '', limit = 6 } = {}) {
  if (!exercise) return [];
  const q = norm(query);
  const primaries = [...muscleWeights(exercise)].filter(([, w]) => w >= 1).map(([m]) => m);
  const sharesPrimary = (candidate) => {
    const w = muscleWeights(candidate);
    return primaries.some((m) => (w.get(m) ?? 0) >= 0.5);
  };

  const out = [];
  for (const e of exercises) {
    if (e.id === exercise.id || e.id === exercise.alternative_id) continue;
    if (q ? !norm(e.name).includes(q) : !sharesPrimary(e)) continue;
    out.push({ kind: 'existing', exercise: e, name: e.name, score: similarity(exercise, e) });
  }
  for (const entry of catalog) {
    if (sameAsCatalog(exercise, entry) || exercises.some((e) => sameAsCatalog(e, entry))) continue;
    const candidate = asExercise(entry);
    const names = [entry.name, entry.en].filter(Boolean);
    if (q ? !names.some((n) => norm(n).includes(q)) : !sharesPrimary(candidate)) continue;
    out.push({ kind: 'catalog', entry, name: entry.en ?? entry.name, score: similarity(exercise, candidate) });
  }

  return out
    .sort((a, b) => b.score - a.score || (a.kind === b.kind ? 0 : a.kind === 'existing' ? -1 : 1) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ kind, exercise: e, entry }) => (kind === 'existing' ? { kind, exercise: e } : { kind, entry }));
}

/** Oefening-ids van een workout plus hun alternatieven: voor logs en feedback. */
export function exerciseIdsWithAlternatives(rows, exercisesById) {
  const ids = new Set();
  for (const r of rows) {
    ids.add(r.exercise_id);
    const alt = exercisesById.get(r.exercise_id)?.alternative_id;
    if (alt && exercisesById.has(alt)) ids.add(alt);
  }
  return [...ids];
}

/**
 * Welke van de twee je in deze sessie doet:
 * 1. wat je nu gekozen hebt (`choice`)
 * 2. waarvoor in deze sessie al iets gelogd is
 * 3. wat je de vorige keer in deze workout deed
 * 4. anders de oefening uit het schema
 */
export function chosenExercise({ primaryId, alternativeId, session, date, logs, sessions, choice = null }) {
  if (!alternativeId) return primaryId;
  if (choice === primaryId || choice === alternativeId) return choice;

  const loggedIn = (sessionId, exerciseId) => logs.some((l) => l.session_id === sessionId && l.exercise_id === exerciseId);
  if (session) {
    if (loggedIn(session.id, primaryId)) return primaryId;
    if (loggedIn(session.id, alternativeId)) return alternativeId;
  }

  const earlier = sessions
    .filter((s) => s.id !== session?.id && s.template_id === session?.template_id && sessionDate(s) && sessionDate(s) < date)
    .sort((a, b) => (sessionDate(a) < sessionDate(b) ? 1 : -1));
  for (const s of earlier) {
    if (loggedIn(s.id, primaryId)) return primaryId;
    if (loggedIn(s.id, alternativeId)) return alternativeId;
  }
  return primaryId;
}

/**
 * Een oefening uit de workout zoals de sessie haar toont: met de gekozen oefening
 * en wat het alternatief is.
 */
export function resolveSessionItem(item, { exercisesById, session, date, logs, sessions, choice }) {
  const primary = exercisesById.get(item.exercise_id);
  const alt = primary?.alternative_id ? exercisesById.get(primary.alternative_id) : null;
  if (!alt) return { ...item, alternative: null, swapped: false };

  const chosen = chosenExercise({
    primaryId: item.exercise_id, alternativeId: alt.id, session, date, logs, sessions, choice,
  });
  if (chosen === alt.id) {
    return {
      ...item,
      exercise_id: alt.id,
      exercise: {
        id: alt.id, name: alt.name, muscle_groups: alt.muscle_groups, notes: alt.notes ?? null,
        video_urls: alt.video_urls ?? null, catalog_key: alt.catalog_key ?? null,
      },
      alternative: { id: item.exercise_id, name: item.exercise?.name ?? primary.name },
      swapped: true,
    };
  }
  return { ...item, alternative: { id: alt.id, name: alt.name }, swapped: false };
}
