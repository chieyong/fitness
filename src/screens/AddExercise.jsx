import { useEffect, useMemo, useState } from 'react';
import { CATALOG } from '../data/catalog.js';
import {
  EQUIPMENT_IDS, MEASURE_IDS, equipmentLabel, equipmentOptions, measureOptions,
} from '../data/equipment.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { muscleLabel } from '../lib/muscleLabels.js';
import {
  filterCatalog, findExistingExercise, catalogName, nextPosition, defaultTarget,
  validateTarget, targetColumns, validateOwnExercise, formFromColumns, measureOf,
} from '../lib/editor.js';
import {
  fetchTemplates, fetchTemplateExercises, fetchAllTemplateExercises, fetchAllExercises,
  createExercise, addTemplateExercise, dataMode,
} from '../lib/queries.js';
import TargetFields from '../components/TargetFields.jsx';
import { formatTarget } from '../lib/schedule.js';
import './AddExercise.css';
import './Schema.css';
import './Exercise.css';

/** Van boven naar beneden over het lichaam, zodat je snel vindt wat je zoekt. */
const MUSCLE_ORDER = [
  'chest', 'upper-back', 'trapezius', 'lower-back', 'front-deltoids', 'back-deltoids',
  'biceps', 'triceps', 'forearm', 'abs', 'obliques',
  'quadriceps', 'hamstring', 'gluteal', 'calves', 'adductor', 'abductors',
];

