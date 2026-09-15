/**
 * Instellingen van de planning: op welke weekdagen je traint, en of de workouts
 * op volgorde of willekeurig per ronde rouleren. Puur, zodat opschonen,
 * controleren en beschrijven te testen zijn.
 *
 * Dagen volgen de JavaScript-telling: zondag = 0, maandag = 1, ... zaterdag = 6.
 */

export const DEFAULT_SETTINGS = Object.freeze({ training_days: [2, 4, 6], rotation: 'volgorde' });

/** Maandag eerst, zoals een Nederlandse week. */
export const WEEKDAYS = [
  { day: 1, short: 'ma', label: 'maandag' },
  { day: 2, short: 'di', label: 'dinsdag' },
  { day: 3, short: 'wo', label: 'woensdag' },
  { day: 4, short: 'do', label: 'donderdag' },
  { day: 5, short: 'vr', label: 'vrijdag' },
  { day: 6, short: 'za', label: 'zaterdag' },
  { day: 0, short: 'zo', label: 'zondag' },
];

export const ROTATIONS = [
  { id: 'volgorde', label: 'Op volgorde' },
  { id: 'willekeurig', label: 'Willekeurig per ronde' },
];

const ROTATION_IDS = ROTATIONS.map((r) => r.id);

/** Alleen geldige, unieke dagen, oplopend. */
function validDays(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const days = list.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

/** Wat de app gebruikt: opgeschoond, en bij ontbrekende of lege waarden de standaard. */
export function normalizeScheduleSettings(raw) {
  const days = validDays(raw?.training_days);
  return {
    training_days: days.length ? days : [...DEFAULT_SETTINGS.training_days],
    rotation: ROTATION_IDS.includes(raw?.rotation) ? raw.rotation : DEFAULT_SETTINGS.rotation,
  };
}

/** Foutmeldingen voor wat iemand invult. */
export function validateScheduleSettings(raw) {
  const errors = [];
  if (validDays(raw?.training_days).length === 0) errors.push('Kies minstens één trainingsdag.');
  if (!ROTATION_IDS.includes(raw?.rotation)) errors.push('Kies hoe de workouts rouleren.');
  return errors;
}

/** De opties die de planningsfuncties in schedule.js verwachten. */
export function scheduleOptions(settings) {
  const s = normalizeScheduleSettings(settings);
  return { trainingDays: s.training_days, rotation: s.rotation };
}

/** "Dinsdag, donderdag en zaterdag, op volgorde." */
export function describeSchedule(settings, workoutCount) {
  const s = normalizeScheduleSettings(settings);
  const names = WEEKDAYS.filter((w) => s.training_days.includes(w.day)).map((w) => w.label);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} en ${names.at(-1)}` : names[0];
  const order = s.rotation === 'willekeurig'
    ? `willekeurige volgorde, opnieuw geschud na elke ronde van ${workoutCount} workouts`
    : 'op volgorde';
  return `${list.charAt(0).toUpperCase()}${list.slice(1)}, ${order}.`;
}
