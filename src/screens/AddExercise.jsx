import { useEffect, useMemo, useState } from 'react';
import { CATALOG } from '../data/catalog.js';
import { EQUIPMENT, MEASURES, EQUIPMENT_IDS, MEASURE_IDS } from '../data/equipment.js';
import { muscleLabel } from '../lib/muscleLabels.js';
import {
  filterCatalog, findExistingExercise, nextPosition, defaultTarget,
  validateTarget, targetColumns, validateOwnExercise,
} from '../lib/editor.js';
import {
  fetchTemplates, fetchTemplateExercises, fetchAllTemplateExercises, fetchAllExercises,
  createExercise, addTemplateExercise,
} from '../lib/queries.js';
import TargetFields from '../components/TargetFields.jsx';
import './AddExercise.css';
import './Schema.css';
import './Exercise.css';

/** Van boven naar beneden over het lichaam, zodat je snel vindt wat je zoekt. */
const MUSCLE_ORDER = [
  'chest', 'upper-back', 'trapezius', 'lower-back', 'front-deltoids', 'back-deltoids',
  'biceps', 'triceps', 'forearm', 'abs', 'obliques',
  'quadriceps', 'hamstring', 'gluteal', 'calves', 'adductor', 'abductors',
];

const EQUIPMENT_FILTER = [{ id: 'alles', label: 'Alles' }, ...EQUIPMENT];
const equipmentLabel = (id) => EQUIPMENT.find((e) => e.id === id)?.label ?? '';

