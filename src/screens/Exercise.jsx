import { useEffect, useMemo, useState } from 'react';
import { seriesFor, trend, formatSets } from '../lib/progress.js';
import { formatDateShort, formatTarget } from '../lib/schedule.js';
import { formatNumber } from '../lib/input.js';
import { muscleLabel } from '../lib/muscleLabels.js';
import {
  fetchExercise, fetchExerciseTemplates, fetchSessions, fetchLogsForExercises,
} from '../lib/queries.js';
import LineChart from '../components/LineChart.jsx';
import './Exercise.css';

export default function Exercise({ exerciseId, onBack }) {
  const [exercise, setExercise] = useState(null);
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
        <h1 className="exercise__title">Kan de oefening niet laden</h1>
        <p className="exercise__meta">{error}</p>
      </main>
    );
  }
  if (status === 'leeg') {
    return (
      <main className="page">
        <Back onBack={onBack} />
        <h1 className="exercise__title">Oefening niet gevonden</h1>
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
        {exercise.muscle_groups.map(muscleLabel).join(', ')}
        {inTemplates.length > 0 && ` · ${inTemplates.map((t) => t.template.label).join(', ')}`}
      </p>
      {exercise.notes && <p className="exercise__notes">{exercise.notes}</p>}

      {series.length === 0 ? (
        <p className="exercise__empty">
          Nog niets gelogd voor deze oefening. Zodra je hem een keer doet,
          verschijnt hier je voortgang.
        </p>
      ) : (
        <>
      {latest ? (
        <div className="hero">
          <span className="hero__value">{formatNumber(latest[metric])}<span className="hero__unit">{unit}</span></span>
          <span className="hero__label">
            {isTimed ? 'Langste set' : 'Zwaarste set'} — {formatDateShort(latest.date)}
            {delta != null && delta !== 0 && (
              <span className={`hero__delta${delta > 0 ? ' hero__delta--up' : ''}`}>
                {delta > 0 ? '+' : ''}{formatNumber(delta)} {unit} sinds {formatDateShort(done[0].date)}
              </span>
            )}
          </span>
        </div>
      ) : (
        <p className="exercise__meta">Nog geen metingen voor deze oefening.</p>
      )}

      <LineChart
        title={isTimed ? 'Langste set per training' : 'Zwaarste set per training'}
        points={done.map((p) => ({ date: p.date, value: p[metric] }))}
        formatValue={(v) => `${formatNumber(v)} ${unit}`}
        emptyLabel="Nog niets gelogd."
      />

      {!isTimed && (
        <LineChart
          title="Volume per training"
          points={series.filter((p) => p.volume > 0).map((p) => ({ date: p.date, value: p.volume }))}
          formatValue={(v) => `${formatNumber(Math.round(v))} kg`}
          emptyLabel="Nog niets gelogd."
        />
      )}

      <section className="log">
        <h2 className="log__heading">Alle trainingen</h2>
        <table className="log__table">
          <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Sets</th>
                <th scope="col">Volume</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((p) => (
                <tr key={p.sessionId}>
                  <td>{formatDateShort(p.date)}</td>
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
          Target: {inTemplates
            .map((t) => `${formatTarget(t)} in ${t.template.label}`)
            .join(' · ')}
        </p>
      )}
    </main>
  );
}

function Back({ onBack }) {
  return (
    <button type="button" className="back" onClick={onBack}>
      <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
        <path d="M7.5 1.5 2.5 7l5 5.5" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Terug
    </button>
  );
}
