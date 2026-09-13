/**
 * Datum- en doorschuiflogica. Puur: geen React, geen Supabase, geen Date.now().
 * Datums zijn overal ISO-strings ('2026-09-13') zodat tijdzones nooit een dag
 * kunnen verschuiven.
 *
 * De regel: trainingsdagen zijn dinsdag, donderdag en zaterdag. Openstaande
 * sessies behouden altijd hun onderlinge volgorde (A -> B -> C). Mis je een
 * sessie, dan schuift die naar de eerstvolgende beschikbare dag en schuift al
 * het latere mee -- je raakt dus nooit een workout kwijt.
 */

/** Dinsdag, donderdag, zaterdag (JS-conventie: zondag = 0). */
export const TRAINING_DAYS = [2, 4, 6];

const OPEN_STATUS = 'gepland';

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_NAMES = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
];

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

/** 'YYYY-MM-DD' -> UTC-timestamp op middernacht. */
function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function formatISO(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Vandaag als ISO-string, in lokale tijd van de gebruiker. */
export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso, n) {
  return formatISO(parseISO(iso) + n * DAY_MS);
}

export function dayOfWeek(iso) {
  return new Date(parseISO(iso)).getUTCDay();
}

export function daysBetween(fromISO, toISO) {
  return Math.round((parseISO(toISO) - parseISO(fromISO)) / DAY_MS);
}

export function isTrainingDay(iso, trainingDays = TRAINING_DAYS) {
  return trainingDays.includes(dayOfWeek(iso));
}

/**
 * Eerstvolgende trainingsdag. Met `inclusive` telt `iso` zelf mee wanneer dat
 * al een trainingsdag is.
 */
export function nextTrainingDay(iso, { inclusive = false, trainingDays = TRAINING_DAYS } = {}) {
  let cursor = inclusive ? iso : addDays(iso, 1);
  for (let i = 0; i < 14; i += 1) {
    if (isTrainingDay(cursor, trainingDays)) return cursor;
    cursor = addDays(cursor, 1);
  }
  throw new Error('Geen trainingsdag gevonden binnen twee weken');
}

/** Openstaande sessies, oudste eerst. Volgorde = de A -> B -> C-keten. */
export function openSessions(sessions) {
  return sessions
    .filter((s) => s.status === OPEN_STATUS)
    .slice()
    .sort((a, b) => (a.planned_date < b.planned_date ? -1
      : a.planned_date > b.planned_date ? 1
      : (a.id ?? '') < (b.id ?? '') ? -1 : 1));
}

/**
 * Projecteert openstaande sessies op echte datums, met de doorschuifregel.
 *
 * Is er achterstand (een openstaande sessie met een datum in het verleden), dan
 * is vandaag meteen de eerste inhaaldag -- ook als vandaag geen trainingsdag is.
 * De rest volgt op de reguliere trainingsdagen daarna.
 *
 * Geeft terug: [{ session, date, original_date, shifted, overdue_days }]
 */
export function projectSchedule(sessions, today, { trainingDays = TRAINING_DAYS } = {}) {
  const open = openSessions(sessions);
  if (open.length === 0) return [];

  // Staat de eerstvolgende sessie op vandaag of eerder, dan is vandaag de
  // eerste beschikbare dag -- ook als vandaag geen reguliere trainingsdag is.
  // Een sessie die expliciet op vandaag gepland staat hoort niet weggeschoven
  // te worden omdat de weekdag niet in het patroon past.
  const startsToday = open[0].planned_date <= today;

  let slot = startsToday
    ? today
    : nextTrainingDay(today, { inclusive: true, trainingDays });

  return open.map((session, i) => {
    // Een sessie die verder in de toekomst staat dan zijn slot houdt zijn eigen
    // datum: vooruit plannen doen we niet.
    const date = session.planned_date > slot ? session.planned_date : slot;
    slot = nextTrainingDay(date, { trainingDays });

    return {
      session,
      date,
      original_date: session.planned_date,
      shifted: date !== session.planned_date,
      overdue_days: i === 0 && session.planned_date < today
        ? daysBetween(session.planned_date, today)
        : 0,
    };
  });
}

