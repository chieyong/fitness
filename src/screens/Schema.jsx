import { useEffect, useState } from 'react';
import {
  fetchTemplates, fetchTemplateExercises, fetchSessions, fetchAllExercises,
  updateTemplateExercise, deleteTemplateExercise, updateTemplateExercisePositions,
  createTemplate, renameTemplate, archiveTemplate, updateExercise,
} from '../lib/queries.js';
import { formatTarget } from '../lib/schedule.js';
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

/** Je workouts en hun oefeningen aanpassen. */
export default function Schema({ onAddExercise }) {
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

  const load = async () => {
    const [t, ses, ex] = await Promise.all([fetchTemplates(), fetchSessions(), fetchAllExercises()]);
    const perTemplate = await Promise.all(t.map((x) => fetchTemplateExercises(x.id)));
    setTemplates(t);
    setRows(new Map(t.map((x, i) => [x.id, perTemplate[i]])));
    setExercises(new Map(ex.map((e) => [e.id, e])));
    setSessions(ses);
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

  if (status === 'laden') return <main className="page" />;

  return (
    <main className="page">

      <h1 className="exercise__title">Schema</h1>
      <p className="exercise__meta">
        Pas je workouts aan. Je trainingsgeschiedenis blijft bewaard, ook als je een
        oefening of workout weghaalt.
      </p>
      {error && <p className="schema__error" role="alert">{error}</p>}

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
                  <span className="wk__actions">
                    <button type="button" className="schema__link" onClick={() => startRename(t)}>Hernoemen</button>
                    {templates.length > 1 && (
                      <button type="button" className="schema__link schema__link--quiet"
                        onClick={() => { setEditing({ type: 'archive', id: t.id }); setFormErrors([]); }}>
                        Verwijderen
                      </button>
                    )}
                  </span>
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
                        <IconButton label={`${row.exercise?.name} omhoog`} disabled={busy || i === 0}
                          onClick={() => move(t.id, row.id, -1)}><Chevron direction="up" /></IconButton>
                        <IconButton label={`${row.exercise?.name} omlaag`} disabled={busy || i === list.length - 1}
                          onClick={() => move(t.id, row.id, +1)}><Chevron direction="down" /></IconButton>
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
                          {(form.videos ?? []).map((url, vi) => (
                            <input key={vi} className="videos__input" type="url" inputMode="url"
                              placeholder={`YouTube-link ${vi + 1}`} value={url}
                              aria-label={`YouTube-link ${vi + 1}`}
                              onChange={(e) => setForm({
                                ...form, videos: form.videos.map((u, j) => (j === vi ? e.target.value : u)),
                              })} />
                          ))}
                          <span className="videos__hint">
                            Maximaal {MAX_VIDEOS}. Ze horen bij de oefening, dus je ziet ze in elke workout waar hij in staat.
                          </span>
                        </div>
                        {formErrors.map((m) => <p key={m} className="schema__error">{m}</p>)}
                        <span className="item__buttons">
                          <button type="button" className="schema__primary" disabled={busy} onClick={() => saveTarget(row)}>Opslaan</button>
                          <button type="button" className="schema__link" onClick={close}>Annuleren</button>
                          <button type="button" className="schema__link schema__link--danger" disabled={busy}
                            onClick={() => remove(t.id, row)}>Uit workout halen</button>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {list.length === 0 && <p className="exercise__meta">Nog geen oefeningen in deze workout.</p>}

            <button type="button" className="schema__add" onClick={() => onAddExercise(t.id)}>
              Oefening toevoegen
            </button>
          </section>
        );
      })}

      <div className="schema__footer">
        <button type="button" className="schema__primary" disabled={busy} onClick={addWorkout}>
          Workout toevoegen
        </button>
        <p className="exercise__meta">
          Een nieuwe workout komt in de rotatie na de sessies die al gepland staan.
        </p>
      </div>
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
