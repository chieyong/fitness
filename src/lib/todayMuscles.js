/**
 * Welke spiergroepen de training van vandaag raakt, en hoe ver je daarmee bent.
 * Puur: krijgt per oefening de spiergroepen en de status uit exerciseStatus.
 *
 * - 'gepland': nog niets gedaan voor deze spiergroep
 * - 'bezig':   een deel van de oefeningen voor deze spiergroep is (deels) gedaan
 * - 'klaar':   alle oefeningen voor deze spiergroep zijn klaar
 *
 * Overgeslagen oefeningen tellen niet mee; een spiergroep met alleen
 * overgeslagen oefeningen valt weg.
 */
export function todayMuscles(items) {
  const perMuscle = new Map();
  for (const { muscles = [], status } of items) {
    if (status === 'overgeslagen') continue;
    for (const m of new Set(muscles)) {
      if (!perMuscle.has(m)) perMuscle.set(m, []);
      perMuscle.get(m).push(status);
    }
  }
  const result = new Map();
  for (const [muscle, statuses] of perMuscle) {
    if (statuses.every((s) => s === 'klaar')) result.set(muscle, 'klaar');
    else if (statuses.some((s) => s === 'klaar' || s === 'bezig')) result.set(muscle, 'bezig');
    else result.set(muscle, 'gepland');
  }
  return result;
}

export const MUSCLE_STATE_LEVEL = { gepland: 1, bezig: 2, klaar: 3 };

/** Tellingen voor de samenvatting naast het silhouet. */
export function summarizeMuscles(states) {
  const all = [...states.entries()];
  return {
    total: all.length,
    done: all.filter(([, s]) => s === 'klaar').length,
    remaining: all.filter(([, s]) => s !== 'klaar').map(([m]) => m),
  };
}
