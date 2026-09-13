/**
 * Aggregatie per spiergroep. Puur: geen React, geen Supabase.
 *
 * Twee maten, want ze vertellen iets anders:
 * - `sets` telt hoeveel werksets een spiergroep kreeg. Dit is de maat waarop
 *   trainingsschema's normaal gesproken gestuurd worden.
 * - `volume` telt reps x kg. Binnen één oefening is dat een prima maat voor
 *   vooruitgang, maar tussen spiergroepen niet: een beenpers verplaatst meer
 *   gewicht dan een curl door anatomie, niet door inspanning.
 *
 * Een oefening telt volledig mee voor elke spiergroep die eraan meedoet. Het
 * totaal over alle groepen is daarom hoger dan het werkelijke werk; de
 * vergelijking tússen groepen is wat deze cijfers moeten dragen, niet de som.
 */
import { sessionDate, volume as setsVolume } from './progress.js';

/**
 * @param logs      alle exercise_logs
 * @param sessions  alle sessies (voor de datum per log)
 * @param exercises alle oefeningen (voor naam en spiergroepen)
 * @param range     { from, to } inclusief, allebei optioneel
 */
export function muscleTotals(logs, sessions, exercises, range = {}) {
  const dateOf = new Map(sessions.map((s) => [s.id, sessionDate(s)]));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const perMuscle = new Map();

  const bySession = new Map();
  for (const l of logs) {
    if (l.skipped) continue;
    const date = dateOf.get(l.session_id);
    if (!date) continue;
    if (range.from && date < range.from) continue;
    if (range.to && date > range.to) continue;

    const key = `${l.session_id}|${l.exercise_id}`;
    if (!bySession.has(key)) bySession.set(key, []);
    bySession.get(key).push(l);
  }

  for (const [key, rows] of bySession) {
    const exerciseId = key.split('|')[1];
    const exercise = exerciseById.get(exerciseId);
    if (!exercise) continue;

    const sets = rows.length;
    const vol = setsVolume(rows);

    for (const muscle of exercise.muscle_groups ?? []) {
      if (!perMuscle.has(muscle)) {
        perMuscle.set(muscle, { muscle, sets: 0, volume: 0, byExercise: new Map() });
      }
      const entry = perMuscle.get(muscle);
      entry.sets += sets;
      entry.volume += vol;

      const prev = entry.byExercise.get(exerciseId)
        ?? { exerciseId, name: exercise.name, sets: 0, volume: 0 };
      prev.sets += sets;
      prev.volume += vol;
      entry.byExercise.set(exerciseId, prev);
    }
  }

  return [...perMuscle.values()]
    .map((e) => ({
      ...e,
      byExercise: [...e.byExercise.values()].sort((a, b) => b.sets - a.sets),
    }))
    .sort((a, b) => b.sets - a.sets);
}

/**
 * Zet een intensiteit van 0..1 om in een stap van de kleurschaal.
 * 0 betekent "niets gedaan" en krijgt geen stap; alles daarboven valt in
 * 1..steps. react-body-highlighter leest dit als `frequency` en pakt daarmee
 * highlightedColors[frequency - 1].
 */
export function intensityBucket(intensity, steps = 5) {
  if (!intensity || intensity <= 0) return 0;
  return Math.min(steps, Math.max(1, Math.ceil(intensity * steps)));
}

/** Sorteer op de maat die het scherm toont; muscleTotals sorteert op sets. */
export function sortByMetric(totals, metric = 'sets') {
  return [...totals].sort((a, b) => b[metric] - a[metric]);
}

/** De zwaarst belaste spiergroep volgens de gekozen maat. */
export function busiestBy(totals, metric = 'sets') {
  return sortByMetric(totals, metric)[0] ?? null;
}

/** Zoek één spiergroep op in het resultaat van muscleTotals. */
export function findMuscle(totals, muscle) {
  return totals.find((t) => t.muscle === muscle) ?? null;
}

/**
 * Relatieve intensiteit per spiergroep, 0..1, ten opzichte van de drukst
 * belaste groep. Dat is de waarde die de kleurschaal aanstuurt.
 */
export function intensities(totals, metric = 'sets') {
  const max = Math.max(0, ...totals.map((t) => t[metric]));
  const out = new Map();
  for (const t of totals) {
    out.set(t.muscle, max > 0 ? t[metric] / max : 0);
  }
  return out;
}

/**
 * Sets en volume per training voor één spiergroep, oplopend in de tijd.
 * Dit voedt het lijntje naast een ingeklapte spiergroep: ook zonder de
 * oefeningen uit te klappen zie je of het oploopt.
 */
export function muscleSeries(logs, sessions, exercises, muscle, range = {}) {
  const dateOf = new Map(sessions.map((s) => [s.id, sessionDate(s)]));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const perSession = new Map();

  const grouped = new Map();
  for (const l of logs) {
    if (l.skipped) continue;
    const date = dateOf.get(l.session_id);
    if (!date) continue;
    if (range.from && date < range.from) continue;
    if (range.to && date > range.to) continue;

    const exercise = exerciseById.get(l.exercise_id);
    if (!exercise?.muscle_groups?.includes(muscle)) continue;

    const key = `${l.session_id}|${l.exercise_id}`;
    if (!grouped.has(key)) grouped.set(key, { date, rows: [] });
    grouped.get(key).rows.push(l);
  }

  for (const { date, rows } of grouped.values()) {
    const entry = perSession.get(date) ?? { date, sets: 0, volume: 0 };
    entry.sets += rows.length;
    entry.volume += setsVolume(rows);
    perSession.set(date, entry);
  }

  return [...perSession.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
