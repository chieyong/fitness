/**
 * De cijfers waar een trainingsadvies op gebaseerd hoort te zijn, uit je eigen
 * logboek. Puur: geen React, geen Supabase, geen Date.now() -- en geen AI.
 *
 * Dit is bewust de hele rekenkant. Een taalmodel krijgt straks alleen dit
 * resultaat als JSON en mag er woorden omheen zetten; rekenen doet het niet.
 * Zo staat elk getal in het advies hier in een getest bestand, en kan een
 * model geen kilo's verzinnen die je nooit getild hebt.
 *
 * Drie keuzes die de cijfers bepalen:
 * - **Alleen afgeronde weken.** De lopende week is half en zou elk gemiddelde
 *   omlaag trekken. Zelfde regel als het lijntje in Voortgang.
 * - **Gewogen sets, geen rauwe sets.** Een set telt per spier naar rol:
 *   primair x1, secundair x0,5, tertiair x0,25 (zie muscleWeights.js). Alleen
 *   zo zijn spiergroepen onderling te vergelijken.
 * - **Gepland naast gedaan.** Krijgt je bovenrug weinig werk omdat je
 *   trainingen mist, of omdat je schema er weinig voor heeft? Dat zijn twee
 *   verschillende adviezen, dus staan het allebei in de uitkomst.
 */
import { sessionDate, seriesFor } from './progress.js';
import { muscleTotals, weekStartISO } from './muscles.js';
import { muscleWeights } from './muscleWeights.js';
import { addDays } from './schedule.js';
import { KNOWN_MUSCLES } from './muscleLabels.js';
import { normalizeScheduleSettings } from './scheduleSettings.js';

/** Zoveel afgeronde weken kijkt het advies terug. */
export const DEFAULT_WEEKS = 8;
/** Minder gewogen sets per week dan dit: te weinig om op vooruit te gaan. */
export const LOW_SETS_PER_WEEK = 4;
/** Zoveel weken geen beste prestatie meer: een plateau. */
export const PLATEAU_WEEKS = 4;
/** Een plateau zegt pas iets als je de oefening ook echt gedaan hebt. */
const PLATEAU_MIN_SESSIONS = 3;
/** Zoveel toelichtingen per oefening gaan mee; de nieuwste eerst. */
const MAX_COMMENTS = 3;

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Het venster waarover we rekenen: de laatste `weeks` afgeronde weken, plus de
 * helften waarin we ze vergelijken (laatste helft tegen de helft daarvoor).
 */
export function briefWindow(today, weeks = DEFAULT_WEEKS) {
  const current = weekStartISO(today);
  const from = addDays(current, -7 * weeks);
  const half = Math.max(1, Math.floor(weeks / 2));
  const mid = addDays(current, -7 * half);
  return {
    from,
    to: addDays(current, -1),
    weeks,
    recent: { from: mid, to: addDays(current, -1), weeks: half },
    earlier: { from, to: addDays(mid, -1), weeks: weeks - half },
  };
}

/** Gewogen sets per week per spier over één venster. */
function perWeek(logs, sessions, exercises, range, weeks) {
  const out = new Map();
  for (const t of muscleTotals(logs, sessions, exercises, range)) {
    out.set(t.muscle, round1(t.sets / weeks));
  }
  return out;
}

/**
 * Wat je schema per week van plan is, los van wat je deed. Met drie workouts
 * op drie trainingsdagen komt elke workout gemiddeld één keer per week langs;
 * bij vier workouts op drie dagen drie kwart keer. Dat is de schatting die
 * hieronder gemaakt wordt -- geen simulatie van de rotatie, maar het gemiddelde
 * waar die rotatie naartoe loopt.
 */
export function plannedMusclesPerWeek(templates, templateExercises, exercises, settings) {
  const { training_days: days } = normalizeScheduleSettings(settings);
  const active = templates.filter((t) => t.active !== false);
  const out = new Map();
  if (active.length === 0 || days.length === 0) return out;

  const timesPerWeek = days.length / active.length;
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const activeIds = new Set(active.map((t) => t.id));

  for (const row of templateExercises) {
    if (!activeIds.has(row.template_id)) continue;
    const exercise = exerciseById.get(row.exercise_id) ?? row.exercise;
    if (!exercise) continue;
    for (const [muscle, weight] of muscleWeights(exercise)) {
      const sets = (row.target_sets ?? 0) * weight * timesPerWeek;
      out.set(muscle, (out.get(muscle) ?? 0) + sets);
    }
  }

  for (const [muscle, sets] of out) out.set(muscle, round1(sets));
  return out;
}

/** Hoe trouw je het schema volgde: afgerond, overgeslagen, blijven staan. */
function adherenceIn(sessions, { from, to, weeks }) {
  const inWindow = sessions.filter((s) => {
    const date = sessionDate(s);
    return date >= from && date <= to;
  });
  const count = (status) => inWindow.filter((s) => s.status === status).length;
  const completed = count('voltooid');
  return {
    completed,
    skipped: count('overgeslagen'),
    open: count('gepland'),
    perWeek: round1(completed / weeks),
  };
}

/**
 * Welke maat deze oefening draagt: kilo's als je die logt, anders seconden,
 * anders herhalingen. Een plank heeft geen kilo's, een crunch geen van beide,
 * en zonder deze derde maat zou zo'n oefening nooit vooruitgang laten zien.
 */
function metricOf(series) {
  if (series.some((p) => p.bestWeight != null)) {
    return { unit: 'kg', valueOf: (p) => p.bestWeight };
  }
  if (series.some((p) => p.bestSeconds != null)) {
    return { unit: 'sec', valueOf: (p) => p.bestSeconds };
  }
  return {
    unit: 'reps',
    valueOf: (p) => {
      const reps = p.sets.map((x) => x.reps).filter((r) => r != null);
      return reps.length ? Math.max(...reps) : null;
    },
  };
}

