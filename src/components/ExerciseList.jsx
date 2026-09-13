import ExerciseRow from './ExerciseRow.jsx';
import './ExerciseList.css';

export default function ExerciseList({ items }) {
  if (items.length === 0) {
    return <p className="exercise-list__empty">Dit schema heeft nog geen oefeningen.</p>;
  }

  return (
    <ol className="exercise-list">
      {items.map((item) => <ExerciseRow key={item.id} item={item} />)}
    </ol>
  );
}
