import { useEffect, useMemo, useRef, useState } from 'react';
import {
  muscleTotals, findMuscle, intensities, sortByMetric, busiestBy, muscleSeries,
} from '../lib/muscles.js';
import { seriesFor, trend, chartPoints, preferredMetric } from '../lib/progress.js';
import { muscleLabel, KNOWN_MUSCLES } from '../lib/muscleLabels.js';
import { addDays, todayISO, formatDateShort } from '../lib/schedule.js';
import { formatNumber } from '../lib/input.js';
import { fetchAllExercises, fetchAllLogs, fetchSessions } from '../lib/queries.js';
import BodyMap, { RampLegend } from '../components/BodyMap.jsx';
import MiniLine from '../components/MiniLine.jsx';
import './Progress.css';
import './Exercise.css';

const RANGES = [
  { id: '30', label: '30 dagen', days: 30 },
  { id: '90', label: '90 dagen', days: 90 },
  { id: 'alles', label: 'Alles', days: null },
];

const METRICS = [
  { id: 'sets', label: 'Sets', unit: '' },
  { id: 'volume', label: 'Volume', unit: 'kg' },
];

export default function Progress({ muscle, onSelectMuscle, onOpenExercise, onBack }) {
  const today = useMemo(() => todayISO(), []);
  const [range, setRange] = useState('30');
  const [metric, setMetric] = useState('sets');

  const selected = muscle && muscle !== '1' ? muscle : null;

  const [exercises, setExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('laden');
  const [error, setError] = useState(null);
  const bodyRef = useRef(null);
  const [bodyVisible, setBodyVisible] = useState(true);

  // Bewust een scroll-listener en geen IntersectionObserver: die laatste levert
  // zijn callback pas bij een volgende frame, waardoor de knop soms uitbleef.
  useEffect(() => {
    if (status !== 'klaar') return undefined;

    const check = () => {
      const el = bodyRef.current;
      if (!el) return;
      const bottom = el.offsetTop + el.offsetHeight;
      setBodyVisible(window.scrollY < bottom - 40);
    };

    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [status]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ex, ses, lg] = await Promise.all([
          fetchAllExercises(), fetchSessions(), fetchAllLogs(),
        ]);
        if (cancelled) return;
        setExercises(ex); setSessions(ses); setLogs(lg); setStatus('klaar');
      } catch (e) {
        if (!cancelled) { setError(e.message); setStatus('fout'); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const days = RANGES.find((r) => r.id === range)?.days ?? null;
  const from = days ? addDays(today, -days) : null;

  const totals = useMemo(
    () => muscleTotals(logs, sessions, exercises, from ? { from } : {}),
    [logs, sessions, exercises, from],
  );

  const intensity = useMemo(() => intensities(totals, metric), [totals, metric]);
  const ranked = useMemo(() => sortByMetric(totals, metric), [totals, metric]);
  const busiest = busiestBy(totals, metric);
  const unit = METRICS.find((m) => m.id === metric)?.unit ?? '';

  const valueOf = (m) => {
    const t = findMuscle(totals, m);
    const n = t ? (metric === 'sets' ? t.sets : Math.round(t.volume)) : 0;
    return `${formatNumber(n)}${unit ? ` ${unit}` : ' sets'}`;
  };

  // Een spiergroep kiezen klapt hem open en brengt je erheen. Nog een keer
  // tikken klapt hem weer dicht.
  const select = (m) => {
    const next = m === selected ? null : m;
    onSelectMuscle(next);
    if (next) requestAnimationFrame(() => scrollTo(`spier-${next}`));
  };

  // Binnenkomen via een gedeelde link opent de juiste groep meteen.
  useEffect(() => {
    if (status !== 'klaar' || !selected) return;
    document.getElementById(`spier-${selected}`)?.scrollIntoView({ block: 'start' });
  }, [status]);

  if (status === 'laden') return <main className="page" />;

  const offBody = totals.filter((t) => !KNOWN_MUSCLES.includes(t.muscle));

  return (
    <main className="page">
      <button type="button" className="back" onClick={onBack}>
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
          <path d="M7.5 1.5 2.5 7l5 5.5" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Terug
      </button>

      <h1 className="exercise__title">Voortgang</h1>
      {error && <p className="exercise__meta">{error}</p>}

      <div className="filters">
        <Segmented options={RANGES} value={range} onChange={setRange} label="Periode" />
        <Segmented options={METRICS} value={metric} onChange={setMetric} label="Maat" />
      </div>

      {metric === 'volume' && (
        <p className="body__caveat">
          Volume in kilo's is goed te vergelijken binnen één oefening, maar niet
          tussen spiergroepen: een beenpers verplaatst meer gewicht dan een curl
          door anatomie, niet door inspanning. Sets geven een eerlijker beeld.
        </p>
      )}

      {totals.length === 0 ? (
        <p className="exercise__empty">
          Nog niets gelogd in deze periode{from && <> (sinds {formatDateShort(from)})</>}.
        </p>
      ) : (
        <>
          <div id="lichaam" ref={bodyRef}>
            <BodyMap intensity={intensity} selected={selected}
              onSelect={select} valueLabel={valueOf} />
            <RampLegend
              maxLabel={busiest ? `${valueOf(busiest.muscle)} (${muscleLabel(busiest.muscle)})` : ''} />
            <p className="body__hint">
              Tik een spiergroep aan om de oefeningen te openen.
            </p>
          </div>

          {ranked.map((t) => (
            <MuscleSection
              key={t.muscle}
              total={t}
              metric={metric}
              open={t.muscle === selected}
              onToggle={() => select(t.muscle)}
              series={muscleSeries(logs, sessions, exercises, t.muscle, from ? { from } : {})}
              logs={logs}
              sessions={sessions}
              onOpenExercise={onOpenExercise}
            />
          ))}

          {!bodyVisible && (
            <button type="button" className="tobody" onClick={() => scrollTo('lichaam')}>
              Lichaam
            </button>
          )}

          {offBody.length > 0 && (
            <p className="body__hint">
              Niet op het silhouet: {offBody.map((t) => muscleLabel(t.muscle)).join(', ')}.
            </p>
          )}
        </>
      )}
    </main>
  );
}

function MuscleSection({
  total, metric, open, onToggle, series, logs, sessions, onOpenExercise,
}) {
  const value = metric === 'sets'
    ? `${total.sets} sets`
    : `${formatNumber(Math.round(total.volume))} kg`;

  const points = series.map((p) => ({ date: p.date, value: p[metric] }));
  const suffix = metric === 'sets' ? 'sets' : 'kg';

  return (
    <section id={`spier-${total.muscle}`}
      className={`muscle${open ? ' muscle--open' : ''}`}>
      <button type="button" className="muscle__head" onClick={onToggle}
        aria-expanded={open}>
        <span className="muscle__name">{muscleLabel(total.muscle)}</span>
        <MiniLine points={points} formatValue={(v) => `${formatNumber(v)} ${suffix}`} />
        <span className="muscle__value">{value}</span>
      </button>

      {open && (
        <ul className="muscle__list">
          {total.byExercise.map((e) => (
            <ExerciseLine key={e.exerciseId} entry={e}
              logs={logs} sessions={sessions} onOpen={() => onOpenExercise(e.exerciseId)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ExerciseLine({ entry, logs, sessions, onOpen }) {
  const series = useMemo(
    () => seriesFor(logs, sessions, entry.exerciseId),
    [logs, sessions, entry.exerciseId],
  );
  const { points, unit } = chartPoints(series);
  const metric = preferredMetric(series);
  const delta = metric ? trend(series.filter((p) => p[metric] != null), metric) : null;
  const latest = points[points.length - 1] ?? null;

  return (
    <li>
      <button type="button" className="line" onClick={onOpen}>
        <span className="line__main">
          <span className="line__name">{entry.name}</span>
          <span className="line__meta">
            {entry.sets} sets · {formatNumber(Math.round(entry.volume))} kg
          </span>
        </span>

        <MiniLine points={points} formatValue={(v) => `${formatNumber(v)} ${unit ?? ''}`} />

        <span className="line__now">
          {latest && <span className="line__value">{formatNumber(latest.value)} {unit}</span>}
          {delta != null && delta !== 0 && (
            <span className={`line__delta${delta > 0 ? ' line__delta--up' : ''}`}>
              {delta > 0 ? '+' : ''}{formatNumber(delta)}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button"
          className={`segmented__item${value === o.id ? ' segmented__item--on' : ''}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
