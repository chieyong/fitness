import { useEffect, useState } from 'react';
import {
  fetchTemplates, fetchTemplateExercises, fetchSessions, fetchAllExercises,
  updateTemplateExercise, deleteTemplateExercise, updateTemplateExercisePositions,
  createTemplate, renameTemplate, archiveTemplate, updateExercise, dataMode,
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
} from '../lib/editor.js';
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

/** Je workouts en hun oefeningen aanpassen. */
export default function Schema({ onAddExercise }) {
  // In de demo pas je bestaande oefeningen aan, maar bouw je het schema niet om.
  const demo = dataMode() === 'demo';
  const { t: tx, locale } = useI18n();
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

  const close = () => { setEditing(null); setForm({}); setFormErrors([]); };

  const startTarget = (row) => {
    setEditing({ type: 'target', id: row.id });
    setForm({ ...formFromColumns(row), videos: videoFields(exercises.get(row.exercise_id)?.video_urls ?? row.exercise?.video_urls) });
    setFormErrors([]);
  };

  const saveTarget = (row) => {
    const measure = measureOf(row, exercises.get(row.exercise_id));
    const errs = [...validateTarget(measure, form, locale), ...validateVideoUrls(form.videos, locale)];
    if (errs.length) { setFormErrors(errs); return; }
    run(async () => {
      await updateTemplateExercise(row.id, targetColumns(measure, form));
      // Video's horen bij de oefening zelf: alleen wegschrijven als ze veranderd zijn.
      const before = exercises.get(row.exercise_id)?.video_urls ?? null;
      const after = cleanVideoUrls(form.videos);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await updateExercise(row.exercise_id, { video_urls: after });
      }
      close();
    });
  };

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

  return (
    <main className="page">

      <h1 className="exercise__title">{tx('schema.title')}</h1>
      <p className="exercise__meta">
        {tx(demo ? 'schema.introDemo' : 'schema.intro')}
      </p>
      {error && <p className="schema__error" role="alert">{error}</p>}

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
                const open = editing?.type === 'target' && editing.id === row.id;
                const measure = measureOf(row, exercise);
                return (
                  <li key={row.id} className={`item${open ? ' item--open' : ''}`}>
                    <div className="item__row">
                      <span className="item__main">
                        <span className="item__name">{row.exercise?.name ?? exercise?.name}</span>
                        <span className="item__meta">{formatTarget(row, locale)}</span>
                        {equipmentLabel(exercise?.equipment, locale) && (
                          <span className="item__meta">{equipmentLabel(exercise.equipment, locale)}</span>
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
                        <IconButton label={tx('item.up', { name: row.exercise?.name })} disabled={busy || i === 0}
                          onClick={() => move(t.id, row.id, -1)}><Chevron direction="up" /></IconButton>
                        <IconButton label={tx('item.down', { name: row.exercise?.name })} disabled={busy || i === list.length - 1}
                          onClick={() => move(t.id, row.id, +1)}><Chevron direction="down" /></IconButton>
                          </>
                        )}
                        <IconButton label={tx(open ? 'item.close' : 'item.edit', { name: row.exercise?.name })}
                          active={open} onClick={() => (open ? close() : startTarget(row))}>
                          {open ? <CloseIcon /> : <EditIcon />}
                        </IconButton>
                      </span>
                    </div>

                    {open && (
                      <div className="item__edit">
                        <TargetFields measure={measure} value={form} onChange={setForm} />
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
                            <span className="videos__hint">
                              {tx('videos.hint', { max: MAX_VIDEOS })}
                            </span>
                          )}
                        </div>
                        {formErrors.map((m) => <p key={m} className="schema__error">{m}</p>)}
                        <span className="item__buttons">
                          <button type="button" className="schema__primary" disabled={busy} onClick={() => saveTarget(row)}>{tx('common.save')}</button>
                          <button type="button" className="schema__link" onClick={close}>{tx('common.cancel')}</button>
                          {!demo && (
                                                    <button type="button" className="schema__link schema__link--danger" disabled={busy}
                            onClick={() => remove(t.id, row)}>{tx('item.removeFromWorkout')}</button>
                          )}
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
    </main>
  );
}

function IconButton({ label, onClick, disabled, active, children }) {
  return (
    <button type="button" className={`icon${active ? ' icon--active' : ''}`} aria-label={label}
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

/** Kruisje: sluiten. */
function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
