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

const TEXT = {
  nl: {
    labels: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    short: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    and: 'en',
    inOrder: 'op volgorde',
    random: (n) => `willekeurige volgorde, opnieuw geschud na elke ronde van ${n} workouts`,
    rotations: { volgorde: 'Op volgorde', willekeurig: 'Willekeurig per ronde' },
    errDays: 'Kies minstens één trainingsdag.',
    errRotation: 'Kies hoe de workouts rouleren.',
  },
  en: {
    labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    short: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    and: 'and',
    inOrder: 'in order',
    random: (n) => `random order, reshuffled after every round of ${n} workouts`,
    rotations: { volgorde: 'In order', willekeurig: 'Random each round' },
    errDays: 'Choose at least one training day.',
    errRotation: 'Choose how the workouts rotate.',
  },
};

const text = (locale) => TEXT[locale] ?? TEXT.nl;

/** De week in de gekozen taal, maandag eerst. */
export function weekdays(locale = 'nl') {
  const tx = text(locale);
  return WEEKDAYS.map((w) => ({ day: w.day, short: tx.short[w.day], label: tx.labels[w.day] }));
}

export function rotationLabel(id, locale = 'nl') {
  return text(locale).rotations[id] ?? id;
}

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
export function validateScheduleSettings(raw, locale = 'nl') {
  const tx = text(locale);
  const errors = [];
  if (validDays(raw?.training_days).length === 0) errors.push(tx.errDays);
  if (!ROTATION_IDS.includes(raw?.rotation)) errors.push(tx.errRotation);
  return errors;
}

/** De opties die de planningsfuncties in schedule.js verwachten. */
export function scheduleOptions(settings) {
  const s = normalizeScheduleSettings(settings);
  return { trainingDays: s.training_days, rotation: s.rotation };
}

/** "Dinsdag, donderdag en zaterdag, op volgorde." */
export function describeSchedule(settings, workoutCount, locale = 'nl') {
  const tx = text(locale);
  const s = normalizeScheduleSettings(settings);
  const names = WEEKDAYS.filter((w) => s.training_days.includes(w.day)).map((w) => tx.labels[w.day]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} ${tx.and} ${names.at(-1)}` : names[0];
  const order = s.rotation === 'willekeurig' ? tx.random(workoutCount) : tx.inOrder;
  return `${list.charAt(0).toUpperCase()}${list.slice(1)}, ${order}.`;
}
