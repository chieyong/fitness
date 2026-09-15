import { useEffect, useRef, useState } from 'react';
import {
  fetchTemplates, fetchTemplateExercises, fetchSessions, fetchAllExercises,
  updateTemplateExercise, deleteTemplateExercise, updateTemplateExercisePositions,
  createTemplate, renameTemplate, archiveTemplate, updateExercise, createExercise, dataMode,
  fetchScheduleSettings, saveScheduleSettings, replanUpcoming, ensureUpcomingSessions,
} from '../lib/queries.js';
import { formatTarget, todayISO } from '../lib/schedule.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import {
  ROTATIONS, weekdays, rotationLabel, normalizeScheduleSettings, validateScheduleSettings, describeSchedule,
} from '../lib/scheduleSettings.js';
import {
  moveRow, removeRow, validateTarget, targetColumns, formFromColumns, measureOf,
  nextTemplateLabel, archiveImpact, validateTemplateLabel,
  groupByExercise, targetsDiffer, sameTarget, catalogName,
} from '../lib/editor.js';
import { suggestAlternatives, pairUpdates } from '../lib/alternatives.js';
import { CATALOG } from '../data/catalog.js';
import { equipmentLabel } from '../data/equipment.js';
import { MAX_VIDEOS, validateVideoUrls, cleanVideoUrls } from '../lib/youtube.js';
import TargetFields from '../components/TargetFields.jsx';
import './Schema.css';
import './Exercise.css';

/** Altijd drie velden, gevuld met wat er al is. */
const videoFields = (urls) => Array.from({ length: MAX_VIDEOS }, (_, i) => urls?.[i] ?? '');

/** Eén veld om mee te beginnen; na elke ingevulde link verschijnt er één bij, tot drie. */
const visibleVideoFields = (videos = []) => {
  let last = -1;
  videos.forEach((u, i) => { if (String(u ?? '').trim()) last = i; });
  return Math.min(MAX_VIDEOS, last + 2);
};

const VIEWS = ['workouts', 'oefeningen'];

/** De weergave staat in de URL (?schema=oefeningen), zodat terugkomen en herladen werken. */
const viewFromUrl = () => (new URLSearchParams(window.location.search).get('schema') === 'oefeningen' ? 'oefeningen' : 'workouts');

/**
 * Je schema aanpassen, in twee weergaven:
 * - Workouts: planning, workouts en welke oefeningen erin staan, in welke volgorde
 * - Oefeningen: elke oefening één keer, met één target en de video's; dat geldt
 *   voor elke workout waarin ze staat
 */
