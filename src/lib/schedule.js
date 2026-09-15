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

/** Datumwoorden per taal. Weekdagen op JavaScript-volgorde: zondag = 0. */
const DATE_WORDS = {
  nl: {
    weekdays: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    weekdaysShort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    months: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
    monthsShort: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
    today: 'Vandaag', tomorrow: 'Morgen', yesterday: 'Gisteren',
  },
  en: {
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday',
  },
};

const words = (locale) => DATE_WORDS[locale] ?? DATE_WORDS.nl;

/** Target-toevoegingen uit het programma, vertaald. Onbekende blijven zoals ze zijn. */
const TARGET_NOTES = { en: { 'per been': 'per leg', 'per kant': 'per side' } };

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
  const { trainingDays = TRAINING_DAYS, rotation = 'volgorde', random = Math.random } = options;
  const ordered = templates.slice().sort((a, b) => a.position - b.position);
  if (ordered.length === 0) return [];

  const existing = openSessions(sessions);
  const missing = count - existing.length;
  if (missing <= 0) return [];

  const all = sessions
    .slice()
    .sort((a, b) => (a.planned_date < b.planned_date ? -1 : 1));
  const last = all[all.length - 1];

  // Staat de laatste training vandaag of later, dan verder ná die training. Ligt
  // hij in het verleden, dan telt vandaag zelf mee: anders valt een trainingsdag
  // weg zodra de training van vandaag opnieuw is ingedeeld.
  let cursor = nextTrainingDay(today, { inclusive: true, trainingDays });
  if (last && last.planned_date >= today) {
    cursor = nextTrainingDay(last.planned_date, { trainingDays });
  }

  const pick = rotation === 'willekeurig'
    ? shuffledRounds(ordered, all, random)
    : inOrder(ordered, last);

  const created = [];
  for (let i = 0; i < missing; i += 1) {
    const { template, cycle } = pick();
    created.push({
      template_id: template.id,
      planned_date: cursor,
      status: OPEN_STATUS,
      cycle,
    });
    cursor = nextTrainingDay(cursor, { trainingDays });
  }
  return created;
}

/** Op volgorde: A -> B -> C, verder na de laatst geplande workout. Geen rondenummer nodig. */
function inOrder(ordered, last) {
  let index = 0;
  if (last) {
    const lastIndex = ordered.findIndex((t) => t.id === last.template_id);
    index = lastIndex === -1 ? 0 : (lastIndex + 1) % ordered.length;
  }
  return () => {
    const template = ordered[index];
    index = (index + 1) % ordered.length;
    return { template, cycle: null };
  };
}

/**
 * Willekeurig per ronde: elke ronde bevat elke workout precies één keer, in een
 * geschudde volgorde. Een halve ronde wordt eerst afgemaakt; een nieuwe ronde
 * begint nooit met de workout waarmee de vorige eindigde, en heeft (vanaf drie
 * workouts) altijd een andere volgorde dan de vorige ronde -- anders lijkt het
 * alsof er niet geschud is.
 *
 * Het rondenummer (`cycle`) op de sessies maakt terugvinden betrouwbaar: zonder
 * zou A B C | C A B niet te onderscheiden zijn van een willekeurige reeks.
 */
function shuffledRounds(ordered, all, random) {
  const active = new Set(ordered.map((t) => t.id));
  const numbered = all.filter((s) => s.cycle != null);
  let cycle = numbered.length ? Math.max(...numbered.map((s) => s.cycle)) : 0;
  const usedIds = new Set(
    numbered.filter((s) => s.cycle === cycle).map((s) => s.template_id).filter((id) => active.has(id)),
  );
  let lastId = all.length ? all[all.length - 1].template_id : null;
  let queue = [];
  // De volgorde van de laatst afgeronde ronde, om een herhaling te voorkomen.
  let previousRound = usedIds.size >= ordered.length
    ? numbered.filter((s) => s.cycle === cycle).map((s) => s.template_id)
    : [];
  let currentRound = numbered.filter((s) => s.cycle === cycle).map((s) => s.template_id);

  const shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.length > 1 && out[0].id === lastId) [out[0], out[1]] = [out[1], out[0]];
    return out;
  };

  const startRound = () => {
    if (currentRound.length) previousRound = currentRound;
    currentRound = [];
    cycle += 1;
    queue = shuffle(ordered);
    const same = (order) => ordered.length >= 3 && previousRound.length === order.length
      && order.every((t, i) => t.id === previousRound[i]);
    // Maximaal een paar keer opnieuw schudden; de start-regel blijft gelden.
    for (let tries = 0; tries < 20 && same(queue); tries += 1) queue = shuffle(ordered);
    if (same(queue)) {
      // Nog steeds gelijk (zeer onwaarschijnlijk): wissel de laatste twee om.
      const n = queue.length;
      [queue[n - 1], queue[n - 2]] = [queue[n - 2], queue[n - 1]];
    }
  };

  if (cycle === 0 || usedIds.size >= ordered.length) startRound();
  else queue = shuffle(ordered.filter((t) => !usedIds.has(t.id)));

  return () => {
    if (queue.length === 0) startRound();
    const template = queue.shift();
    lastId = template.id;
    currentRound.push(template.id);
    return { template, cycle };
  };
}

/** 'Zaterdag 13 september' / 'Saturday 19 September' — en 'Vandaag' / 'Today' waar dat duidelijker is. */
export function formatDateLong(iso, today, locale = 'nl') {
  const w = words(locale);
  if (today) {
    const delta = daysBetween(today, iso);
    if (delta === 0) return w.today;
    if (delta === 1) return w.tomorrow;
    if (delta === -1) return w.yesterday;
  }
  const d = new Date(parseISO(iso));
  const weekday = w.weekdays[d.getUTCDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d.getUTCDate()} ${w.months[d.getUTCMonth()]}`;
}

/** 'za 20 sep' / 'Sat 20 Sep' — compacte variant voor lijstjes. */
export function formatDateShort(iso, locale = 'nl') {
  const w = words(locale);
  const d = new Date(parseISO(iso));
  return `${w.weekdaysShort[d.getUTCDay()]} ${d.getUTCDate()} ${w.monthsShort[d.getUTCMonth()]}`;
}

/** '3 × 10-12', '3 × 30-45 sec', '3 × 12 per been' / '3 × 12 per leg' */
export function formatTarget({
  target_sets, target_reps_min, target_reps_max,
  target_seconds, target_seconds_max, target_note,
}, locale = 'nl') {
  const range = (min, max) => (max && max !== min ? `${min}-${max}` : `${min}`);

  const core = target_seconds
    ? `${target_sets} × ${range(target_seconds, target_seconds_max)} sec`
    : `${target_sets} × ${range(target_reps_min, target_reps_max)}`;

  const note = target_note ? (TARGET_NOTES[locale]?.[target_note] ?? target_note) : null;
  return note ? `${core} ${note}` : core;
}
