import { useEffect, useMemo, useState } from 'react';
import { resolveToday, todayISO, formatDateShort } from '../lib/schedule.js';
import {
  fetchTemplates, fetchSessions, fetchTemplateExercises, ensureUpcomingSessions,
} from '../lib/queries.js';
import SessionHeader from '../components/SessionHeader.jsx';
import ExerciseList from '../components/ExerciseList.jsx';
import DateStepper from '../components/DateStepper.jsx';
import './Today.css';

/** ?date=2026-09-15 overschrijft de begindatum; ongeldige waarden negeren we. */
function dateFromUrl() {
  const value = new URLSearchParams(window.location.search).get('date');
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export default function Today() {
  const today = useMemo(() => todayISO(), []);
  const [date, setDate] = useState(() => dateFromUrl() ?? today);

  const [templates, setTemplates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [status, setStatus] = useState('laden');
  const [error, setError] = useState(null);

  // De getoonde dag in de URL houden: deelbaar, en na een refresh blijf je staan.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (date === today) url.searchParams.delete('date');
    else url.searchParams.set('date', date);
    window.history.replaceState(null, '', url);
  }, [date, today]);

  // Eenmalig: schema's en sessies ophalen, en het schema vooruit aanvullen.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [loadedTemplates, loadedSessions] = await Promise.all([
          fetchTemplates(), fetchSessions(),
        ]);
        const filled = await ensureUpcomingSessions(loadedTemplates, loadedSessions, today);
        if (cancelled) return;
        setTemplates(loadedTemplates);
        setSessions(filled);
        setStatus('klaar');
      } catch (e) {
        if (!cancelled) { setError(e.message); setStatus('fout'); }
      }
    })();

    return () => { cancelled = true; };
  }, [today]);

  // De geselecteerde datum bepaalt wat er te doen staat.
  const view = useMemo(
    () => (sessions.length ? resolveToday(sessions, date) : null),
    [sessions, date],
  );

  // De sessie die het scherm toont: wat er te doen staat, of -- als die dag al
  // achter de rug is -- wat er gedaan is.
  const shownSession = view?.current?.session ?? view?.done ?? null;
  const currentTemplate = shownSession
    ? templates.find((t) => t.id === shownSession.template_id)
    : null;

  // Oefeningen van de getoonde sessie.
  useEffect(() => {
    let cancelled = false;
    if (!currentTemplate) { setExercises([]); return undefined; }

    fetchTemplateExercises(currentTemplate.id)
      .then((rows) => { if (!cancelled) setExercises(rows); })
      .catch((e) => { if (!cancelled) setError(e.message); });

    return () => { cancelled = true; };
  }, [currentTemplate?.id]);

  if (status === 'laden') return <main className="page" />;

  if (status === 'fout') {
    return (
      <main className="page">
        <h1 className="session-header__title">Kan de gegevens niet laden</h1>
        <p className="today__message">{error}</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="today__bar">
        <DateStepper date={date} today={today} onChange={setDate} />
      </div>

      <SessionHeader
        date={date}
        today={today}
        template={currentTemplate}
        entry={view?.current}
        done={!view?.current && view?.done ? view.done : null}
      />

      {shownSession ? (
        <>
          {shownSession.notes && <p className="today__note">{shownSession.notes}</p>}
          <ExerciseList items={exercises} />
        </>
      ) : (
        <p className="today__message">
          Geen training gepland. De eerstvolgende sessie staat op{' '}
          {view?.upcoming[0] ? formatDateShort(view.upcoming[0].date) : 'nog geen datum'}.
        </p>
      )}

      {view?.upcoming.length > 0 && (
        <section className="upcoming">
          <h2 className="upcoming__heading">Hierna</h2>
          <ul className="upcoming__list">
            {view.upcoming.slice(0, 3).map((entry) => (
              <li key={entry.session.id} className="upcoming__item">
                <span>{formatDateShort(entry.date)}</span>
                <span className="upcoming__label">
                  {templates.find((t) => t.id === entry.session.template_id)?.label ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
