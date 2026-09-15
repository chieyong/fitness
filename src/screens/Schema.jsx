import { useEffect, useState } from 'react';
import {
  fetchTemplates, fetchTemplateExercises, fetchSessions, fetchAllExercises,
  updateTemplateExercise, deleteTemplateExercise, updateTemplateExercisePositions,
  createTemplate, renameTemplate, archiveTemplate, updateExercise, dataMode,
  fetchScheduleSettings, saveScheduleSettings, replanUpcoming, ensureUpcomingSessions,
} from '../lib/queries.js';
import { formatTarget, todayISO } from '../lib/schedule.js';
import {
  WEEKDAYS, ROTATIONS, normalizeScheduleSettings, validateScheduleSettings, describeSchedule,
} from '../lib/scheduleSettings.js';
import {
  moveRow, removeRow, validateTarget, targetColumns, formFromColumns, measureOf,
  nextTemplateLabel, archiveImpact, validateTemplateLabel,
} from '../lib/editor.js';
import { EQUIPMENT } from '../data/equipment.js';
import { MAX_VIDEOS, validateVideoUrls, cleanVideoUrls } from '../lib/youtube.js';
import TargetFields from '../components/TargetFields.jsx';
import './Schema.css';
import './Exercise.css';

const equipmentLabel = (id) => EQUIPMENT.find((e) => e.id === id)?.label ?? null;

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
    const errs = [...validateTarget(measure, form), ...validateVideoUrls(form.videos)];
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
    const problem = validateTemplateLabel(form.label, templates, t.id);
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
    const errs = validateScheduleSettings(draft);
    if (errs.length) { setPlanErrors(errs); return; }
    run(async () => {
      const saved = await saveScheduleSettings(draft);
      // Geplande trainingen opnieuw indelen volgens de nieuwe planning; wat al
      // gelogd of beoordeeld is blijft staan.
      const today = todayISO();
      const moved = await replanUpcoming(today);
      const [t, ses] = await Promise.all([fetchTemplates(), fetchSessions()]);
      await ensureUpcomingSessions(t, ses, today, saved);
      setPlanNote(moved > 0
        ? `Planning opgeslagen. ${moved} geplande ${moved === 1 ? 'training is' : 'trainingen zijn'} opnieuw ingedeeld.`
        : 'Planning opgeslagen.');
    });
  };

  if (status === 'laden') return <main className="page" />;

  return (
    <main className="page">

      <h1 className="exercise__title">Schema</h1>
      <p className="exercise__meta">
        {demo
          ? "In de demo pas je de planning en de targets en video's van bestaande oefeningen aan; dat blijft bewaard tot je de browser sluit. Log in om workouts en oefeningen toe te voegen."
          : 'Pas je workouts aan. Je trainingsgeschiedenis blijft bewaard, ook als je een oefening of workout weghaalt.'}
      </p>
      {error && <p className="schema__error" role="alert">{error}</p>}

      <section className="plan card" aria-labelledby="plan-title">
        <h2 id="plan-title" className="wk__title">Planning</h2>
        <p className="plan__summary">{describeSchedule(settings, templates.length)}</p>

        <span className="plan__label" id="plan-days">Trainingsdagen</span>
        <div className="plan__days" role="group" aria-labelledby="plan-days">
          {WEEKDAYS.map((w) => {
            const on = draft.training_days.includes(w.day);
            return (
              <button key={w.day} type="button" aria-pressed={on} aria-label={w.label}
                className={`plan__day${on ? ' plan__day--on' : ''}`} onClick={() => toggleDay(w.day)}>
                {w.short}
              </button>
            );
          })}
        </div>

        <span className="plan__label" id="plan-order">Volgorde van de workouts</span>
        <div className="plan__options" role="radiogroup" aria-labelledby="plan-order">
          {ROTATIONS.map((r) => {
            const on = draft.rotation === r.id;
            return (
              <button key={r.id} type="button" role="radio" aria-checked={on}
                className={`plan__option${on ? ' plan__option--on' : ''}`}
                onClick={() => { setPlanNote(null); setDraft((prev) => ({ ...prev, rotation: r.id })); }}>
                <span className="plan__option-title">{r.label}</span>
                <span className="plan__option-text">
                  {r.id === 'volgorde'
                    ? `Steeds ${templates.map((t) => t.label.replace(/^Workout\s+/i, '')).join(' → ')}`
                    : `Na elke ronde van ${templates.length} workouts een nieuwe volgorde`}
                </span>
              </button>
            );
          })}
        </div>

        {planErrors.map((m) => <p key={m} className="schema__error">{m}</p>)}
        {planNote && <p className="plan__note" role="status">{planNote}</p>}

        <div className="plan__footer">
          <span className="plan__hint">Een gemiste training schuift door naar de volgende trainingsdag.</span>
          {planChanged && (
            <button type="button" className="schema__primary" disabled={busy} onClick={savePlanning}>
              Planning opslaan
            </button>
          )}
        </div>
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
                  <input autoFocus value={form.label ?? ''} aria-label="Naam van de workout"
                    onChange={(e) => setForm({ label: e.target.value })} />
                  <button type="submit" className="schema__primary" disabled={busy}>Opslaan</button>
                  <button type="button" className="schema__link" onClick={close}>Annuleren</button>
                </form>
              ) : (
                <>
                  <h2 className="wk__title">{t.label}</h2>
                  {!demo && (
                    <span className="wk__actions">
                      <button type="button" className="schema__link" onClick={() => startRename(t)}>Hernoemen</button>
                      {templates.length > 1 && (
                        <button type="button" className="schema__link schema__link--quiet"
                          onClick={() => { setEditing({ type: 'archive', id: t.id }); setFormErrors([]); }}>
                          Verwijderen
                        </button>
                      )}
                    </span>
                  )}
                </>
              )}
            </div>
            {renaming && formErrors.length > 0 && <p className="schema__error">{formErrors[0]}</p>}

            {archiving && (
              <div className="confirm" role="alertdialog" aria-label={`${t.label} verwijderen`}>
                <p>
                  {t.label} verwijderen?
                  {impact.planned > 0 && ` ${impact.planned} geplande ${impact.planned === 1 ? 'sessie vervalt' : 'sessies vervallen'}.`}
                  {impact.history > 0 && ` ${impact.history} afgeronde ${impact.history === 1 ? 'training blijft' : 'trainingen blijven'} bewaard.`}
                </p>
                <span className="confirm__buttons">
                  <button type="button" className="schema__danger" disabled={busy} onClick={() => archive(t)}>Verwijderen</button>
                  <button type="button" className="schema__link" onClick={close}>Annuleren</button>
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
                        <span className="item__meta">{formatTarget(row)}</span>
                        {equipmentLabel(exercise?.equipment) && (
                          <span className="item__meta">{equipmentLabel(exercise.equipment)}</span>
                        )}
                        {exercise?.video_urls?.length > 0 && (
                          <span className="item__meta item__meta--video">
                            {exercise.video_urls.length === 1 ? '1 video' : `${exercise.video_urls.length} video's`}
                          </span>
                        )}
                      </span>
                      <span className="item__tools">
{!demo && (
                          <>
                        <IconButton label={`${row.exercise?.name} omhoog`} disabled={busy || i === 0}
                          onClick={() => move(t.id, row.id, -1)}><Chevron direction="up" /></IconButton>
                        <IconButton label={`${row.exercise?.name} omlaag`} disabled={busy || i === list.length - 1}
                          onClick={() => move(t.id, row.id, +1)}><Chevron direction="down" /></IconButton>
                          </>
                        )}
                        <button type="button" className="schema__link"
                          onClick={() => (open ? close() : startTarget(row))}>
                          {open ? 'Sluiten' : 'Aanpassen'}
                        </button>
                      </span>
                    </div>

                    {open && (
                      <div className="item__edit">
                        <TargetFields measure={measure} value={form} onChange={setForm} />
                        <div className="videos">
                          <span className="videos__label">Video's</span>
                          {(form.videos ?? []).slice(0, visibleVideoFields(form.videos)).map((url, vi) => (
                            <input key={vi} className="videos__input" type="url" inputMode="url"
                              placeholder={vi === 0 ? 'Plak een YouTube-link' : 'Nog een link (optioneel)'} value={url}
                              aria-label={`YouTube-link ${vi + 1}`}
                              onChange={(e) => setForm({
                                ...form, videos: form.videos.map((u, j) => (j === vi ? e.target.value : u)),
                              })} />
                          ))}
                          {(form.videos ?? []).some((u) => String(u ?? '').trim()) && (
                            <span className="videos__hint">
                              Maximaal {MAX_VIDEOS}. Hoort bij de oefening, dus zichtbaar in elke workout.
                            </span>
                          )}
                        </div>
                        {formErrors.map((m) => <p key={m} className="schema__error">{m}</p>)}
                        <span className="item__buttons">
                          <button type="button" className="schema__primary" disabled={busy} onClick={() => saveTarget(row)}>Opslaan</button>
                          <button type="button" className="schema__link" onClick={close}>Annuleren</button>
                          {!demo && (
                                                    <button type="button" className="schema__link schema__link--danger" disabled={busy}
                            onClick={() => remove(t.id, row)}>Uit workout halen</button>
                          )}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {list.length === 0 && <p className="exercise__meta">Nog geen oefeningen in deze workout.</p>}

            {!demo && (

                        <button type="button" className="schema__add" onClick={() => onAddExercise(t.id)}>
              Oefening toevoegen
            </button>

            )}
          </section>
        );
      })}

      {!demo && (
        <div className="schema__footer">
          <button type="button" className="schema__primary" disabled={busy} onClick={addWorkout}>
            Workout toevoegen
          </button>
          <p className="exercise__meta">
            Een nieuwe workout komt in de rotatie na de sessies die al gepland staan.
          </p>
        </div>
      )}
    </main>
  );
}

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button type="button" className="icon" aria-label={label} onClick={onClick} disabled={disabled}>
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
