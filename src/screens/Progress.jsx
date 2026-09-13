import { useEffect, useState } from 'react';
import { fetchTemplates, fetchAllTemplateExercises } from '../lib/queries.js';
import './Progress.css';
import './Exercise.css';

/** Alle oefeningen per schema, als ingang naar hun voortgang. */
export default function Progress({ onOpenExercise, onOpenBody, onBack }) {
  const [templates, setTemplates] = useState([]);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('laden');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, i] = await Promise.all([fetchTemplates(), fetchAllTemplateExercises()]);
        if (cancelled) return;
        setTemplates(t); setItems(i); setStatus('klaar');
      } catch (e) {
        if (!cancelled) { setError(e.message); setStatus('fout'); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (status === 'laden') return <main className="page" />;

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
      <button type="button" className="progress__link" onClick={onOpenBody}>
        Per spiergroep
      </button>
      {error && <p className="exercise__meta">{error}</p>}

      {templates.map((t) => (
        <section key={t.id} className="group">
          <h2 className="group__heading">{t.label}</h2>
          <ul className="group__list">
            {items
              .filter((i) => i.template_id === t.id)
              .sort((a, b) => a.position - b.position)
              .map((i) => (
                <li key={i.exercise_id}>
                  <button type="button" className="group__item"
                    onClick={() => onOpenExercise(i.exercise_id)}>
                    <span>{i.exercise.name}</span>
                    <span className="group__muscles">{i.exercise.muscle_groups.join(', ')}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
