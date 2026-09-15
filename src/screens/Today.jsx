import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveToday, todayISO, formatDateShort } from '../lib/schedule.js';
import { lastPerformance, setsFor, feedbackFor, lastFeedback } from '../lib/progress.js';
import { todayMuscles } from '../lib/todayMuscles.js';
import { muscleWeights } from '../lib/muscleWeights.js';
import { exerciseIdsWithAlternatives, resolveSessionItem } from '../lib/alternatives.js';
import { scheduleOptions } from '../lib/scheduleSettings.js';
import {
  fetchTemplates, fetchSessions, fetchTemplateExercises, fetchLogsForExercises, fetchScheduleSettings,
  fetchFeedbackForExercises, saveFeedback, fetchAllExercises,
  ensureUpcomingSessions, saveSet, deleteSet, setExerciseSkipped,
  closeSession, reopenSession, dataMode,
} from '../lib/queries.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import SessionHeader from '../components/SessionHeader.jsx';
import ExerciseBlock from '../components/ExerciseBlock.jsx';
import TodayBody from '../components/TodayBody.jsx';
import SessionActions from '../components/SessionActions.jsx';
import DateStepper from '../components/DateStepper.jsx';
import VideoModal from '../components/VideoModal.jsx';
import Tour from '../components/Tour.jsx';
import { tourSteps } from '../data/tourSteps.js';
import { hasSeenTour, markTourSeen } from '../lib/tour.js';
import { whenSplashGone } from '../lib/splash.js';
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
  const { t, locale } = useI18n();

  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [allExercises, setAllExercises] = useState(new Map());
  // Gekozen alternatief per oefening in deze sessie, zolang er nog niets gelogd is.
  const [choices, setChoices] = useState(new Map());
  const [video, setVideo] = useState(null);
  const closeVideo = useCallback(() => setVideo(null), []);

  // Rondleiding: vanzelf bij het eerste bezoek, daarna via "Uitleg bekijken".
  const [tourOpen, setTourOpen] = useState(false);
  const steps = useMemo(() => tourSteps({ demo: dataMode() === 'demo', t }), [t]);
  const closeTour = useCallback(() => { markTourSeen(window.localStorage); setTourOpen(false); }, []);
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
        const [loadedTemplates, loadedSessions, loadedSettings] = await Promise.all([
          fetchTemplates(), fetchSessions(), fetchScheduleSettings(),
        ]);
        const filled = await ensureUpcomingSessions(loadedTemplates, loadedSessions, today, loadedSettings);
        if (cancelled) return;
        setSettings(loadedSettings);
        setTemplates(loadedTemplates);
        setSessions(filled);
        setStatus('klaar');
      } catch (e) {
        if (!cancelled) { setError(e.message); setStatus('fout'); }
      }
    })();

    return () => { cancelled = true; };
  }, [today]);

  // Rustdag of trainingsdag hangt af van de gekozen trainingsdagen.
  const view = useMemo(
    () => (sessions.length ? resolveToday(sessions, date, scheduleOptions(settings)) : null),
    [sessions, date, settings],
  );

  // De sessie die het scherm toont: wat er te doen staat, of -- als die dag al
  // achter de rug is -- wat er gedaan is.
  const session = view?.current?.session ?? view?.done ?? null;
  const template = session ? templates.find((t) => t.id === session.template_id) : null;
  const readOnly = session ? session.status !== 'gepland' : true;

  // Andere sessie: eerdere wisselkeuzes gelden niet meer.
  useEffect(() => { setChoices(new Map()); }, [session?.id]);

  // De oefeningen zoals deze sessie ze toont: met het gekozen alternatief, als dat er is.
  const items = useMemo(() => (session
    ? exercises.map((item) => resolveSessionItem(item, {
      exercisesById: allExercises, session, date, logs, sessions, choice: choices.get(item.id),
    }))
    : exercises), [session, exercises, allExercises, date, logs, sessions, choices]);

  // Welke spiergroepen deze training raakt, met nadruk per rol (primair,
  // secundair, tertiair), en hoe ver je bent: elke gelogde set kleurt mee.
  const muscleStates = useMemo(() => {
    if (!session) return new Map();
    return todayMuscles(items.map((item) => {
      const logged = setsFor(logs, session.id, item.exercise_id);
      return {
        weights: muscleWeights(item.exercise),
        targetSets: item.target_sets,
        doneSets: logged.filter((l) => !l.skipped).length,
        skipped: logged.length > 0 && logged.every((l) => l.skipped),
      };
    }));
  }, [session?.id, items, logs]);

  // Oefeningen van de getoonde sessie, plus alle logs van die oefeningen --
  // die laatste voeden zowel de invoervelden als "vorige keer".
  useEffect(() => {
    let cancelled = false;
    if (!template) { setExercises([]); setLogs([]); setFeedback([]); return undefined; }

    (async () => {
      try {
        const [rows, all] = await Promise.all([fetchTemplateExercises(template.id), fetchAllExercises()]);
        if (cancelled) return;
        const byId = new Map(all.map((e) => [e.id, e]));
        setAllExercises(byId);
        setExercises(rows);
        const ids = exerciseIdsWithAlternatives(rows, byId);
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
    setLogs(await fetchLogsForExercises(exerciseIdsWithAlternatives(exercises, allExercises)));
  }, [exercises, allExercises]);

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

  // Pas starten als het scherm staat én het laadscherm helemaal weg is.
  useEffect(() => {
    if (status !== 'klaar' || hasSeenTour(window.localStorage)) return undefined;
    let cancelled = false;
    let timer = 0;
    whenSplashGone().then(() => {
      if (!cancelled) timer = setTimeout(() => setTourOpen(true), 500);
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, [status]);

  if (status === 'laden') return <main className="page" />;

  if (status === 'fout') {
    return (
      <main className="page">
        <h1 className="session-header__title">{t('common.loadError')}</h1>
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
          <TodayBody states={muscleStates} />
          <ol className="blocks">
            {items.map((item) => {
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
                  alternative={item.alternative}
                  swapped={item.swapped}
                  canSwap={!readOnly && logged.length === 0}
                  onSwap={() => item.alternative && setChoices((prev) => new Map(prev).set(item.id, item.alternative.id))}
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
          {t('session.none', {
            date: view?.upcoming[0] ? formatDateShort(view.upcoming[0].date, locale) : t('session.noDate'),
          })}
        </p>
      )}

      {view?.upcoming.length > 0 && (
        <section className="upcoming">
          <h2 className="upcoming__heading">{t('session.upcoming')}</h2>
          <ul className="upcoming__list">
            {view.upcoming.slice(0, 3).map((entry) => (
              <li key={entry.session.id} className="upcoming__item">
                <span>{formatDateShort(entry.date, locale)}</span>
                <span className="upcoming__label">
                  {templates.find((t) => t.id === entry.session.template_id)?.label ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button type="button" className="today__help" onClick={() => setTourOpen(true)}>
        {t('session.help')}
      </button>
      <Tour steps={steps} open={tourOpen} onClose={closeTour} />
      <VideoModal video={video} onClose={closeVideo} />
    </main>
  );
}
