/**
 * Demo-gegevens: een half jaar trainen volgens het echte programma, maar met
 * verzonnen prestaties. Deterministisch -- dezelfde seed levert dezelfde data,
 * zodat de demo er bij elk bezoek hetzelfde uitziet en testbaar is.
 *
 * Het verloop volgt dubbele progressie: eerst reps opbouwen tot de bovenkant
 * van het target, dan gewicht erbij en weer onderaan beginnen. Met af en toe
 * een slechte dag, een gemiste training, een vakantie en een deload, want een
 * lijn die alleen maar stijgt ziet er niet uit als echt trainen.
 */
import { templates as program } from '../../data/program.js';
import { addDays, isTrainingDay } from '../schedule.js';

/** Kleine, snelle PRNG met seed (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Startgewicht en stapgrootte per oefening; zonder regel = eigen lichaamsgewicht. */
const LOAD = {
  'Bankdrukken': [10, 2],
  'Gebogen rij': [10, 2],
  'Schouderpers': [8, 2],
  'Beenpers of squats': [45, 5],
  'Bicepscurls': [7, 1],
  'Triceps pushdown of dips': [15, 2.5],
  'Lat pulldown of pull-ups': [40, 2.5],
  'Incline dumbbell press': [9, 2],
  'Romanian deadlift': [30, 5],
  'Hammer curls': [8, 1],
  'Skull crushers of overhead triceps extension': [15, 2.5],
  'Deadlifts': [50, 5],
  'Uitvalspassen': [8, 2],
  'Concentration curls': [7, 1],
  'Close-grip bankdrukken': [9, 2],
};

const SESSION_NOTES = {
  nl: ['Zwaar vandaag', 'Voelde sterk', 'Kort op tijd, tempo omhoog', 'Slecht geslapen', 'Druk in de sportschool'],
  en: ['Tough today', 'Felt strong', 'Short on time, faster pace', 'Slept badly', 'Busy gym'],
};

const EXERCISE_NOTES = {
  nl: ['Nieuw record', 'Laatste set met hulp', 'Techniek gefilmd', 'Voelde licht', 'Techniek beter'],
  en: ['New record', 'Last set with a spot', 'Filmed my form', 'Felt light', 'Better technique'],
};

const isCore = (e) => e.muscles.some((m) => m === 'abs' || m === 'obliques');

