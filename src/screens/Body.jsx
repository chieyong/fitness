import { useEffect, useMemo, useState } from 'react';
import { muscleTotals, findMuscle, intensities, sortByMetric, busiestBy } from '../lib/muscles.js';
import { addDays, todayISO, formatDateShort } from '../lib/schedule.js';
import { formatNumber } from '../lib/input.js';
import { fetchAllExercises, fetchAllLogs, fetchSessions } from '../lib/queries.js';
import BodyMap, { RampLegend } from '../components/BodyMap.jsx';
import { MAPPED } from '../components/bodyRegions.js';
import './Body.css';

const RANGES = [
  { id: '30', label: '30 dagen', days: 30 },
  { id: '90', label: '90 dagen', days: 90 },
  { id: 'alles', label: 'Alles', days: null },
];

const METRICS = [
  { id: 'sets', label: 'Sets', unit: '' },
  { id: 'volume', label: 'Volume', unit: 'kg' },
];

export default function Body({ muscle, onSelectMuscle, onOpenExercise, onBack }) {
  const today = useMemo(() => todayISO(), []);
  const [range, setRange] = useState('30');
  const [metric, setMetric] = useState('sets');
  // De gekozen spiergroep staat in de URL, zodat een selectie deelbaar is en
  // de browserknoppen erdoorheen lopen.
  const selected = muscle && muscle !== '1' ? muscle : null;
  const setSelected = onSelectMuscle;

  const [exercises, setExercises] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('laden');
  const [error, setError] = useState(null);

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
  const unit = METRICS.find((m) => m.id === metric)?.unit ?? '';
  // De drukste groep hangt af van de gekozen maat: op sets wint triceps,
  // op kilo's winnen de benen. De legenda moet dezelfde maat aanhouden.
  const busiest = busiestBy(totals, metric);
  const ranked = sortByMetric(totals, metric);

  const valueOf = (muscle) => {
    const t = findMuscle(totals, muscle);
    if (!t) return metric === 'sets' ? '0 sets' : '0 kg';
    const n = metric === 'sets' ? t.sets : Math.round(t.volume);
    return `${formatNumber(n)}${unit ? ` ${unit}` : ' sets'}`;
  };

  if (status === 'laden') return <main className="page" />;

  const chosen = selected ? findMuscle(totals, selected) : null;

  // Spiergroepen die wel in de data zitten maar niet op het silhouet staan.
  const offBody = totals.filter((t) => !MAPPED.includes(t.muscle));

  return (
    <main className="page">
      <button type="button" className="back" onClick={onBack}>
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
          <path d="M7.5 1.5 2.5 7l5 5.5" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Terug
      </button>

      <h1 className="exercise__title">Spiergroepen</h1>
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
          Nog niets gelogd in deze periode
          {from && <> (sinds {formatDateShort(from)})</>}.
        </p>
      ) : (
        <>
          <BodyMap
            intensity={intensity}
            selected={selected}
            onSelect={setSelected}
            valueLabel={valueOf}
          />

          <RampLegend maxLabel={busiest ? `${valueOf(busiest.muscle)} (${busiest.muscle})` : ''} />

          {chosen ? (
            <section className="detail">
              <h2 className="detail__title">{chosen.muscle}</h2>
              <p className="detail__value">{valueOf(chosen.muscle)} in deze periode</p>
              <ul className="detail__list">
                {chosen.byExercise.map((e) => (
                  <li key={e.exerciseId}>
                    <button type="button" className="detail__item"
                      onClick={() => onOpenExercise(e.exerciseId)}>
                      <span>{e.name}</span>
                      <span className="detail__sets">
                        {e.sets} sets · {formatNumber(Math.round(e.volume))} kg
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="body__hint">Kies een spiergroep om te zien welke oefeningen eraan bijdroegen.</p>
          )}

          <section className="detail">
            <h2 className="detail__heading">Alle spiergroepen</h2>
            <table className="log__table">
              <thead>
                <tr>
                  <th scope="col">Spiergroep</th>
                  <th scope="col">Sets</th>
                  <th scope="col">Volume</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((t) => (
                  <tr key={t.muscle}>
                    <td>{t.muscle}</td>
                    <td>{t.sets}</td>
                    <td>{formatNumber(Math.round(t.volume))} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {offBody.length > 0 && (
              <p className="body__hint">
                Niet op het silhouet: {offBody.map((t) => t.muscle).join(', ')}.
              </p>
            )}
          </section>
        </>
      )}
    </main>
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
