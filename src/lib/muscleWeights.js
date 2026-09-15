/**
 * Hoeveel een oefening telt voor elke spiergroep. Puur.
 *
 * Primair telt volledig, secundair half, tertiair een kwart. De verdeling komt,
 * in deze volgorde, uit:
 * 1. `muscle_roles` op de oefening zelf ({ spier: 'primair' | 'secundair' | 'tertiair' | getal })
 * 2. de bibliotheeksleutel (`catalog_key`)
 * 3. de naam, Nederlands of Engels, uit bibliotheek of programma
 * 4. anders: de eerste spiergroep primair, de rest secundair
 */
import { CATALOG } from '../data/catalog.js';
import { ROLE_SPECS, ALIASES } from '../data/muscleRoles.js';

export const ROLES = ['primair', 'secundair', 'tertiair'];
export const ROLE_WEIGHTS = { primair: 1, secundair: 0.5, tertiair: 0.25 };

const norm = (s) => String(s ?? '').trim().toLocaleLowerCase('nl');

/** 'chest | triceps front-deltoids' -> Map { chest: 1, triceps: 0.5, front-deltoids: 0.5 } */
export function parseRoleSpec(spec) {
  const weights = new Map();
  String(spec).split('|').forEach((part, level) => {
    for (const muscle of part.trim().split(/\s+/).filter(Boolean)) {
      if (!weights.has(muscle)) weights.set(muscle, ROLE_WEIGHTS[ROLES[level]] ?? ROLE_WEIGHTS.tertiair);
    }
  });
  return weights;
}

const specFor = (keyOrSpec) => ROLE_SPECS[keyOrSpec] ?? (keyOrSpec.includes(' ') || keyOrSpec.includes('|') ? keyOrSpec : null);

const BY_NAME = new Map();
for (const c of CATALOG) {
  if (!ROLE_SPECS[c.key]) continue;
  BY_NAME.set(norm(c.name), ROLE_SPECS[c.key]);
  if (c.en) BY_NAME.set(norm(c.en), ROLE_SPECS[c.key]);
}
for (const [name, target] of Object.entries(ALIASES)) {
  const spec = specFor(target);
  if (spec) BY_NAME.set(norm(name), spec);
}

/** De vastgelegde verdeling voor een oefening, of null als die er niet is. */
export function curatedSpec(exercise) {
  if (!exercise) return null;
  if (exercise.catalog_key && ROLE_SPECS[exercise.catalog_key]) return ROLE_SPECS[exercise.catalog_key];
  return BY_NAME.get(norm(exercise.name)) ?? null;
}

const cache = new WeakMap();

/** Map spier -> gewicht (1, 0.5 of 0.25). */
export function muscleWeights(exercise) {
  if (!exercise) return new Map();
  if (typeof exercise === 'object' && cache.has(exercise)) return cache.get(exercise);

  let weights;
  if (exercise.muscle_roles && Object.keys(exercise.muscle_roles).length > 0) {
    weights = new Map(Object.entries(exercise.muscle_roles).map(([m, r]) => [m, typeof r === 'number' ? r : ROLE_WEIGHTS[r] ?? ROLE_WEIGHTS.secundair]));
  } else {
    const spec = curatedSpec(exercise);
    if (spec) {
      weights = parseRoleSpec(spec);
    } else {
      weights = new Map((exercise.muscle_groups ?? []).map((m, i) => [m, i === 0 ? ROLE_WEIGHTS.primair : ROLE_WEIGHTS.secundair]));
    }
  }
  cache.set(exercise, weights);
  return weights;
}

/** De rol bij een gewicht. */
export function roleOf(weight) {
  if (weight >= ROLE_WEIGHTS.primair) return 'primair';
  if (weight >= ROLE_WEIGHTS.secundair) return 'secundair';
  return 'tertiair';
}

/** { primair: [...], secundair: [...], tertiair: [...] } voor weergave. */
export function musclesByRole(exercise) {
  const out = { primair: [], secundair: [], tertiair: [] };
  for (const [m, w] of muscleWeights(exercise)) out[roleOf(w)].push(m);
  return out;
}
