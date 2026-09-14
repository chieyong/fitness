import './TargetFields.css';

/**
 * Invoer voor een target: sets plus reps van-tot, of seconden van-tot.
 * De bovengrens is optioneel; leeg betekent een vast aantal.
 */
export default function TargetFields({ measure, value, onChange }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  const timed = measure === 'tijd';

  return (
    <div className="target">
      <label className="target__field">
        <span>Sets</span>
        <input type="text" inputMode="numeric" value={value.sets ?? ''} onChange={set('sets')} />
      </label>
      <label className="target__field">
        <span>{timed ? 'Seconden' : 'Reps'}</span>
        <input type="text" inputMode="numeric"
          value={(timed ? value.secondsMin : value.repsMin) ?? ''}
          onChange={set(timed ? 'secondsMin' : 'repsMin')} />
      </label>
      <span className="target__dash" aria-hidden="true">tot</span>
      <label className="target__field">
        <span>Tot (optioneel)</span>
        <input type="text" inputMode="numeric"
          value={(timed ? value.secondsMax : value.repsMax) ?? ''}
          onChange={set(timed ? 'secondsMax' : 'repsMax')} />
      </label>
    </div>
  );
}
