import { useEffect, useMemo, useRef, useState } from 'react';
import {
  muscleTotals, findMuscle, intensities, sortByMetric, busiestBy, muscleSeries,
} from '../lib/muscles.js';
import { seriesFor, trend, chartPoints, preferredMetric } from '../lib/progress.js';
import { muscleLabel, KNOWN_MUSCLES } from '../lib/muscleLabels.js';
import { addDays, todayISO, formatDateShort } from '../lib/schedule.js';
import { formatNumber } from '../lib/input.js';
import { fetchAllExercises, fetchAllLogs, fetchSessions } from '../lib/queries.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import BodyMap, { RampLegend } from '../components/BodyMap.jsx';
import MiniLine from '../components/MiniLine.jsx';
import './Progress.css';
import './Exercise.css';

const RANGES = [
  { id: '30', label: 'progress.range30', days: 30 },
  { id: '90', label: 'progress.range90', days: 90 },
  { id: 'alles', label: 'progress.rangeAll', days: null },
];

const METRICS = [
  { id: 'sets', label: 'progress.sets', unit: '' },
  { id: 'volume', label: 'progress.volume', unit: 'kg' },
];

export default function Progress({ muscle, onSelectMuscle, onOpenExercise }) {
  const today = useMemo(() => todayISO(), []);
  const { t, locale } = useI18n();
  const [range, setRange] = useState('30');
  const [metric, setMetric] = useState('sets');
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef(null);

  // Kiezen voor volume opent de uitleg; terug naar sets sluit hem.
  const chooseMetric = (next) => {
    setMetric(next);
    setInfoOpen(next === 'volume');
  };

  useEffect(() => {
    if (!infoOpen) return undefined;
    const onPointer = (e) => { if (!infoRef.current?.contains(e.target)) setInfoOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setInfoOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [infoOpen]);

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
    const found = findMuscle(totals, m);
    const n = found ? (metric === 'sets' ? found.sets : Math.round(found.volume)) : 0;
    return unit ? `${formatNumber(n)} ${unit}` : t('progress.setsValue', { count: n });
  };

  // Een spiergroep kiezen klapt hem open en brengt je erheen. Nog een keer
  // tikken klapt hem weer dicht.
  // Waar je stond voordat je een spiergroep opende: daar keer je bij dichtklappen
  // rustig naar terug. Wissel je direct naar een andere groep, dan blijft het
  // oorspronkelijke punt staan.
  const returnTo = useRef(null);

  const select = (m) => {
    const next = m === selected ? null : m;
    if (next && selected == null) returnTo.current = window.scrollY;
    onSelectMuscle(next);

    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (next) {
      requestAnimationFrame(() => scrollTo(`spier-${next}`));
    } else if (returnTo.current != null) {
      const top = returnTo.current;
      returnTo.current = null;
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    }
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

      <h1 className="exercise__title">{t('progress.title')}</h1>
      {error && <p className="exercise__meta">{error}</p>}

      <div className="filters">
        <Segmented options={RANGES} value={range} onChange={setRange} label={t('progress.period')} />
        <span className="metric" ref={infoRef}>
          <Segmented options={METRICS} value={metric} onChange={chooseMetric} label={t('progress.measure')} />
          {/* Altijd in de layout en alleen zichtbaar bij volume: zo is de rij in beide
              standen even breed en verspringt hij niet naar een volgende regel. */}
          <button type="button"
            className={`metric__info${metric === 'volume' ? '' : ' metric__info--hidden'}`}
            aria-label={t('progress.volumeInfo')}
            aria-hidden={metric !== 'volume'}
            tabIndex={metric === 'volume' ? 0 : -1}
            aria-expanded={infoOpen} onClick={() => setInfoOpen(!infoOpen)}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="7" cy="7" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <path d="M7 6.2v3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="4.2" r="0.85" fill="currentColor" />
              </svg>
          </button>
          {infoOpen && (
            <span className="pop" role="dialog" aria-label={t('progress.volumeInfo')}>
              {t('progress.volumeText')}
            </span>
          )}
        </span>
      </div>

      {totals.length === 0 ? (
        <p className="exercise__empty">
          {from ? t('progress.emptySince', { date: formatDateShort(from, locale) }) : t('progress.empty')}
        </p>
      ) : (
        <>
          <div id="lichaam" ref={bodyRef} className="card body-card">
            <BodyMap intensity={intensity} selected={selected}
              onSelect={select} valueLabel={valueOf} />
            <RampLegend
              maxLabel={busiest ? `${valueOf(busiest.muscle)} (${muscleLabel(busiest.muscle, locale)})` : ''} />
            <p className="body__hint">
              {t('progress.hint')}
            </p>
          </div>

          {ranked.map((t) => (
            <MuscleSection
              key={t.muscle}
              total={t}
              metric={metric}
              open={t.muscle === selected}
              dimmed={selected != null && t.muscle !== selected}
              onToggle={() => select(t.muscle)}
              series={muscleSeries(logs, sessions, exercises, t.muscle, from ? { from } : {})}
              logs={logs}
              sessions={sessions}
              onOpenExercise={onOpenExercise}
            />
          ))}

          {!bodyVisible && (
            <button type="button" className="tobody" onClick={() => scrollTo('lichaam')}>
              {t('progress.toBody')}
            </button>
          )}

          {offBody.length > 0 && (
            <p className="body__hint">
              {t('progress.offBody', { list: offBody.map((x) => muscleLabel(x.muscle, locale)).join(', ') })}
            </p>
          )}
        </>
      )}
    </main>
  );
}

function MuscleSection({
  total, metric, open, dimmed, onToggle, series, logs, sessions, onOpenExercise,
}) {
  // Open en dicht allebei geanimeerd: bij dichtklappen blijft de lijst even
  // staan tot de inklapbeweging klaar is, daarna pas weg.
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const { t, locale } = useI18n();

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    if (open) {
      setMounted(true);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setExpanded(true));
      });
    } else {
      setExpanded(false);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      timer = setTimeout(() => setMounted(false), reduced ? 0 : 340);
    }
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [open]);

  const value = metric === 'sets'
    ? t('progress.setsValue', { count: total.sets })
    : `${formatNumber(Math.round(total.volume))} kg`;

  const points = series.map((p) => ({ date: p.date, value: p[metric] }));
  const suffix = metric === 'sets' ? 'sets' : 'kg';

  return (
    <section id={`spier-${total.muscle}`}
      className={`muscle${open ? ' muscle--open' : ''}${dimmed ? ' muscle--dimmed' : ''}`}>
      <button type="button" className="muscle__head" onClick={onToggle}
        aria-expanded={open}>
        <span className="muscle__name">{muscleLabel(total.muscle, locale)}</span>
        <MiniLine points={points} formatValue={(v) => `${formatNumber(v)} ${suffix}`} />
        <span className="muscle__value">{value}</span>
      </button>

      <div className={`muscle__panel${expanded ? ' muscle__panel--open' : ''}`} aria-hidden={!open}>
        <div className="muscle__panel-inner">
          {mounted && (
            <ul className="muscle__list">
              {total.byExercise.map((e) => (
                <ExerciseLine key={e.exerciseId} entry={e}
                  logs={logs} sessions={sessions} onOpen={() => onOpenExercise(e.exerciseId)} />
              ))}
            </ul>
          )}
        </div>
      </div>
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
  const { t } = useI18n();
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button"
          className={`segmented__item${value === o.id ? ' segmented__item--on' : ''}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}>
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}
