import { useEffect, useState } from 'react';
import { formatTarget } from '../lib/schedule.js';
import { formatSets, exerciseStatus } from '../lib/progress.js';
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
  item, logged, previous, readOnly, skipped,
  open, onToggleOpen, onSaveSet, onDeleteSet, onToggleSkip, onOpen,
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

  const status = exerciseStatus({ logged, targetSets: item.target_sets, skipped });
  // Rechts staat het target al; hier hoort wat je nog niet weet. Zolang er
  // niets gelogd is, is dat wat je vorige keer deed.
  const summary = skipped ? 'Overgeslagen'
    : logged.length > 0 ? formatSets(logged)
    : previous && !previous.skipped ? `Vorige keer ${formatSets(previous.sets)}`
    : null;

  return (
    <li className={`block block--${status}${open ? ' block--open' : ''}`}>
      <button type="button" className="row" onClick={onToggleOpen}
        aria-expanded={open}>
        <Status status={status} />
        <span className="row__main">
          <span className="row__name">{exercise.name}</span>
          {/* Uitgeklapt staat dezelfde informatie eronder, mét datum. */}
          {summary && !open && <span className="row__summary">{summary}</span>}
        </span>
        <span className="row__target">{formatTarget(item)}</span>
      </button>

      {!open ? null : (
      <div className="block__body">
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
          Overgeslagen
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

      <button type="button" className="block__link block__progress" onClick={onOpen}>
        Voortgang van deze oefening
      </button>
      </div>
      )}
    </li>
  );
}

/** Open rondje, half gevuld of een vinkje -- de staat in één oogopslag. */
function Status({ status }) {
  if (status === 'klaar') {
    return (
      <span className="status status--klaar" aria-label="gedaan">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="currentColor" />
          <path d="M5.5 10.5 8.5 13.5 14.5 6.5" stroke="#fff" strokeWidth="2"
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (status === 'overgeslagen') {
    return (
      <span className="status status--overgeslagen" aria-label="overgeslagen">
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`status status--${status}`} aria-label={status === 'bezig' ? 'bezig' : 'nog te doen'}>
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {status === 'bezig' && <circle cx="10" cy="10" r="4.5" fill="currentColor" />}
      </svg>
    </span>
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