export default function AddExercise({ templateId, onDone, onBack }) {
  const [template, setTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [rows, setRows] = useState([]);
  const [links, setLinks] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [status, setStatus] = useState('laden');
  const [error, setError] = useState(null);

  const [muscle, setMuscle] = useState(null);
  const [equipment, setEquipment] = useState('alles');
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const [ownOpen, setOwnOpen] = useState(false);
  const [own, setOwn] = useState({ name: '', muscles: [], equipment: null, measure: null });

  useEffect(() => {
    (async () => {
      try {
        const [t, r, l, ex] = await Promise.all([
          fetchTemplates(), fetchTemplateExercises(templateId), fetchAllTemplateExercises(), fetchAllExercises(),
        ]);
        setTemplates(t);
        setTemplate(t.find((x) => x.id === templateId) ?? null);
        setRows(r); setLinks(l); setExercises(ex);
        setStatus('klaar');
      } catch (e) {
        setError(e.message); setStatus('fout');
      }
    })();
  }, [templateId]);

  const results = useMemo(
    () => (muscle || query.trim() ? filterCatalog(CATALOG, { muscle, equipment, query }) : []),
    [muscle, equipment, query],
  );

  /** Waar staat deze bibliotheekoefening al? */
  const whereIs = (entry) => {
    const existing = findExistingExercise(exercises, entry);
    if (!existing) return { existing: null, here: false, elsewhere: [] };
    const tplIds = links.filter((l) => l.exercise_id === existing.id).map((l) => l.template_id);
    return {
      existing,
      here: tplIds.includes(templateId),
      elsewhere: templates.filter((t) => t.id !== templateId && tplIds.includes(t.id)).map((t) => t.label),
    };
  };

  const choose = (entry) => {
    if (chosen?.key === entry.key) { setChosen(null); return; }
    const { existing } = whereIs(entry);
    setChosen(entry);
    setForm(defaultTarget(existing?.measure ?? entry.measure));
    setErrors([]);
  };

  const link = async (exercise, measure) => {
    await addTemplateExercise({
      template_id: templateId,
      exercise_id: exercise.id,
      position: nextPosition(rows),
      ...targetColumns(measure, form),
    });
    onDone();
  };

  const addFromCatalog = async (entry) => {
    const { existing } = whereIs(entry);
    const measure = existing?.measure ?? entry.measure;
    const errs = validateTarget(measure, form);
    if (errs.length) { setErrors(errs); return; }
    setBusy(true);
    try {
      // Bestaat hij al, dan dezelfde oefening: de geschiedenis loopt door.
      const exercise = existing ?? await createExercise({
        name: entry.name, muscle_groups: entry.muscles,
        equipment: entry.equipment, measure: entry.measure, catalog_key: entry.key,
      });
      await link(exercise, measure);
    } catch (e) {
      setErrors([e.message]); setBusy(false);
    }
  };

  const openOwn = () => {
    setOwnOpen(true);
    setChosen(null);
    setOwn({ name: query.trim(), muscles: muscle ? [muscle] : [], equipment: null, measure: null });
    setForm({});
    setErrors([]);
  };

  const setOwnMeasure = (measure) => {
    setOwn({ ...own, measure });
    setForm(defaultTarget(measure));
  };

  const toggleOwnMuscle = (m) => setOwn({
    ...own, muscles: own.muscles.includes(m) ? own.muscles.filter((x) => x !== m) : [...own.muscles, m],
  });

  const addOwn = async () => {
    const errs = [
      ...validateOwnExercise(own, exercises, { equipmentIds: EQUIPMENT_IDS, measureIds: MEASURE_IDS }),
      ...(own.measure ? validateTarget(own.measure, form) : []),
    ];
    if (errs.length) { setErrors(errs); return; }
    setBusy(true);
    try {
      const exercise = await createExercise({
        name: own.name.trim(), muscle_groups: own.muscles,
        equipment: own.equipment, measure: own.measure, catalog_key: null,
      });
      await link(exercise, own.measure);
    } catch (e) {
      setErrors([e.message]); setBusy(false);
    }
  };

  if (status === 'laden') return <main className="page" />;

  return (
    <main className="page">
      <div className="progress__bar">
        <button type="button" className="back" onClick={onBack}>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
            <path d="M7.5 1.5 2.5 7l5 5.5" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Terug
        </button>
      </div>

      <h1 className="exercise__title">Oefening toevoegen</h1>
      <p className="exercise__meta">aan {template?.label ?? 'deze workout'}</p>
      {error && <p className="schema__error" role="alert">{error}</p>}

      <section className="pick">
        <h2 className="pick__label">Spiergroep</h2>
        <div className="chips">
          {MUSCLE_ORDER.map((m) => (
            <button key={m} type="button" aria-pressed={muscle === m}
              className={`chip${muscle === m ? ' chip--on' : ''}`}
              onClick={() => { setMuscle(muscle === m ? null : m); setChosen(null); }}>
              {muscleLabel(m)}
            </button>
          ))}
        </div>

        <h2 className="pick__label">Materiaal</h2>
        <ChipGroup options={EQUIPMENT_FILTER} value={equipment} onChange={setEquipment} label="Materiaal" />

        <input className="pick__search" type="search" placeholder="Of zoek op naam"
          value={query} onChange={(e) => { setQuery(e.target.value); setChosen(null); }} />
      </section>

      {(muscle || query.trim()) && (
        <section className="results">
          <h2 className="pick__label">
            {results.length === 0 ? 'Geen oefeningen gevonden' : `${results.length} ${results.length === 1 ? 'oefening' : 'oefeningen'}`}
          </h2>
          <ul className="results__list">
            {results.map((entry) => {
              const where = whereIs(entry);
              const open = chosen?.key === entry.key;
              return (
                <li key={entry.key} className={`result${open ? ' result--open' : ''}`}>
                  <button type="button" className="result__row" disabled={where.here}
                    aria-expanded={open} onClick={() => choose(entry)}>
                    <span className="item__main">
                      <span className="item__name">{entry.name}</span>
                      <span className="item__meta">{entry.muscles.map(muscleLabel).join(', ')}</span>
                      <span className="item__meta">
                        {equipmentLabel(entry.equipment)}
                        {where.here && ' — staat al in deze workout'}
                        {!where.here && where.elsewhere.length > 0 && ` — ook in ${where.elsewhere.join(' en ')}`}
                      </span>
                    </span>
                  </button>

                  {open && (
                    <div className="item__edit">
                      <TargetFields measure={where.existing?.measure ?? entry.measure} value={form} onChange={setForm} />
                      {errors.map((m) => <p key={m} className="schema__error">{m}</p>)}
                      <span className="item__buttons">
                        <button type="button" className="schema__primary" disabled={busy}
                          onClick={() => addFromCatalog(entry)}>
                          Toevoegen
                        </button>
                        <button type="button" className="schema__link" onClick={() => setChosen(null)}>Annuleren</button>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="own">
        {!ownOpen ? (
          <p className="exercise__meta">
            Staat je oefening er niet tussen?{' '}
            <button type="button" className="schema__link" onClick={openOwn}>Maak een eigen oefening</button>
          </p>
        ) : (
          <div className="own__form">
            <h2 className="wk__title">Eigen oefening</h2>
            <label className="own__field">
              <span className="pick__label">Naam</span>
              <input value={own.name} onChange={(e) => setOwn({ ...own, name: e.target.value })} />
            </label>

            <span className="pick__label">Spiergroepen</span>
            <div className="chips">
              {MUSCLE_ORDER.map((m) => (
                <button key={m} type="button" aria-pressed={own.muscles.includes(m)}
                  className={`chip${own.muscles.includes(m) ? ' chip--on' : ''}`}
                  onClick={() => toggleOwnMuscle(m)}>
                  {muscleLabel(m)}
                </button>
              ))}
            </div>

            <span className="pick__label">Materiaal</span>
            <ChipGroup options={EQUIPMENT} value={own.equipment} label="Materiaal"
              onChange={(id) => setOwn({ ...own, equipment: id })} />

            <span className="pick__label">Wat log je?</span>
            <ChipGroup options={MEASURES} value={own.measure} label="Meetwijze" onChange={setOwnMeasure} />

            {own.measure && <TargetFields measure={own.measure} value={form} onChange={setForm} />}
            {errors.map((m) => <p key={m} className="schema__error">{m}</p>)}

            <span className="item__buttons">
              <button type="button" className="schema__primary" disabled={busy} onClick={addOwn}>Toevoegen</button>
              <button type="button" className="schema__link" onClick={() => { setOwnOpen(false); setErrors([]); }}>Annuleren</button>
            </span>
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * Eén keuze uit een rij chips. Zelfde vorm als de spiergroepen, en breekt op een
 * smal scherm netjes af -- een gesloten knoppenbalk viel daar in stukken.
 */
function ChipGroup({ options, value, onChange, label }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id}
          className={`chip${value === o.id ? ' chip--on' : ''}`}
          onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