/**
 * Wat staat er vandaag te doen? Geeft de geprojecteerde sessie voor vandaag
 * (indien die er is), de achterstand en de eerstvolgende sessie daarna.
 */
export function resolveToday(sessions, today, options = {}) {
  const schedule = projectSchedule(sessions, today, options);
  const current = schedule.find((entry) => entry.date === today) ?? null;

  // Een sessie die op deze dag al is afgerond of bewust overgeslagen. Zonder dit
  // zou een trainingsdag in het verleden als rustdag worden getoond.
  const done = sessions.find(
    (s) => s.status !== OPEN_STATUS && (s.actual_date ?? s.planned_date) === today,
  ) ?? null;
  const upcoming = schedule.filter((entry) => entry.date > today);
  const backlog = schedule.filter(
    (entry) => entry.original_date < today && entry !== current,
  );

  return {
    current,
    done,
    upcoming,
    backlog,
    isRestDay: current === null && done === null,
    isTrainingDay: isTrainingDay(today, options.trainingDays ?? TRAINING_DAYS),
  };
}

/**
 * Vult het schema aan tot `count` openstaande sessies, doorgaand in de
 * A -> B -> C-rotatie vanaf de laatst bekende sessie. Geeft alleen de nieuwe
 * rijen terug; wegschrijven doet de aanroeper.
 */
export function planNextSessions(templates, sessions, today, count = 6, options = {}) {
  const { trainingDays = TRAINING_DAYS } = options;
  const ordered = templates.slice().sort((a, b) => a.position - b.position);
  if (ordered.length === 0) return [];

  const existing = openSessions(sessions);
  const missing = count - existing.length;
  if (missing <= 0) return [];

  const all = sessions
    .slice()
    .sort((a, b) => (a.planned_date < b.planned_date ? -1 : 1));
  const last = all[all.length - 1];

  let templateIndex = 0;
  let cursor = nextTrainingDay(today, { inclusive: true, trainingDays });

  if (last) {
    const lastIndex = ordered.findIndex((t) => t.id === last.template_id);
    templateIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % ordered.length;
    const after = last.planned_date >= today ? last.planned_date : today;
    cursor = nextTrainingDay(after, { trainingDays });
  }

  const created = [];
  for (let i = 0; i < missing; i += 1) {
    created.push({
      template_id: ordered[templateIndex].id,
      planned_date: cursor,
      status: OPEN_STATUS,
    });
    templateIndex = (templateIndex + 1) % ordered.length;
    cursor = nextTrainingDay(cursor, { trainingDays });
  }
  return created;
}

/** 'Zaterdag 13 september' — en 'Vandaag' / 'Morgen' waar dat duidelijker is. */
export function formatDateLong(iso, today) {
  if (today) {
    const delta = daysBetween(today, iso);
    if (delta === 0) return 'Vandaag';
    if (delta === 1) return 'Morgen';
    if (delta === -1) return 'Gisteren';
  }
  const d = new Date(parseISO(iso));
  const weekday = WEEKDAY_NAMES[d.getUTCDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
}

/** 'za 20 sep' — compacte variant voor lijstjes. */
export function formatDateShort(iso) {
  const d = new Date(parseISO(iso));
  return `${WEEKDAY_NAMES[d.getUTCDay()].slice(0, 2)} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()].slice(0, 3)}`;
}

/** '3 × 10-12', '3 × 30-45 sec', '3 × 12 per been' */
export function formatTarget({
  target_sets, target_reps_min, target_reps_max,
  target_seconds, target_seconds_max, target_note,
}) {
  const range = (min, max) => (max && max !== min ? `${min}-${max}` : `${min}`);

  const core = target_seconds
    ? `${target_sets} × ${range(target_seconds, target_seconds_max)} sec`
    : `${target_sets} × ${range(target_reps_min, target_reps_max)}`;

  return target_note ? `${core} ${target_note}` : core;
}
