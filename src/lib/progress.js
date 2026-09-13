/**
 * Afleidingen uit gelogde sets. Puur: geen React, geen Supabase.
 * Fase 2 gebruikt hiervan alleen "vorige keer"; de grafieken in fase 3 bouwen
 * op dezelfde functies verder.
 */

/** De datum waarop een sessie daadwerkelijk plaatsvond. */
export function sessionDate(session) {
  return session.actual_date ?? session.planned_date;
}

/** Sets van één oefening binnen één sessie, op setnummer gesorteerd. */
export function setsFor(logs, sessionId, exerciseId) {
  return logs
    .filter((l) => l.session_id === sessionId && l.exercise_id === exerciseId)
    .sort((a, b) => a.set_number - b.set_number);
}

/**
 * De laatste keer dat deze oefening vóór `beforeDate` is gedaan.
 * Geeft null als er geen eerdere sessie is, en `skipped` als die keer bewust
 * is overgeslagen -- dat is andere informatie dan "nooit gedaan".
 */
export function lastPerformance(logs, sessions, exerciseId, beforeDate) {
  const dateOf = new Map(sessions.map((s) => [s.id, sessionDate(s)]));

  const candidates = logs
    .filter((l) => l.exercise_id === exerciseId)
    .map((l) => ({ log: l, date: dateOf.get(l.session_id) }))
    .filter((c) => c.date && c.date < beforeDate);

  if (candidates.length === 0) return null;

  const latest = candidates.reduce((a, b) => (b.date > a.date ? b : a)).date;
  const rows = candidates
    .filter((c) => c.date === latest)
    .map((c) => c.log)
    .sort((a, b) => a.set_number - b.set_number);

  return {
    date: latest,
    skipped: rows.every((r) => r.skipped),
    sets: rows.filter((r) => !r.skipped),
    note: rows.find((r) => r.note)?.note ?? null,
  };
}

/** '10×14, 10×16, 8×16' of '45s, 40s' */
export function formatSets(sets) {
  return sets
    .map((s) => (s.seconds != null ? `${s.seconds}s`
      : s.weight_kg != null ? `${s.reps}×${s.weight_kg}`
      : `${s.reps}`))
    .join(', ');
}

/** Zwaarste set van een reeks; gelijke gewichten worden op reps beslist. */
export function bestSet(sets) {
  const scored = sets.filter((s) => s.weight_kg != null);
  if (scored.length === 0) return null;
  return scored.reduce((a, b) => {
    if (Number(b.weight_kg) !== Number(a.weight_kg)) {
      return Number(b.weight_kg) > Number(a.weight_kg) ? b : a;
    }
    return (b.reps ?? 0) > (a.reps ?? 0) ? b : a;
  });
}

/** Totaal getild gewicht (reps × kg) -- de basis voor volume in fase 3/4. */
export function volume(sets) {
  return sets.reduce(
    (total, s) => total + (s.reps ?? 0) * Number(s.weight_kg ?? 0),
    0,
  );
}

/**
 * Eén punt per training waarin deze oefening daadwerkelijk is gedaan, oplopend
 * in de tijd. Overgeslagen keren leveren geen punt op: een gat in de lijn is
 * eerlijker dan een nul die op een prestatie lijkt.
 */
export function seriesFor(logs, sessions, exerciseId) {
  const dateOf = new Map(sessions.map((s) => [s.id, sessionDate(s)]));
  const bySession = new Map();

  for (const l of logs) {
    if (l.exercise_id !== exerciseId || l.skipped) continue;
    if (!dateOf.has(l.session_id)) continue;
    if (!bySession.has(l.session_id)) bySession.set(l.session_id, []);
    bySession.get(l.session_id).push(l);
  }

  return [...bySession.entries()]
    .map(([sessionId, rows]) => {
      const sets = rows.sort((a, b) => a.set_number - b.set_number);
      const best = bestSet(sets);
      const seconds = sets.map((s) => s.seconds).filter((s) => s != null);
      return {
        sessionId,
        date: dateOf.get(sessionId),
        sets,
        bestWeight: best ? Number(best.weight_kg) : null,
        bestReps: best ? best.reps : null,
        bestSeconds: seconds.length ? Math.max(...seconds) : null,
        volume: volume(sets),
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Verschil tussen de eerste en de laatste meting; null bij één punt. */
export function trend(series, key) {
  const values = series.map((p) => p[key]).filter((v) => v != null);
  if (values.length < 2) return null;
  return values[values.length - 1] - values[0];
}

/**
 * De staat van één oefening binnen een sessie, voor het rondje in de lijst.
 * 'bezig' is een eigen staat: drie van de vier sets gedaan is iets anders dan
 * niets gedaan, en dat moet je in de gym in één oogopslag zien.
 */
export function exerciseStatus({ logged, targetSets, skipped }) {
  if (skipped) return 'overgeslagen';
  const done = logged.filter((l) => !l.skipped).length;
  if (done === 0) return 'open';
  return done >= targetSets ? 'klaar' : 'bezig';
}

/**
 * Welke maat een oefening draagt: gewicht als dat gelogd is, anders duur.
 * Een plank heeft geen kilo's, een bankdruk geen seconden.
 */
export function preferredMetric(series) {
  if (series.some((p) => p.bestWeight != null)) return 'bestWeight';
  if (series.some((p) => p.bestSeconds != null)) return 'bestSeconds';
  return null;
}

/** De reeks als punten voor een grafiek, met de maat die erbij hoort. */
export function chartPoints(series) {
  const metric = preferredMetric(series);
  if (!metric) return { points: [], unit: null };
  return {
    points: series.filter((p) => p[metric] != null).map((p) => ({ date: p.date, value: p[metric] })),
    unit: metric === 'bestWeight' ? 'kg' : 'sec',
  };
}