export default function Schema({ onAddExercise }) {
  // In de demo pas je bestaande oefeningen aan, maar bouw je het schema niet om.
  const demo = dataMode() === 'demo';
  const { t: tx, locale } = useI18n();
  const [view, setView] = useState(viewFromUrl);
  const [templates, setTemplates] = useState([]);
  const [rows, setRows] = useState(new Map());
  const [exercises, setExercises] = useState(new Map());
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState('laden');
  const [error, setError] = useState(null);

  // Er staat steeds hooguit één ding open om te bewerken.
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const scrollTo = useRef(null);
  // Automatisch bewaren: wat het laatst bewaard (of geopend) is, en of dat nu bezig is.
  const lastSaved = useRef(null);
  const [saveState, setSaveState] = useState(null);
  // Alternatief kiezen: zoekterm, en of de keuzelijst open staat.
  const [altQuery, setAltQuery] = useState('');
  const [altPicking, setAltPicking] = useState(false);

  // Planning: wat er bewaard is, en wat je aan het aanpassen bent.
  const [settings, setSettings] = useState(() => normalizeScheduleSettings(null));
  const [draft, setDraft] = useState(() => normalizeScheduleSettings(null));
  const [planErrors, setPlanErrors] = useState([]);
  const [planNote, setPlanNote] = useState(null);

  const load = async () => {
    const [t, ses, ex, plan] = await Promise.all([fetchTemplates(), fetchSessions(), fetchAllExercises(), fetchScheduleSettings()]);
    const perTemplate = await Promise.all(t.map((x) => fetchTemplateExercises(x.id)));
    setTemplates(t);
    setRows(new Map(t.map((x, i) => [x.id, perTemplate[i]])));
    setExercises(new Map(ex.map((e) => [e.id, e])));
    setSessions(ses);
    setSettings(plan);
    setDraft(plan);
  };

  useEffect(() => {
    load().then(() => setStatus('klaar')).catch((e) => { setError(e.message); setStatus('fout'); });
  }, []);

  // Via het potloodje in een workout: de oefening in beeld brengen zodra ze open staat.
  useEffect(() => {
    if (!scrollTo.current) return;
    const el = document.getElementById(scrollTo.current);
    scrollTo.current = null;
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
  }, [view, editing]);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setEditing(null); setForm({}); setFormErrors([]); setSaveState(null); lastSaved.current = null;
    setAltQuery(''); setAltPicking(false);
  };

  const switchView = (next) => {
    if (next === view) return;
    close();
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set('schema', next === 'oefeningen' ? 'oefeningen' : '1');
    window.history.replaceState(null, '', url);
    window.scrollTo(0, 0);
  };

  const groups = groupByExercise(templates, rows);

  const startExercise = (group) => {
    const first = group.rows[0].row;
    const initial = { ...formFromColumns(first), videos: videoFields(exercises.get(group.exerciseId)?.video_urls ?? first.exercise?.video_urls) };
    setEditing({ type: 'exercise', id: group.exerciseId });
    setForm(initial);
    setFormErrors([]);
    setSaveState(null);
    lastSaved.current = JSON.stringify(initial);
  };

  /** Vanuit een workout naar dezelfde oefening in de lijst, meteen open. */
  const openInExercises = (exerciseId) => {
    const group = groups.find((g) => g.exerciseId === exerciseId);
    if (!group) return;
    switchView('oefeningen');
    scrollTo.current = `oef-${exerciseId}`;
    startExercise(group);
  };

  /**
   * Automatisch bewaren bij het verlaten van een veld. Alleen als je echt iets
   * veranderd hebt: openklappen of door de velden tabben trekt een verschillend
   * target dus niet gelijk. Klopt de invoer niet, dan eerst de melding.
   */
  const autosave = async (group) => {
    const snapshot = JSON.stringify(form);
    if (snapshot === lastSaved.current) return;
    const first = group.rows[0].row;
    const exercise = exercises.get(group.exerciseId);
    const measure = measureOf(first, exercise);
    const errs = [...validateTarget(measure, form, locale), ...validateVideoUrls(form.videos, locale)];
    setFormErrors(errs);
    if (errs.length) { setSaveState(null); return; }

    setSaveState('bezig');
    setError(null);
    try {
      // Eén target voor elke workout met deze oefening; alleen wegschrijven wat verschilt.
      const columns = targetColumns(measure, form);
      for (const { row } of group.rows) {
        if (!sameTarget(row, columns)) await updateTemplateExercise(row.id, columns);
      }
      // Video's horen bij de oefening zelf: alleen wegschrijven als ze veranderd zijn.
      const before = exercise?.video_urls ?? null;
      const after = cleanVideoUrls(form.videos);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await updateExercise(group.exerciseId, { video_urls: after });
      }
      lastSaved.current = snapshot;
      await load();
      setSaveState('bewaard');
    } catch (e) {
      setError(e.message);
      setSaveState(null);
    }
  };

  /**
   * Alternatief instellen of weghalen (null). Een bibliotheekoefening die je nog niet
   * hebt, wordt eerst aangemaakt. Het paar blijft symmetrisch.
   */
  const setAlternative = (group, candidate) => run(async () => {
    let alternativeId = null;
    if (candidate?.kind === 'existing') alternativeId = candidate.exercise.id;
    if (candidate?.kind === 'catalog') {
      const e = candidate.entry;
      const created = await createExercise({
        name: catalogName(e, locale), muscle_groups: e.muscles, equipment: e.equipment, measure: e.measure, catalog_key: e.key,
      });
      alternativeId = created.id;
    }
    for (const change of pairUpdates([...exercises.values()], group.exerciseId, alternativeId)) {
      await updateExercise(change.id, { alternative_id: change.alternative_id });
    }
    setAltPicking(false);
    setAltQuery('');
  });

  /** Uit alle workouts halen; de oefening en haar logs blijven bestaan. */
  const removeEverywhere = (group) => run(async () => {
    for (const { row, template } of group.rows) {
      const list = (await fetchTemplateExercises(template.id)) ?? [];
      await deleteTemplateExercise(row.id);
      await updateTemplateExercisePositions(removeRow(list, row.id));
    }
    close();
  });

  const remove = (templateId, row) => run(async () => {
    const list = rows.get(templateId) ?? [];
    await deleteTemplateExercise(row.id);
    await updateTemplateExercisePositions(removeRow(list, row.id));
    close();
  });

  const move = (templateId, rowId, direction) => run(async () => {
    const changes = moveRow(rows.get(templateId) ?? [], rowId, direction);
    if (changes.length) await updateTemplateExercisePositions(changes);
  });

  const startRename = (t) => {
    setEditing({ type: 'rename', id: t.id });
    setForm({ label: t.label });
    setFormErrors([]);
  };

  const saveRename = (t) => {
    const problem = validateTemplateLabel(form.label, templates, t.id, locale);
    if (problem) { setFormErrors([problem]); return; }
    run(async () => { await renameTemplate(t.id, form.label.trim()); close(); });
  };

  const addWorkout = () => run(async () => {
    const position = templates.reduce((max, t) => Math.max(max, t.position), -1) + 1;
    const created = await createTemplate({ label: nextTemplateLabel(templates), position });
    setEditing({ type: 'rename', id: created.id });
    setForm({ label: created.label });
  });

  const archive = (t) => run(async () => { await archiveTemplate(t.id); close(); });

  // Altijd voortbouwen op de vorige stand: bij snel tikken is `draft` in deze
  // functie anders nog de oude waarde, en gaat een eerdere tik verloren.
  const toggleDay = (day) => {
    setPlanNote(null);
    setPlanErrors([]);
    setDraft((prev) => ({
      ...prev,
      training_days: prev.training_days.includes(day)
        ? prev.training_days.filter((d) => d !== day)
        : [...prev.training_days, day],
    }));
  };

  const planChanged = JSON.stringify(normalizeScheduleSettings(draft)) !== JSON.stringify(settings)
    || draft.training_days.length === 0;

  const savePlanning = () => {
    const errs = validateScheduleSettings(draft, locale);
    if (errs.length) { setPlanErrors(errs); return; }
    run(async () => {
      const saved = await saveScheduleSettings(draft);
      // Geplande trainingen opnieuw indelen volgens de nieuwe planning; wat al
      // gelogd of beoordeeld is blijft staan.
      const today = todayISO();
      const moved = await replanUpcoming(today);
      const [t, ses] = await Promise.all([fetchTemplates(), fetchSessions()]);
      await ensureUpcomingSessions(t, ses, today, saved);
      setPlanNote(moved > 0 ? tx('plan.savedMoved', { count: moved }) : tx('plan.saved'));
    });
  };

  if (status === 'laden') return <main className="page" />;

  const labels = (group) => group.rows.map((r) => r.template.label).join(', ');

  return (
    <main className="page">

      <h1 className="exercise__title">{tx('schema.title')}</h1>
      <p className="exercise__meta">
        {tx(demo ? 'schema.introDemo' : 'schema.intro')}
      </p>
      {error && <p className="schema__error" role="alert">{error}</p>}

      <div className="schema__tabs segmented" role="tablist" aria-label={tx('schema.tabsAria')}>
        {VIEWS.map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v}
            className={`segmented__item${view === v ? ' segmented__item--on' : ''}`}
            onClick={() => switchView(v)}>
            {tx(v === 'workouts' ? 'schema.tabWorkouts' : 'schema.tabExercises')}
          </button>
        ))}
      </div>

      {view === 'oefeningen' ? (
        <section className="wk card exlist" aria-label={tx('schema.tabExercises')}>
          <p className="exercise__meta exlist__intro">{tx('ex.intro')}</p>
          {groups.length === 0 && <p className="exercise__meta">{tx('ex.empty')}</p>}
          <ol className="wk__list">
            {groups.map((group) => {
              const exercise = exercises.get(group.exerciseId);
              const first = group.rows[0].row;
              const differ = targetsDiffer(group.rows.map((r) => r.row));
              const open = editing?.type === 'exercise' && editing.id === group.exerciseId;
              const deleting = editing?.type === 'delete' && editing.id === group.exerciseId;
              const name = group.name || exercise?.name;
              return (
                <li key={group.exerciseId} id={`oef-${group.exerciseId}`} className={`item${open ? ' item--open' : ''}`}>
                  <div className="item__row">
                    <span className="item__main">
                      <span className="item__name">{name}</span>
                      <span className={`item__meta${differ ? ' item__meta--differ' : ''}`}>
                        {differ ? tx('ex.differsShort') : formatTarget(first, locale)}
                      </span>
                      <span className="item__meta">{tx('ex.in', { list: labels(group) })}</span>
                      {exercises.get(exercise?.alternative_id) && (
                        <span className="item__meta">⇄ {tx('ex.alternative', { name: exercises.get(exercise.alternative_id).name })}</span>
                      )}
                      {exercise?.video_urls?.length > 0 && (
                        <span className="item__meta item__meta--video">
                          {tx('item.videos', { count: exercise.video_urls.length })}
                        </span>
                      )}
                    </span>
                    <span className="item__tools">
                      {/* Pas na het potloodje: in de lijst zelf geen verwijderknop in de weg. */}
                      {!demo && open && (
                        <IconButton danger label={tx('ex.delete', { name })} disabled={busy}
                          onClick={() => { close(); setEditing({ type: 'delete', id: group.exerciseId }); }}>
                          <TrashIcon />
                        </IconButton>
                      )}
                      <IconButton label={tx(open ? 'item.close' : 'item.edit', { name })}
                        active={open} onClick={() => (open ? close() : startExercise(group))}>
                        {open ? <Chevron direction="up" /> : <EditIcon />}
                      </IconButton>
                    </span>
                  </div>

                  {deleting && (
                    <div className="confirm" role="alertdialog" aria-label={tx('ex.delete', { name })}>
                      <p>{tx('ex.deleteQuestion', { name, list: labels(group) })}</p>
                      <span className="confirm__buttons">
                        <button type="button" className="schema__danger" disabled={busy}
                          onClick={() => removeEverywhere(group)}>{tx('ex.deleteButton')}</button>
                        <button type="button" className="schema__link" onClick={close}>{tx('common.cancel')}</button>
                      </span>
                    </div>
                  )}

                  {open && (
                    <div className="item__edit" onBlur={() => autosave(group)}>
                      {differ && (
                        <p className="exlist__differ">
                          {tx('ex.differs', {
                            list: group.rows.map((r) => `${r.template.label} ${formatTarget(r.row, locale)}`).join(' · '),
                          })}
                        </p>
                      )}
                      <TargetFields measure={measureOf(first, exercise)} value={form} onChange={setForm} />
                      {group.rows.length > 1 && <span className="videos__hint">{tx('ex.targetHint', { list: labels(group) })}</span>}
                      <div className="videos">
                        <span className="videos__label">{tx('videos.label')}</span>
                        {(form.videos ?? []).slice(0, visibleVideoFields(form.videos)).map((url, vi) => (
                          <input key={vi} className="videos__input" type="url" inputMode="url"
                            placeholder={tx(vi === 0 ? 'videos.first' : 'videos.more')} value={url}
                            aria-label={tx('videos.aria', { n: vi + 1 })}
                            onChange={(e) => setForm({
                              ...form, videos: form.videos.map((u, j) => (j === vi ? e.target.value : u)),
                            })} />
                        ))}
                        {(form.videos ?? []).some((u) => String(u ?? '').trim()) && (
                          <span className="videos__hint">{tx('videos.hint', { max: MAX_VIDEOS })}</span>
                        )}
                      </div>
                      <AlternativePicker
                        exercise={exercise ?? { id: group.exerciseId, name, muscle_groups: [] }}
                        name={name}
                        alternative={exercises.get(exercise?.alternative_id) ?? null}
                        candidates={suggestAlternatives(exercise ?? { id: group.exerciseId, name }, {
                          exercises: [...exercises.values()],
                          catalog: demo ? [] : CATALOG,
                          query: altQuery,
                          limit: altQuery.trim() ? 12 : 6,
                        })}
                        query={altQuery} onQuery={setAltQuery}
                        picking={altPicking} onPicking={setAltPicking}
                        busy={busy} locale={locale} tx={tx}
                        onChoose={(candidate) => setAlternative(group, candidate)}
                      />
                      {formErrors.map((m) => <p key={m} className="schema__error">{m}</p>)}
                      <p className={`autosave${saveState ? ` autosave--${saveState}` : ''}`} role="status">
                        {saveState === 'bezig' ? tx('ex.saving') : saveState === 'bewaard' ? tx('ex.saved') : tx('ex.autosave')}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <>
          <section className="plan card" aria-labelledby="plan-title">
            <h2 id="plan-title" className="wk__title">{tx('plan.title')}</h2>
            <p className="plan__summary">{describeSchedule(settings, templates.length, locale)}</p>

            {demo ? (
              <p className="plan__hint">{tx('plan.demoHint')}</p>
            ) : (
              <>
                <span className="plan__label" id="plan-days">{tx('plan.days')}</span>
                <div className="plan__days" role="group" aria-labelledby="plan-days">
                  {weekdays(locale).map((w) => {
                    const on = draft.training_days.includes(w.day);
                    return (
                      <button key={w.day} type="button" aria-pressed={on} aria-label={w.label}
                        className={`plan__day${on ? ' plan__day--on' : ''}`} onClick={() => toggleDay(w.day)}>
                        {w.short}
                      </button>
                    );
                  })}
                </div>

                <span className="plan__label" id="plan-order">{tx('plan.order')}</span>
                <div className="plan__options" role="radiogroup" aria-labelledby="plan-order">
                  {ROTATIONS.map((r) => {
                    const on = draft.rotation === r.id;
                    return (
                      <button key={r.id} type="button" role="radio" aria-checked={on}
                        className={`plan__option${on ? ' plan__option--on' : ''}`}
                        onClick={() => { setPlanNote(null); setDraft((prev) => ({ ...prev, rotation: r.id })); }}>
                        <span className="plan__option-title">{rotationLabel(r.id, locale)}</span>
                        <span className="plan__option-text">
                          {r.id === 'volgorde'
                            ? tx('plan.inOrderText', { list: templates.map((x) => x.label.replace(/^Workout\s+/i, '')).join(' → ') })
                            : tx('plan.randomText', { count: templates.length })}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {planErrors.map((m) => <p key={m} className="schema__error">{m}</p>)}
                {planNote && <p className="plan__note" role="status">{planNote}</p>}

                <div className="plan__footer">
                  <span className="plan__hint">{tx('plan.missed')}</span>
                  {planChanged && (
                    <button type="button" className="schema__primary" disabled={busy} onClick={savePlanning}>
                      {tx('plan.save')}
                    </button>
                  )}
                </div>
              </>
            )}
          </section>

          {templates.map((t) => {
            const list = rows.get(t.id) ?? [];
            const renaming = editing?.type === 'rename' && editing.id === t.id;
            const archiving = editing?.type === 'archive' && editing.id === t.id;
            const impact = archiving ? archiveImpact(sessions, t.id) : null;

            return (
              <section key={t.id} className="wk card">
                <div className="wk__head">
                  {renaming ? (
                    <form className="wk__rename" onSubmit={(e) => { e.preventDefault(); saveRename(t); }}>
                      <input autoFocus value={form.label ?? ''} aria-label={tx('wk.nameAria')}
                        onChange={(e) => setForm({ label: e.target.value })} />
                      <button type="submit" className="schema__primary" disabled={busy}>{tx('common.save')}</button>
                      <button type="button" className="schema__link" onClick={close}>{tx('common.cancel')}</button>
                    </form>
                  ) : (
                    <>
                      <h2 className="wk__title">{t.label}</h2>
                      {!demo && (
                        <span className="wk__actions">
                          <button type="button" className="schema__link" onClick={() => startRename(t)}>{tx('wk.rename')}</button>
                          {templates.length > 1 && (
                            <button type="button" className="schema__link schema__link--quiet"
                              onClick={() => { setEditing({ type: 'archive', id: t.id }); setFormErrors([]); }}>
                              {tx('wk.remove')}
                            </button>
                          )}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {renaming && formErrors.length > 0 && <p className="schema__error">{formErrors[0]}</p>}

                {archiving && (
                  <div className="confirm" role="alertdialog" aria-label={tx('wk.removeAria', { name: t.label })}>
                    <p>
                      {tx('wk.removeQuestion', { name: t.label })}
                      {impact.planned > 0 && ` ${tx('wk.plannedLost', { count: impact.planned })}`}
                      {impact.history > 0 && ` ${tx('wk.historyKept', { count: impact.history })}`}
                    </p>
                    <span className="confirm__buttons">
                      <button type="button" className="schema__danger" disabled={busy} onClick={() => archive(t)}>{tx('wk.remove')}</button>
                      <button type="button" className="schema__link" onClick={close}>{tx('common.cancel')}</button>
                    </span>
                  </div>
                )}

                <ol className="wk__list">
                  {list.map((row, i) => {
                    const exercise = exercises.get(row.exercise_id);
                    const name = row.exercise?.name ?? exercise?.name;
                    const removing = editing?.type === 'remove' && editing.id === row.id;
                    const elsewhere = groups.find((g) => g.exerciseId === row.exercise_id)?.rows
                      .filter((r) => r.template.id !== t.id).map((r) => r.template.label) ?? [];
                    return (
                      <li key={row.id} className="item">
                        <div className="item__row">
                          <span className="item__main">
                            <span className="item__name">{name}</span>
                            <span className="item__meta">{formatTarget(row, locale)}</span>
                            {equipmentLabel(exercise?.equipment, locale) && (
                              <span className="item__meta">{equipmentLabel(exercise.equipment, locale)}</span>
                            )}
                            {elsewhere.length > 0 && (
                              <span className="item__meta">{tx('item.alsoIn', { list: elsewhere.join(', ') })}</span>
                            )}
                            {exercise?.video_urls?.length > 0 && (
                              <span className="item__meta item__meta--video">
                                {tx('item.videos', { count: exercise.video_urls.length })}
                              </span>
                            )}
                          </span>
                          <span className="item__tools">
                            {!demo && (
                              <>
                                <IconButton label={tx('item.up', { name })} disabled={busy || i === 0}
                                  onClick={() => move(t.id, row.id, -1)}><Chevron direction="up" /></IconButton>
                                <IconButton label={tx('item.down', { name })} disabled={busy || i === list.length - 1}
                                  onClick={() => move(t.id, row.id, +1)}><Chevron direction="down" /></IconButton>
                                <IconButton danger label={tx('item.remove', { name })} disabled={busy}
                                  onClick={() => { setEditing({ type: 'remove', id: row.id }); setFormErrors([]); }}>
                                  <TrashIcon />
                                </IconButton>
                              </>
                            )}
                            <IconButton label={tx('item.editIn', { name })} onClick={() => openInExercises(row.exercise_id)}>
                              <EditIcon />
                            </IconButton>
                          </span>
                        </div>

                        {removing && (
                          <div className="confirm" role="alertdialog" aria-label={tx('item.remove', { name })}>
                            <p>{tx('item.removeQuestion', { name, workout: t.label })}</p>
                            <span className="confirm__buttons">
                              <button type="button" className="schema__danger" disabled={busy}
                                onClick={() => remove(t.id, row)}>{tx('item.removeFromWorkout')}</button>
                              <button type="button" className="schema__link" onClick={close}>{tx('common.cancel')}</button>
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {list.length === 0 && <p className="exercise__meta">{tx('wk.empty')}</p>}

                {!demo && (
                  <button type="button" className="schema__add" onClick={() => onAddExercise(t.id)}>
                    {tx('wk.addExercise')}
                  </button>
                )}
              </section>
            );
          })}

          {!demo && (
            <div className="schema__footer">
              <button type="button" className="schema__primary" disabled={busy} onClick={addWorkout}>
                {tx('wk.addWorkout')}
              </button>
              <p className="exercise__meta">
                {tx('wk.addWorkoutHint')}
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

/** Eén vergelijkbare oefening kiezen om in een sessie naar te wisselen. */
function AlternativePicker({
  name, alternative, candidates, query, onQuery, picking, onPicking, busy, locale, tx, onChoose,
}) {
  const showList = !alternative || picking;
  return (
    <div className="alt">
      <span className="videos__label">{tx('alt.label')}</span>
      {alternative ? (
        <span className="alt__current">
          <span className="alt__name">⇄ {alternative.name}</span>
          <button type="button" className="schema__link" onClick={() => onPicking(!picking)}>
            {tx(picking ? 'common.cancel' : 'alt.change')}
          </button>
          <button type="button" className="schema__link schema__link--quiet" disabled={busy} onClick={() => onChoose(null)}>
            {tx('alt.remove')}
          </button>
        </span>
      ) : (
        <span className="videos__hint">{tx('alt.none')}</span>
      )}
      {showList && (
        <>
          {candidates.length > 0 ? (
            <div className="chips" role="group" aria-label={tx('alt.suggestions')}>
              {candidates.map((c) => (
                <button key={c.kind === 'existing' ? c.exercise.id : `cat-${c.entry.key}`} type="button"
                  className="chip" disabled={busy} onClick={() => onChoose(c)}>
                  {c.kind === 'existing' ? c.exercise.name : catalogName(c.entry, locale)}
                </button>
              ))}
            </div>
          ) : (
            <span className="videos__hint">{tx('alt.noResults')}</span>
          )}
          <input className="videos__input" type="search" value={query}
            placeholder={tx('alt.search')} aria-label={tx('alt.search')}
            onChange={(e) => onQuery(e.target.value)} />
        </>
      )}
      {alternative && <span className="videos__hint">{tx('alt.hint', { a: name, b: alternative.name })}</span>}
    </div>
  );
}

function IconButton({ label, onClick, disabled, active, danger, children }) {
  return (
    <button type="button" className={`icon${active ? ' icon--active' : ''}${danger ? ' icon--danger' : ''}`} aria-label={label}
      aria-expanded={active === undefined ? undefined : active} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Chevron({ direction }) {
  const d = {
    left: 'M7.5 1.5 2.5 7l5 5.5',
    up: 'M1.5 7.5 7 2.5l5.5 5',
    down: 'M1.5 2.5 7 7.5l5.5-5',
  }[direction];
  const box = direction === 'left' ? '0 0 10 14' : '0 0 14 10';
  const [w, h] = direction === 'left' ? [10, 14] : [14, 10];
  return (
    <svg width={w} height={h} viewBox={box} fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Potlood: aanpassen. */
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M9.6 2.2l2.2 2.2-7 7H2.6V9.2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.4 3.4l2.2 2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** Prullenbak: uit de workout of uit alle workouts halen. */
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 3.8h9M5.6 3.8V2.6h2.8v1.2M3.7 3.8l.6 7.6h5.4l.6-7.6M5.9 6v3.6M8.1 6v3.6"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