export default function AddExercise({ templateId, onDone, onBack }) {
  const { t: tx, locale } = useI18n();
  const equipment_ = equipmentOptions(locale);
  const equipmentFilter = [{ id: 'alles', label: tx('add.all') }, ...equipment_];
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
  // Staat de gekozen oefening al in een andere workout, dan neemt ze dat target over.
  const [linked, setLinked] = useState(null);

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
    () => (muscle || query.trim() ? filterCatalog(CATALOG, { muscle, equipment, query, locale }) : []),
    [muscle, equipment, query, locale],
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

  const choose = async (entry) => {
    if (chosen?.key === entry.key) { setChosen(null); return; }
    const { existing } = whereIs(entry);
    setChosen(entry);
    setLinked(null);
    setForm(defaultTarget(existing?.measure ?? entry.measure));
    setErrors([]);

    // Eén target per oefening: overnemen uit de workout waar ze al staat.
    const other = existing && links.find((l) => l.exercise_id === existing.id && l.template_id !== templateId);
    if (!other) return;
    try {
      const row = (await fetchTemplateExercises(other.template_id)).find((r) => r.exercise_id === existing.id);
      if (!row) return;
      setForm(formFromColumns(row));
      setLinked({
        label: templates.find((x) => x.id === other.template_id)?.label ?? '',
        measure: measureOf(row, existing),
        key: entry.key,
      });
    } catch { /* dan gewoon zelf een target kiezen */ }
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
    const measure = (linked?.key === entry.key && linked.measure) || existing?.measure || entry.measure;
    const errs = validateTarget(measure, form, locale);
    if (errs.length) { setErrors(errs); return; }
    setBusy(true);
    try {
      // Bestaat hij al, dan dezelfde oefening: de geschiedenis loopt door.
      const exercise = existing ?? await createExercise({
        name: catalogName(entry, locale), muscle_groups: entry.muscles,
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
      ...validateOwnExercise(own, exercises, { equipmentIds: EQUIPMENT_IDS, measureIds: MEASURE_IDS }, locale),
      ...(own.measure ? validateTarget(own.measure, form, locale) : []),
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

  // Ook via een directe link: in de demo voeg je geen oefeningen toe.
  if (dataMode() === 'demo') {
    return (
      <main className="page">
        <div className="progress__bar">
          <button type="button" className="back" onClick={onBack}>
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
              <path d="M8 2 2 8l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="sr-only">{tx('common.back')}</span>
          </button>
        </div>
        <h1 className="exercise__title">{tx('add.title')}</h1>
        <p className="exercise__empty">{tx('add.demo')}</p>
      </main>
    );
  }

  if (status === 'laden') return <main className="page" />;

  return (
    <main className="page">
      <div className="progress__bar">
        <button type="button" className="back" onClick={onBack}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
            <path d="M8 2 2 8l6 6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sr-only">{tx('common.back')}</span>
        </button>
      </div>

      <h1 className="exercise__title">{tx('add.title')}</h1>
      <p className="exercise__meta">{tx('add.to', { name: template?.label ?? tx('add.thisWorkout') })}</p>
      {error && <p className="schema__error" role="alert">{error}</p>}

      <section className="pick">
        <h2 className="pick__label">{tx('add.muscle')}</h2>
        <div className="chips">
          {MUSCLE_ORDER.map((m) => (
            <button key={m} type="button" aria-pressed={muscle === m}
              className={`chip${muscle === m ? ' chip--on' : ''}`}
              onClick={() => { setMuscle(muscle === m ? null : m); setChosen(null); }}>
              {muscleLabel(m, locale)}
            </button>
          ))}
        </div>

        <h2 className="pick__label">{tx('add.equipment')}</h2>
        <ChipGroup options={equipmentFilter} value={equipment} onChange={setEquipment} label={tx('add.equipment')} />

        <input className="pick__search" type="search" placeholder={tx('add.search')}
          value={query} onChange={(e) => { setQuery(e.target.value); setChosen(null); }} />
      </section>

      {(muscle || query.trim()) && (
        <section className="results">
          <h2 className="pick__label">
            {results.length === 0 ? tx('add.noResults') : tx('add.results', { count: results.length })}
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
                      <span className="item__name">{catalogName(entry, locale)}</span>
                      <span className="item__meta">{entry.muscles.map((m) => muscleLabel(m, locale)).join(', ')}</span>
                      <span className="item__meta">
                        {equipmentLabel(entry.equipment, locale)}
                        {where.here && tx('add.alreadyHere')}
                        {!where.here && where.elsewhere.length > 0 && tx('add.alsoIn', { list: where.elsewhere.join(` ${tx('add.and')} `) })}
                      </span>
                    </span>
                  </button>

                  {open && (
                    <div className="item__edit">
                      {linked?.key === entry.key ? (
                        <p className="exercise__meta">
                          {formatTarget(targetColumns(linked.measure, form), locale)} · {tx('add.linkedTarget', { workout: linked.label })}
                        </p>
                      ) : (
                        <TargetFields measure={where.existing?.measure ?? entry.measure} value={form} onChange={setForm} />
                      )}
                      {errors.map((m) => <p key={m} className="schema__error">{m}</p>)}
                      <span className="item__buttons">
                        <button type="button" className="schema__primary" disabled={busy}
                          onClick={() => addFromCatalog(entry)}>
                          {tx('add.add')}
                        </button>
                        <button type="button" className="schema__link" onClick={() => setChosen(null)}>{tx('common.cancel')}</button>
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
            {tx('add.notListed')}{' '}
            <button type="button" className="schema__link" onClick={openOwn}>{tx('add.createOwn')}</button>
          </p>
        ) : (
          <div className="own__form">
            <h2 className="wk__title">{tx('add.own')}</h2>
            <label className="own__field">
              <span className="pick__label">{tx('add.name')}</span>
              <input value={own.name} onChange={(e) => setOwn({ ...own, name: e.target.value })} />
            </label>

            <span className="pick__label">{tx('add.muscles')}</span>
            <div className="chips">
              {MUSCLE_ORDER.map((m) => (
                <button key={m} type="button" aria-pressed={own.muscles.includes(m)}
                  className={`chip${own.muscles.includes(m) ? ' chip--on' : ''}`}
                  onClick={() => toggleOwnMuscle(m)}>
                  {muscleLabel(m, locale)}
                </button>
              ))}
            </div>

            <span className="pick__label">{tx('add.equipment')}</span>
            <ChipGroup options={equipment_} value={own.equipment} label={tx('add.equipment')}
              onChange={(id) => setOwn({ ...own, equipment: id })} />

            <span className="pick__label">{tx('add.measure')}</span>
            <ChipGroup options={measureOptions(locale)} value={own.measure} label={tx('add.measureAria')} onChange={setOwnMeasure} />

            {own.measure && <TargetFields measure={own.measure} value={form} onChange={setForm} />}
            {errors.map((m) => <p key={m} className="schema__error">{m}</p>)}

            <span className="item__buttons">
              <button type="button" className="schema__primary" disabled={busy} onClick={addOwn}>{tx('add.add')}</button>
              <button type="button" className="schema__link" onClick={() => { setOwnOpen(false); setErrors([]); }}>{tx('common.cancel')}</button>
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
