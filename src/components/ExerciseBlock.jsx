import { useEffect, useState } from 'react';
import { formatTarget } from '../lib/schedule.js';
import { formatSets } from '../lib/progress.js';
import { parseDecimal, parseWhole, formatNumber } from '../lib/input.js';
import { formatDateShort } from '../lib/schedule.js';

/** Zoveel invoerregels als het target vraagt, maar nooit minder dan al gelogd is. */
function buildRows(item, logged) {
  const count = Math.max(item.target_sets, logged.length);
  return Array.from({ length: count }, (_, i) => {
    const row = logged.find((l) => l.set_number === i + 1);
    return {
      set_number: i + 1,
      id: row?.id ?? null,
      reps: formatNumber(row?.reps),
      weight: formatNumber(row?.weight_kg),
      seconds: formatNumber(row?.seconds),
    };
  });
}

export default function ExerciseBlock({
  item, logged, previous, readOnly, skipped, onSaveSet, onDeleteSet, onToggleSkip,
}) {
  const exercise = item.exercise;
  const isTimed = item.target_seconds != null;

  const [rows, setRows] = useState(() => buildRows(item, logged));
  const [busy, setBusy] = useState(null);

  // Na een herlaadactie de serverwaarden overnemen, zonder te typen te onderbreken.
  useEffect(() => { setRows(buildRows(item, logged)); }, [item.id, logged]);

  const update = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const commit = async (index) => {
    const row = rows[index];
    const reps = parseWhole(row.reps);
    const weight = parseDecimal(row.weight);
    const seconds = parseWhole(row.seconds);
    const empty = reps == null && weight == null && seconds == null;

    if (empty) {
      if (row.id) { setBusy(index); await onDeleteSet(row.id); setBusy(null); }
      return;
    }

    setBusy(index);
    await onSaveSet({
      exercise_id: exercise.id,
      set_number: row.set_number,
      reps, weight_kg: weight, seconds,
      skipped: false,
    });
    setBusy(null);
  };

  const addRow = () => {
    setRows((prev) => [...prev, {
      set_number: prev.length + 1, id: null, reps: '', weight: '', seconds: '',
    }]);
  };

  return (
    <li className={`block${skipped ? ' block--skipped' : ''}`}>
      <div className="block__head">
        <div>
          <span className="block__name">{exercise.name}</span>
          <span className="block__muscles">{exercise.muscle_groups.join(', ')}</span>
        </div>
        <span className="block__target">{formatTarget(item)}</span>
      </div>

      {previous && (
        <p className="block__previous">
          {previous.skipped
            ? `Vorige keer niet gedaan — ${formatDateShort(previous.date)}`
            : `Vorige keer ${formatSets(previous.sets)} — ${formatDateShort(previous.date)}`}
          {previous.note && <span className="block__previous-note">{previous.note}</span>}
        </p>
      )}

      {skipped ? (
        <p className="block__skipped-label">
          Niet gedaan
          {!readOnly && (
            <button type="button" className="block__link" onClick={() => onToggleSkip(false)}>
              Toch loggen
            </button>
          )}
        </p>
      ) : (
        <>
          <div className="sets">
            {rows.map((row, i) => (
              <div className="set" key={row.set_number}>
                <span className="set__number">{row.set_number}</span>

                {isTimed ? (
                  <label className="set__field">
                    <input
                      type="text" inputMode="numeric"
                      value={row.seconds} readOnly={readOnly}
                      onChange={(e) => update(i, 'seconds', e.target.value)}
                      onBlur={() => commit(i)}
                      aria-label={`Set ${row.set_number}, seconden`}
                    />
                    <span className="set__unit">sec</span>
                  </label>
                ) : (
                  <>
                    <label className="set__field">
                      <input
                        type="text" inputMode="numeric"
                        value={row.reps} readOnly={readOnly}
                        onChange={(e) => update(i, 'reps', e.target.value)}
                        onBlur={() => commit(i)}
                        aria-label={`Set ${row.set_number}, herhalingen`}
                      />
                      <span className="set__unit">reps</span>
                    </label>
                    <label className="set__field">
                      <input
                        type="text" inputMode="decimal"
                        value={row.weight} readOnly={readOnly}
                        onChange={(e) => update(i, 'weight', e.target.value)}
                        onBlur={() => commit(i)}
                        aria-label={`Set ${row.set_number}, gewicht in kilo`}
                      />
                      <span className="set__unit">kg</span>
                    </label>
                  </>
                )}

                <Check visible={Boolean(row.id) && busy !== i} />
              </div>
            ))}
          </div>

          {!readOnly && (
            <div className="block__actions">
              <button type="button" className="block__link" onClick={addRow}>Set erbij</button>
              <button type="button" className="block__link" onClick={() => onToggleSkip(true)}>
                Niet gedaan
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

/** Verschijnt zodra een set is opgeslagen -- de enige animatie in het scherm. */
function Check({ visible }) {
  return (
    <span className={`check${visible ? ' check--on' : ''}`} aria-hidden={!visible}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2.5 7.5 5.5 10.5 11.5 3.5" stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
