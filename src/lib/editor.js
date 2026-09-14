/**
 * Logica achter het aanpassen van je schema. Puur: geen React, geen Supabase.
 * De schermen vragen hier wat er mag en wat er verandert, en schrijven dat weg.
 */

const norm = (s) => String(s ?? '').trim().toLocaleLowerCase('nl');

/**
 * Oefeningen uit de bibliotheek voor één spiergroep, gefilterd op materiaal en
 * een zoekterm. Oefeningen waarin die spier de hoofdrol speelt komen eerst.
 */
export function filterCatalog(catalog, { muscle = null, equipment = 'alles', query = '' } = {}) {
  const q = norm(query);
  return catalog
    .filter((c) => !muscle || c.muscles.includes(muscle))
    .filter((c) => equipment === 'alles' || c.equipment === equipment)
    .filter((c) => !q || norm(c.name).includes(q))
    .sort((a, b) => {
      if (muscle) {
        const pa = a.muscles[0] === muscle ? 0 : 1;
        const pb = b.muscles[0] === muscle ? 0 : 1;
        if (pa !== pb) return pa - pb;
      }
      return a.name.localeCompare(b.name, 'nl');
    });
}

/** Staat deze oefening al in je bibliotheek? Eerst op catalogussleutel, dan op naam. */
export function findExistingExercise(exercises, entry) {
  if (entry.key) {
    const byKey = exercises.find((x) => x.catalog_key === entry.key);
    if (byKey) return byKey;
  }
  return exercises.find((x) => norm(x.name) === norm(entry.name)) ?? null;
}

/** De volgende vrije positie onderaan een workout. */
export function nextPosition(rows) {
  return rows.reduce((max, r) => Math.max(max, r.position ?? 0), 0) + 1;
}

/**
 * Posities opnieuw 1..n in de gegeven volgorde. Geeft alleen de rijen terug
 * waarvan de positie echt verandert -- dat is wat er weggeschreven moet worden.
 */
export function renumber(orderedRows) {
  return orderedRows
    .map((r, i) => ({ id: r.id, position: i + 1, from: r.position }))
    .filter((r) => r.position !== r.from)
    .map(({ id, position }) => ({ id, position }));
}

/** Eén oefening een plek omhoog (-1) of omlaag (+1). */
export function moveRow(rows, id, direction) {
  const ordered = [...rows].sort((a, b) => a.position - b.position);
  const i = ordered.findIndex((r) => r.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ordered.length) return [];
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  return renumber(ordered);
}

/** Posities na het weghalen van een oefening, zonder gat. */
export function removeRow(rows, id) {
  return renumber([...rows].filter((r) => r.id !== id).sort((a, b) => a.position - b.position));
}

/** Een redelijk begin-target per meetwijze. */
export function defaultTarget(measure) {
  if (measure === 'tijd') return { sets: 3, secondsMin: 30, secondsMax: 60 };
  if (measure === 'reps') return { sets: 3, repsMin: 10, repsMax: 15 };
  return { sets: 3, repsMin: 8, repsMax: 12 };
}

const whole = (v) => (v === '' || v == null ? null : Number(v));

/** Controleert een target-formulier; geeft foutmeldingen in het Nederlands. */
export function validateTarget(measure, form) {
  const errors = [];
  const sets = whole(form.sets);
  if (!Number.isInteger(sets) || sets < 1 || sets > 10) errors.push('Aantal sets moet tussen 1 en 10 liggen.');

  if (measure === 'tijd') {
    const min = whole(form.secondsMin);
    const max = whole(form.secondsMax);
    if (!Number.isInteger(min) || min < 5) errors.push('Geef het aantal seconden op (minstens 5).');
    if (max != null && (!Number.isInteger(max) || max < min)) errors.push('De bovengrens moet hoger zijn dan de ondergrens.');
  } else {
    const min = whole(form.repsMin);
    const max = whole(form.repsMax);
    if (!Number.isInteger(min) || min < 1) errors.push('Geef het aantal reps op (minstens 1).');
    if (max != null && (!Number.isInteger(max) || max < min)) errors.push('De bovengrens moet hoger zijn dan de ondergrens.');
  }
  return errors;
}

/** Zet een geldig formulier om naar de target-kolommen van template_exercises. */
export function targetColumns(measure, form) {
  const sets = whole(form.sets);
  if (measure === 'tijd') {
    const min = whole(form.secondsMin);
    const max = whole(form.secondsMax);
    return {
      target_sets: sets, target_reps_min: null, target_reps_max: null,
      target_seconds: min, target_seconds_max: max && max !== min ? max : null,
    };
  }
  const min = whole(form.repsMin);
  const max = whole(form.repsMax);
  return {
    target_sets: sets, target_reps_min: min, target_reps_max: max && max !== min ? max : null,
    target_seconds: null, target_seconds_max: null,
  };
}

/** Het omgekeerde: bestaande kolommen als formulierwaarden. */
export function formFromColumns(row) {
  if (row.target_seconds != null) {
    return { sets: row.target_sets, secondsMin: row.target_seconds, secondsMax: row.target_seconds_max ?? '' };
  }
  return { sets: row.target_sets, repsMin: row.target_reps_min ?? '', repsMax: row.target_reps_max ?? '' };
}

/** Meetwijze van een bestaande koppeling, ook voor oefeningen van vóór die kolom. */
export function measureOf(row, exercise) {
  if (exercise?.measure) return exercise.measure;
  return row.target_seconds != null ? 'tijd' : 'gewicht';
}

/** Controleert een zelf aangemaakte oefening. */
export function validateOwnExercise({ name, muscles, equipment, measure }, existing, { equipmentIds, measureIds }) {
  const errors = [];
  if (!norm(name)) errors.push('Geef de oefening een naam.');
  else if (existing.some((x) => norm(x.name) === norm(name))) errors.push('Er bestaat al een oefening met die naam.');
  if (!muscles?.length) errors.push('Kies minstens één spiergroep.');
  if (!equipmentIds.includes(equipment)) errors.push('Kies het materiaal.');
  if (!measureIds.includes(measure)) errors.push('Kies hoe je deze oefening logt.');
  return errors;
}

/** "Workout D" na A, B en C; bij een volle alfabetrij een nummer. */
export function nextTemplateLabel(templates) {
  const used = new Set(templates.map((t) => norm(t.label)));
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const label = `Workout ${letter}`;
    if (!used.has(norm(label))) return label;
  }
  let n = templates.length + 1;
  while (used.has(norm(`Workout ${n}`))) n += 1;
  return `Workout ${n}`;
}

/** Wat verdwijnt en wat blijft als je een workout verwijdert. */
export function archiveImpact(sessions, templateId) {
  const mine = sessions.filter((s) => s.template_id === templateId);
  return {
    planned: mine.filter((s) => s.status === 'gepland').length,
    history: mine.filter((s) => s.status !== 'gepland').length,
  };
}

/** Een workoutnaam moet bestaan en uniek zijn. */
export function validateTemplateLabel(label, templates, ownId = null) {
  if (!norm(label)) return 'Geef de workout een naam.';
  if (templates.some((t) => t.id !== ownId && norm(t.label) === norm(label))) return 'Er is al een workout met die naam.';
  return null;
}
