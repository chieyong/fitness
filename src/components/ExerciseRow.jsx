import { formatTarget } from '../lib/schedule.js';

/**
 * Eén oefening binnen een sessie: naam, target en spiergroepen. Logging-velden
 * komen in fase 2 -- deze rij is nu bewust alleen lezen.
 */
export default function ExerciseRow({ item }) {
  const exercise = item.exercise;
  return (
    <li className="exercise">
      <div className="exercise__main">
        <span className="exercise__name">{exercise?.name ?? 'Onbekende oefening'}</span>
        <span className="exercise__muscles">
          {(exercise?.muscle_groups ?? []).join(', ')}
        </span>
      </div>
      <span className="exercise__target">{formatTarget(item)}</span>
    </li>
  );
}
