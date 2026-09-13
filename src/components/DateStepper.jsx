import { addDays, formatDateShort } from '../lib/schedule.js';
import './DateStepper.css';

/**
 * Datum vooruit- en terugzetten. Fase 1 heeft dit nodig om de doorschuiflogica
 * te kunnen zien werken zonder op een echte donderdag te wachten.
 */
export default function DateStepper({ date, today, onChange }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(addDays(date, -1))} aria-label="Dag terug">
        <Chevron direction="left" />
      </button>
      <span className="stepper__value">{formatDateShort(date)}</span>
      <button type="button" onClick={() => onChange(addDays(date, 1))} aria-label="Dag vooruit">
        <Chevron direction="right" />
      </button>
      {date !== today && (
        <button type="button" className="stepper__reset" onClick={() => onChange(today)}>
          Vandaag
        </button>
      )}
    </div>
  );
}

function Chevron({ direction }) {
  const d = direction === 'left' ? 'M7.5 1.5 2.5 7l5 5.5' : 'M2.5 1.5 7.5 7l-5 5.5';
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
