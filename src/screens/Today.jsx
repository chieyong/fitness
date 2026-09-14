import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveToday, todayISO, formatDateShort } from '../lib/schedule.js';
import { lastPerformance, setsFor, feedbackFor, lastFeedback } from '../lib/progress.js';
import {
  fetchTemplates, fetchSessions, fetchTemplateExercises, fetchLogsForExercises,
  fetchFeedbackForExercises, saveFeedback,
  ensureUpcomingSessions, saveSet, deleteSet, setExerciseSkipped,
  closeSession, reopenSession,
} from '../lib/queries.js';
import SessionHeader from '../components/SessionHeader.jsx';
import ExerciseBlock from '../components/ExerciseBlock.jsx';
import SessionActions from '../components/SessionActions.jsx';
import DateStepper from '../components/DateStepper.jsx';
import VideoModal from '../components/VideoModal.jsx';
import '../components/ExerciseBlock.css';
import '../components/SessionActions.css';
import './Today.css';
import './Exercise.css';

/** ?date=2026-09-15 overschrijft de begindatum; ongeldige waarden negeren we. */
function dateFromUrl() {
  const value = new URLSearchParams(window.location.search).get('date');
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export default function Today({ onOpenExercise }) {
  const today = useMemo(() => todayISO(), []);
  const [date, setDate] = useState(() => dateFromUrl() ?? today);

  const [templates, setTemplates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [video, setVideo] = useState(null);
  const closeVideo = useCallback(() => setVideo(null), []);
  // Eén oefening tegelijk open houdt het scherm compact in de gym.
  const [openId, setOpenId] = useState(null);
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

  const view = useMemo(
    () => (sessions.length ? resolveToday(sessions, date) : null),
    [sessions, date],
  );

  // De sessie die het scherm toont: wat er te doen staat, of -- als die dag al
  // achter de rug is -- wat er gedaan is.
  const session = view?.current?.session ?? view?.done ?? null;
  const template = session ? templates.find((t) => t.id === session.template_id) : null;
  const readOnly = session ? session.status !== 'gepland' : true;

  // Oefeningen van de getoonde sessie, plus alle logs van die oefeningen --
  // die laatste voeden zowel de invoervelden als "vorige keer".
  useEffect(() => {
    let cancelled = false;
    if (!template) { setExercises([]); setLogs([]); setFeedback([]); return undefined; }

    (async () => {
      try {
        const rows = await fetchTemplateExercises(template.id);
        if (cancelled) return;
        setExercises(rows);
        const ids = rows.map((r) => r.exercise_id);
        const [loaded, fb] = await Promise.all([fetchLogsForExercises(ids), fetchFeedbackForExercises(ids)]);
        if (!cancelled) { setLogs(loaded); setFeedback(fb); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();

    return () => { cancelled = true; };
  }, [template?.id]);

  const reloadLogs = useCallback(async () => {
    if (exercises.length === 0) return;
    setLogs(await fetchLogsForExercises(exercises.map((r) => r.exercise_id)));
  }, [exercises]);

  const handleSaveSet = useCallback(async (row) => {
    try {
      await saveSet({ ...row, session_id: session.id });
      await reloadLogs();
    } catch (e) { setError(e.message); }
  }, [session?.id, reloadLogs]);

  const handleDeleteSet = useCallback(async (id) => {
    try { await deleteSet(id); await reloadLogs(); } catch (e) { setError(e.message); }
  }, [reloadLogs]);

  const handleToggleSkip = useCallback(async (exerciseId, skipped) => {
    try {
      await setExerciseSkipped(session.id, exerciseId, skipped);
      await reloadLogs();
    } catch (e) { setError(e.message); }
  }, [session?.id, reloadLogs]);

  const handleClose = useCallback(async (newStatus, notes) => {
    try {
      const updated = await closeSession(session.id, {
        status: newStatus, actualDate: date, notes,
      });
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e) { setError(e.message); }
  }, [session?.id, date]);

  const handleReopen = useCallback(async () => {
    try {
      const updated = await reopenSession(session.id);
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e) { setError(e.message); }
  }, [session?.id]);

  const handleSaveFeedback = useCallback(async (exerciseId, fields) => {
    try {
      const saved = await saveFeedback({ session_id: session.id, exercise_id: exerciseId, ...fields });
      setFeedback((prev) => [
        ...prev.filter((f) => !(f.session_id === saved.session_id && f.exercise_id === saved.exercise_id)),
        saved,
      ]);
    } catch (e) { setError(e.message); }
  }, [session?.id]);

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
        template={template}
        entry={view?.current}
        done={!view?.current && view?.done ? view.done : null}
      />

      {error && <p className="today__error">{error}</p>}

      {session ? (
        <>
          <ol className="blocks">
            {exercises.map((item) => {
              const logged = setsFor(logs, session.id, item.exercise_id);
              return (
                <ExerciseBlock
                  key={item.id}
                  item={item}
                  logged={logged.filter((l) => !l.skipped)}
                  skipped={logged.length > 0 && logged.every((l) => l.skipped)}
                  previous={lastPerformance(logs, sessions, item.exercise_id, date, session.id)}
                  readOnly={readOnly}
                  onSaveSet={handleSaveSet}
                  onDeleteSet={handleDeleteSet}
                  open={openId === item.id}
                  onToggleOpen={() => setOpenId(openId === item.id ? null : item.id)}
                  onToggleSkip={(skip) => handleToggleSkip(item.exercise_id, skip)}
                  onOpen={() => onOpenExercise(item.exercise_id)}
                  feedback={feedbackFor(feedback, session.id, item.exercise_id)}
                  previousFeedback={lastFeedback(feedback, sessions, item.exercise_id, date, session.id)}
                  onSaveFeedback={(fields) => handleSaveFeedback(item.exercise_id, fields)}
                  onPlayVideo={setVideo}
                />
              );
            })}
          </ol>

          <SessionActions
            session={session}
            readOnly={readOnly}
            onClose={handleClose}
            onReopen={handleReopen}
          />
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
      <VideoModal video={video} onClose={closeVideo} />
    </main>
  );
}