export function generateDemoData({ today, weeks = 26, seed = 20260913, locale = 'nl' } = {}) {
  const lang = locale === 'en' ? 'en' : 'nl';
  const random = rng(seed);
  const chance = (p) => random() < p;
  const pick = (list) => list[Math.floor(random() * list.length)];

  // Bibliotheek, schema's en koppelingen: hetzelfde programma als de echte app.
  const exercises = [];
  const byName = new Map();
  for (const t of program) {
    for (const e of t.exercises) {
      if (byName.has(e.name)) continue;
      const row = {
        id: `demo-ex-${exercises.length + 1}`,
        name: lang === 'en' ? (e.en ?? e.name) : e.name,
        muscle_groups: [...e.muscles],
        equipment: e.equipment ?? null,
        measure: e.measure ?? null,
        catalog_key: null,
        video_urls: null,
        notes: lang === 'en' ? (e.notesEn ?? e.notes ?? null) : (e.notes ?? null),
      };
      exercises.push(row);
      byName.set(e.name, row);
    }
  }

  const templates = program.map((t) => ({
    id: `demo-tpl-${t.position}`, label: t.label, position: t.position, active: true,
  }));

  const template_exercises = program.flatMap((t) => t.exercises.map((e, i) => ({
    id: `demo-te-${t.position}-${i + 1}`,
    template_id: `demo-tpl-${t.position}`,
    exercise_id: byName.get(e.name).id,
    position: i + 1,
    target_sets: e.sets,
    target_reps_min: e.reps ?? null,
    target_reps_max: e.repsMax ?? null,
    target_seconds: e.seconds ?? null,
    target_seconds_max: e.secondsMax ?? null,
    target_note: e.targetNote ?? null,
  })));

  // Progressiestaat per oefening, gedeeld over schema's heen.
  const state = new Map();
  const stateFor = (name) => {
    if (!state.has(name)) {
      const [weight, step] = LOAD[name] ?? [null, 0];
      state.set(name, { weight, step, bonus: 0, seconds: null, done: 0 });
    }
    return state.get(name);
  };

  const sessions = [];
  const exercise_logs = [];
  const exercise_feedback = [];
  let logId = 0;
  let rotation = 0;

  const start = addDays(today, -weeks * 7);
  // Twee weken vakantie, ongeveer halverwege.
  const holidayFrom = addDays(start, Math.floor(weeks * 7 * 0.5));
  const holidayTo = addDays(holidayFrom, 11);

  for (let date = start; date < today; date = addDays(date, 1)) {
    if (!isTrainingDay(date)) continue;
    if (date >= holidayFrom && date <= holidayTo) continue;
    // Gemist: geen sessie, en volgens de doorschuifregel komt hetzelfde schema terug.
    if (chance(0.1)) continue;

    const t = program[rotation % program.length];
    const session = {
      id: `demo-s-${date}`,
      template_id: `demo-tpl-${t.position}`,
      planned_date: date,
      actual_date: date,
      status: 'voltooid',
      notes: null,
    };
    rotation += 1;

    if (chance(0.03)) {
      session.status = 'overgeslagen';
      sessions.push(session);
      continue;
    }
    if (chance(0.12)) session.notes = pick(SESSION_NOTES[lang]);
    sessions.push(session);

    const badDay = chance(0.1);

    for (const e of t.exercises) {
      const exercise = byName.get(e.name);
      const skipP = isCore(e) ? 0.3 : /deadlift/i.test(e.name) ? 0.15 : 0.03;
      if (chance(skipP)) {
        exercise_logs.push(log(session.id, exercise.id, 1, { skipped: true }));
        continue;
      }

      const s = stateFor(e.name);
      s.done += 1;

      let sets = e.sets;
      if (chance(0.1)) sets = Math.max(2, sets - 1);
      else if (chance(0.05)) sets += 1;

      // Hoe het ging: niet elke keer ingevuld, en op een slechte dag lager.
      const comment = chance(0.06) ? pick(EXERCISE_NOTES[lang]) : null;
      if (comment || chance(0.55)) {
        exercise_feedback.push({
          id: `demo-f-${exercise_feedback.length + 1}`,
          session_id: session.id,
          exercise_id: exercise.id,
          rating: badDay ? 2 + Math.floor(random() * 2) : 3 + Math.floor(random() * 3),
          comment,
        });
      }
      const note = null;

      if (e.seconds != null) {
        // Tijd: elke paar keer vijf seconden langer, tot de bovengrens.
        const ceiling = e.secondsMax ?? e.seconds + 30;
        if (s.seconds == null) s.seconds = e.seconds;
        else if (s.done % 3 === 0) s.seconds = Math.min(ceiling, s.seconds + 5);
        for (let n = 1; n <= sets; n += 1) {
          const secs = Math.max(10, s.seconds - (n > 1 && badDay ? 10 : 0));
          exercise_logs.push(log(session.id, exercise.id, n, { seconds: secs, note: n === 1 ? note : null }));
        }
        continue;
      }

      const min = e.reps;
      const max = e.repsMax ?? e.reps + 2;
      let allAtTop = true;

      for (let n = 1; n <= sets; n += 1) {
        let reps = min + s.bonus + (chance(0.25) ? 1 : 0);
        if (badDay && n > 1) reps -= 2;
        if (n === sets && chance(0.3)) reps -= 1;          // laatste set is het zwaarst
        reps = Math.max(Math.max(1, min - 3), Math.min(max, reps));
        if (reps < max) allAtTop = false;
        exercise_logs.push(log(session.id, exercise.id, n, {
          reps, weight_kg: s.weight, note: n === 1 ? note : null,
        }));
      }

      if (s.weight != null) {
        if (allAtTop) { s.weight = round(s.weight + s.step); s.bonus = 0; }
        else if (chance(0.6)) s.bonus = Math.min(max - min, s.bonus + 1);
        // Deload na een week of acht: even terug om daarna verder te bouwen.
        if (s.done > 0 && s.done % 24 === 0) s.weight = round(Math.max(s.step, s.weight - s.step));
      } else if (chance(0.5)) {
        s.bonus = Math.min(max - min, s.bonus + 1);
      }
    }
  }

  function log(session_id, exercise_id, set_number, fields) {
    logId += 1;
    return {
      id: `demo-l-${logId}`,
      session_id,
      exercise_id,
      set_number,
      reps: fields.reps ?? null,
      weight_kg: fields.weight_kg ?? null,
      seconds: fields.seconds ?? null,
      skipped: fields.skipped ?? false,
      note: fields.note ?? null,
    };
  }

  return { exercises, templates, template_exercises, sessions, exercise_logs, exercise_feedback };
}

const round = (n) => Math.round(n * 10) / 10;
