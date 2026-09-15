import { useEffect, useMemo, useState } from 'react';
import { seriesFor, trend, formatSets } from '../lib/progress.js';
import { formatDateShort, formatTarget } from '../lib/schedule.js';
import { formatNumber } from '../lib/input.js';
import { muscleLabel } from '../lib/muscleLabels.js';
import {
  fetchExercise, fetchExerciseTemplates, fetchSessions, fetchLogsForExercises,
} from '../lib/queries.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import LineChart from '../components/LineChart.jsx';
import './Exercise.css';

export default function Exercise({ exerciseId, onBack }) {
  const [exercise, setExercise] = useState(null);
  const { t, locale } = useI18n();
  const [inTemplates, setInTemplates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('laden');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('laden');

    (async () => {
      try {
        const [ex, tpl, ses, lg] = await Promise.all([
          fetchExercise(exerciseId),
          fetchExerciseTemplates(exerciseId),
          fetchSessions(),
          fetchLogsForExercises([exerciseId]),
        ]);
        if (cancelled) return;
        setExercise(ex); setInTemplates(tpl); setSessions(ses); setLogs(lg);
        setStatus(ex ? 'klaar' : 'leeg');
      } catch (e) {
        if (!cancelled) { setError(e.message); setStatus('fout'); }
      }
    })();

    return () => { cancelled = true; };
  }, [exerciseId]);

  const series = useMemo(
    () => (exercise ? seriesFor(logs, sessions, exercise.id) : []),
    [logs, sessions, exercise],
  );

  // Tijdgebaseerde oefeningen hebben geen gewicht; dan is de duur de maat.
  const isTimed = inTemplates.some((t) => t.target_seconds != null);
  const metric = isTimed ? 'bestSeconds' : 'bestWeight';

  if (status === 'laden') return <main className="page" />;
  if (status === 'fout') {
    return (
      <main className="page">
        <Back onBack={onBack} />
        <h1 className="exercise__title">{t('exercise.loadError')}</h1>
        <p className="exercise__meta">{error}</p>
      </main>
    );
  }
  if (status === 'leeg') {
    return (
      <main className="page">
        <Back onBack={onBack} />
        <h1 className="exercise__title">{t('exercise.notFound')}</h1>
      </main>
    );
  }

  const done = series.filter((p) => p[metric] != null);
  const latest = done[done.length - 1] ?? null;
  const delta = trend(done, metric);
  const unit = isTimed ? 'sec' : 'kg';

  return (
    <main className="page">
      <Back onBack={onBack} />

      <h1 className="exercise__title">{exercise.name}</h1>
      <p className="exercise__meta">
        {exercise.muscle_groups.map((m) => muscleLabel(m, locale)).join(', ')}
        {inTemplates.length > 0 && ` · ${inTemplates.map((t) => t.template.label).join(', ')}`}
      </p>
      {exercise.notes && <p className="exercise__notes">{exercise.notes}</p>}

      {series.length === 0 ? (
        <p className="exercise__empty">
          {t('exercise.empty')}
        </p>
      ) : (
        <>
      {latest ? (
        <div className="hero">
          <span className="hero__value">{formatNumber(latest[metric])}<span className="hero__unit">{unit}</span></span>
          <span className="hero__label">
            {t(isTimed ? 'exercise.longest' : 'exercise.heaviest')} — {formatDateShort(latest.date, locale)}
            {delta != null && delta !== 0 && (
              <span className={`hero__delta${delta > 0 ? ' hero__delta--up' : ''}`}>
                {t('exercise.since', { delta: `${delta > 0 ? '+' : ''}${formatNumber(delta)}`, unit, date: formatDateShort(done[0].date, locale) })}
              </span>
            )}
          </span>
        </div>
      ) : (
        <p className="exercise__meta">{t('exercise.noMeasurements')}</p>
      )}

      <LineChart
        title={t(isTimed ? 'exercise.longestChart' : 'exercise.heaviestChart')}
        points={done.map((p) => ({ date: p.date, value: p[metric] }))}
        formatValue={(v) => `${formatNumber(v)} ${unit}`}
        emptyLabel={t('exercise.chartEmpty')}
      />

      {!isTimed && (
        <LineChart
          title={t('exercise.volumeChart')}
          points={series.filter((p) => p.volume > 0).map((p) => ({ date: p.date, value: p.volume }))}
          formatValue={(v) => `${formatNumber(Math.round(v))} kg`}
          emptyLabel={t('exercise.chartEmpty')}
        />
      )}

      <section className="log">
        <h2 className="log__heading">{t('exercise.history')}</h2>
        <table className="log__table">
          <thead>
              <tr>
                <th scope="col">{t('exercise.date')}</th>
                <th scope="col">{t('exercise.sets')}</th>
                <th scope="col">{t('exercise.volume')}</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((p) => (
                <tr key={p.sessionId}>
                  <td>{formatDateShort(p.date, locale)}</td>
                  <td>{formatSets(p.sets)}</td>
                  <td>{p.volume > 0 ? `${formatNumber(Math.round(p.volume))} kg` : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

        </>
      )}

      {inTemplates.length > 0 && (
        <p className="exercise__targets">
          {t('exercise.target', {
            list: inTemplates
              .map((row) => t('exercise.targetIn', { target: formatTarget(row, locale), workout: row.template.label }))
              .join(' · '),
          })}
        </p>
      )}
    </main>
  );
}

function Back({ onBack }) {
  const { t } = useI18n();
  return (
    <button type="button" className="back" onClick={onBack}>
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
        <path d="M8 2 2 8l6 6" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">{t('common.back')}</span>
    </button>
  );
}
