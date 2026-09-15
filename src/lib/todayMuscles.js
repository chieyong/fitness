/**
 * Welke spiergroepen de training van vandaag raakt, hoeveel nadruk elk krijgt,
 * en hoe ver je bent. Puur.
 *
 * Per oefening: de gewichten per spier (primair 1, secundair 0.5, tertiair 0.25),
 * het aantal target-sets en hoeveel daarvan gedaan zijn. Per spier:
 * - load:     geplande gewogen sets (alle rollen)
 * - done:     gedane gewogen sets (per oefening nooit meer dan het target)
 * - focus:    load ten opzichte van de spier met de meeste nadruk, 0..1
 * - counted:  telt mee voor de teller: de spier is vandaag ergens primair of secundair
 * - state:    'gepland' (niets gedaan), 'bezig', of 'klaar'
 * - fraction: voortgang 0..1 voor de kleur; 1 zodra de spier 'klaar' is
 *
 * 'klaar' betekent: al het primaire en secundaire werk voor deze spier is af.
 * Tertiaire belasting in een oefening die nog open staat, houdt een spier dus
 * niet tegen. Een spier die alleen tertiair meedoet, is 'klaar' als al dat werk af
 * is, maar telt niet mee.
 *
 * Overgeslagen oefeningen tellen niet mee; een spiergroep met alleen
 * overgeslagen oefeningen valt weg.
 */
const CORE_WEIGHT = 0.5;

export function todayMuscles(items) {
  const perMuscle = new Map();
  for (const { weights, targetSets = 0, doneSets = 0, skipped = false } of items) {
    if (skipped || !weights) continue;
    const target = Math.max(0, Number(targetSets) || 0);
    const done = Math.min(target, Math.max(0, Number(doneSets) || 0));
    for (const [muscle, weight] of weights) {
      const entry = perMuscle.get(muscle) ?? { load: 0, done: 0, coreLoad: 0, coreDone: 0 };
      entry.load += target * weight;
      entry.done += done * weight;
      if (weight >= CORE_WEIGHT) {
        entry.coreLoad += target * weight;
        entry.coreDone += done * weight;
      }
      perMuscle.set(muscle, entry);
    }
  }

  const maxLoad = Math.max(0, ...[...perMuscle.values()].map((e) => e.load));
  const result = new Map();
  for (const [muscle, { load, done, coreLoad, coreDone }] of perMuscle) {
    if (load <= 0) continue;
    const counted = coreLoad > 0;
    const finished = counted ? coreDone >= coreLoad - 1e-9 : done >= load - 1e-9;
    const state = finished ? 'klaar' : done > 0 ? 'bezig' : 'gepland';
    result.set(muscle, {
      load, done, counted, state,
      fraction: finished ? 1 : Math.min(1, done / load),
      focus: maxLoad > 0 ? load / maxLoad : 0,
    });
  }
  return result;
}

/** Tellingen voor de samenvatting: alleen spieren die meetellen; nog te gaan op nadruk. */
export function summarizeMuscles(states) {
  const all = [...states.entries()].filter(([, s]) => s.counted);
  return {
    total: all.length,
    done: all.filter(([, s]) => s.state === 'klaar').length,
    remaining: all.filter(([, s]) => s.state !== 'klaar').sort((a, b) => b[1].load - a[1].load).map(([m]) => m),
  };
}
