/**
 * Welke spiergroepen de training van vandaag raakt, hoeveel nadruk elk krijgt,
 * en hoe ver je bent. Puur.
 *
 * Per oefening: de gewichten per spier (primair 1, secundair 0.5, tertiair 0.25),
 * het aantal target-sets en hoeveel daarvan gedaan zijn. Per spier:
 * - load:     geplande gewogen sets
 * - done:     gedane gewogen sets (per oefening nooit meer dan het target)
 * - fraction: done / load, 0..1
 * - focus:    load ten opzichte van de spier met de meeste nadruk, 0..1
 * - state:    'gepland' (niets gedaan), 'bezig', of 'klaar'
 *
 * Overgeslagen oefeningen tellen niet mee; een spiergroep met alleen
 * overgeslagen oefeningen valt weg.
 */
export function todayMuscles(items) {
  const perMuscle = new Map();
  for (const { weights, targetSets = 0, doneSets = 0, skipped = false } of items) {
    if (skipped || !weights) continue;
    const target = Math.max(0, Number(targetSets) || 0);
    const done = Math.min(target, Math.max(0, Number(doneSets) || 0));
    for (const [muscle, weight] of weights) {
      const entry = perMuscle.get(muscle) ?? { load: 0, done: 0 };
      entry.load += target * weight;
      entry.done += done * weight;
      perMuscle.set(muscle, entry);
    }
  }

  const maxLoad = Math.max(0, ...[...perMuscle.values()].map((e) => e.load));
  const result = new Map();
  for (const [muscle, { load, done }] of perMuscle) {
    if (load <= 0) continue;
    const fraction = Math.min(1, done / load);
    const state = fraction >= 0.999 ? 'klaar' : done > 0 ? 'bezig' : 'gepland';
    result.set(muscle, { load, done, fraction, focus: maxLoad > 0 ? load / maxLoad : 0, state });
  }
  return result;
}

/** Tellingen voor de samenvatting; nog te gaan op nadruk, zwaarste eerst. */
export function summarizeMuscles(states) {
  const all = [...states.entries()];
  return {
    total: all.length,
    done: all.filter(([, s]) => s.state === 'klaar').length,
    remaining: all.filter(([, s]) => s.state !== 'klaar').sort((a, b) => b[1].load - a[1].load).map(([m]) => m),
  };
}