/**
 * Per oefening: waar je stond aan het begin van het venster, waar nu, en hoe
 * lang geleden je voor het laatst een beste prestatie neerzette. Dat laatste
 * is het plateau-signaal -- deterministisch, geen inschatting.
 */
function exerciseLines(logs, sessions, exercises, feedback, window, plateauWeeks) {
  const { from, to } = window;
  const ratingsBySession = new Map(feedback.map((f) => [`${f.session_id}|${f.exercise_id}`, f]));
  const lines = [];

  for (const exercise of exercises) {
    const series = seriesFor(logs, sessions, exercise.id)
      .filter((p) => p.date >= from && p.date <= to);
    if (series.length === 0) continue;

    const { unit, valueOf } = metricOf(series);
    const points = series
      .map((p) => ({ date: p.date, value: valueOf(p) }))
      .filter((p) => p.value != null);
    const first = points[0] ?? null;
    const last = points[points.length - 1] ?? null;

    // De laatste keer dat je boven alles uitkwam wat ervoor stond.
    let best = null;
    for (const p of points) if (best === null || p.value > best.value) best = p;
    const weeksSinceBest = best
      ? Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${best.date}T00:00:00Z`)) / (7 * 86400000))
      : null;

    const rated = series
      .map((p) => ratingsBySession.get(`${p.sessionId}|${exercise.id}`))
      .filter(Boolean);
    const ratings = rated.map((f) => f.rating).filter((r) => r != null);
    const comments = series
      .slice()
      .reverse()
      .map((p) => ({ date: p.date, comment: ratingsBySession.get(`${p.sessionId}|${exercise.id}`)?.comment }))
      .filter((c) => String(c.comment ?? '').trim())
      .slice(0, MAX_COMMENTS);

    lines.push({
      id: exercise.id,
      name: exercise.name,
      unit,
      sessions: series.length,
      sets: series.reduce((n, p) => n + p.sets.length, 0),
      first,
      last,
      best,
      change: first && last ? round1(last.value - first.value) : null,
      weeksSinceBest,
      plateau: weeksSinceBest != null
        && weeksSinceBest >= plateauWeeks
        && series.length >= PLATEAU_MIN_SESSIONS,
      rating: ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
      comments,
    });
  }

  return lines.sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
}

/**
 * Alles bij elkaar: het briefje dat straks naar het model gaat. Bewust compact
 * en plat, zodat het in een prompt past en in een test te lezen is.
 *
 * @param logs        alle exercise_logs
 * @param sessions    alle sessies
 * @param exercises   alle oefeningen (naam en spiergroepen)
 * @param feedback    exercise_feedback: sterren en toelichting
 * @param templates   workout_templates, voor "wat was het plan"
 * @param templateExercises  koppelingen met hun target_sets
 * @param settings    schedule_settings (trainingsdagen)
 * @param today       ISO-datum; bepaalt welke weken afgerond zijn
 */
export function coachBrief({
  logs = [], sessions = [], exercises = [], feedback = [],
  templates = [], templateExercises = [], settings = null,
  today,
  weeks = DEFAULT_WEEKS,
  lowSetsPerWeek = LOW_SETS_PER_WEEK,
  plateauWeeks = PLATEAU_WEEKS,
}) {
  const window = briefWindow(today, weeks);
  const adherence = adherenceIn(sessions, window);

  const whole = perWeek(logs, sessions, exercises, { from: window.from, to: window.to }, weeks);
  const recent = perWeek(logs, sessions, exercises, window.recent, window.recent.weeks);
  const earlier = perWeek(logs, sessions, exercises, window.earlier, window.earlier.weeks);
  const planned = plannedMusclesPerWeek(templates, templateExercises, exercises, settings);

  const muscles = KNOWN_MUSCLES
    .map((muscle) => ({
      muscle,
      setsPerWeek: whole.get(muscle) ?? 0,
      recentPerWeek: recent.get(muscle) ?? 0,
      earlierPerWeek: earlier.get(muscle) ?? 0,
      plannedPerWeek: planned.size ? (planned.get(muscle) ?? 0) : null,
    }))
    .map((m) => ({
      ...m,
      change: round1(m.recentPerWeek - m.earlierPerWeek),
      // Weinig werk omdat het schema er weinig voor heeft, of omdat je het liet
      // liggen? Het eerste los je op in je schema, het tweede in je agenda.
      low: m.setsPerWeek < lowSetsPerWeek,
      inProgram: m.plannedPerWeek == null ? null : m.plannedPerWeek > 0,
    }))
    .sort((a, b) => b.setsPerWeek - a.setsPerWeek);

  const lines = exerciseLines(logs, sessions, exercises, feedback, window, plateauWeeks);
  const totalSets = lines.reduce((n, e) => n + e.sets, 0);

  return {
    today,
    window: { from: window.from, to: window.to, weeks },
    empty: adherence.completed === 0 && totalSets === 0,
    adherence,
    totals: {
      sets: totalSets,
      // Rauwe sets: het totaal over spiergroepen telt dezelfde set meerdere
      // keren mee (zie muscles.js), dus als weekcijfer zou dat misleiden.
      setsPerWeek: round1(totalSets / weeks),
      exercises: lines.length,
    },
    muscles,
    neglected: muscles.filter((m) => m.low && m.inProgram !== false).map((m) => m.muscle),
    missing: muscles.filter((m) => m.inProgram === false && m.setsPerWeek === 0).map((m) => m.muscle),
    exercises: lines,
    plateaus: lines.filter((e) => e.plateau).map((e) => e.name),
  };
}
