/**
 * Een sessie die je hebt ingevuld maar niet hebt afgesloten, sluit zichzelf af
 * zodra die dag voorbij is. Puur: geen React, geen Supabase, geen Date.now().
 *
 * Waarom: het schema schuift pas op als een sessie dicht is. Vergeet je op de
 * knop te drukken, dan blijft de training van dinsdag achterstand maken terwijl
 * je hem gewoon gedaan hebt -- en zou je hem morgen opnieuw voorgeschoteld
 * krijgen, mét de sets die je al had gelogd.
 *
 * Twee voorwaarden, allebei nodig:
 * - er staat minstens één echte set in. Een sessie waarin je alleen "niet
 *   gedaan" hebt aangevinkt of waar je niet aan begonnen bent, blijft open en
 *   schuift door: dat is inhaalwerk, geen gemiste knop.
 * - de dag waarop je eraan werkte is voorbij. Vandaag ben je misschien nog bezig.
 */
import { todayISO } from './schedule.js';

const OPEN_STATUS = 'gepland';

/** 'logged_at' als lokale dag; ongeldige of ontbrekende stempels tellen niet mee. */
function logDate(log) {
  if (!log.logged_at) return null;
  const at = new Date(log.logged_at);
  return Number.isNaN(at.getTime()) ? null : todayISO(at);
}

/**
 * De dag waarop aan een sessie gewerkt is: de laatste gelogde set. Zonder
 * tijdstempel (demo, oudere rijen) valt dit terug op de plandatum -- de dag
 * waarop de sessie in beeld stond.
 */
export function workedDate(session, logs) {
  let last = null;
  for (const log of logs) {
    const date = logDate(log);
    if (date && (last === null || date > last)) last = date;
  }
  return last ?? session.planned_date;
}

/**
 * Welke openstaande sessies vanzelf afgerond horen te worden, met de datum
 * waarop dat werk gebeurde. `logs` mag rijen van andere sessies bevatten.
 *
 * @returns [{ id, actualDate }]
 */
export function sessionsToAutoClose(sessions, logs, today) {
  const bySession = new Map();
  for (const log of logs) {
    if (!bySession.has(log.session_id)) bySession.set(log.session_id, []);
    bySession.get(log.session_id).push(log);
  }

  const out = [];
  for (const session of sessions) {
    if (session.status !== OPEN_STATUS) continue;

    const rows = bySession.get(session.id) ?? [];
    if (!rows.some((log) => !log.skipped)) continue;

    const date = workedDate(session, rows);
    if (date >= today) continue;

    out.push({ id: session.id, actualDate: date });
  }
  return out;
}
