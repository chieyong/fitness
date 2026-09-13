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
