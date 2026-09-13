import { formatDateLong, formatDateShort } from '../lib/schedule.js';
import './SessionHeader.css';

/**
 * De kop van het scherm: welke dag het is, welke workout er staat, en -- als er
 * iets is ingehaald -- waar die sessie oorspronkelijk stond.
 */
export default function SessionHeader({ date, today, template, entry }) {
  return (
    <header className="session-header">
      <p className="session-header__date">{formatDateLong(date, today)}</p>
      <h1 className="session-header__title">
        {template ? template.label : 'Rustdag'}
      </h1>
      {entry?.shifted && (
        <p className="session-header__note">
          Ingehaald — stond gepland op {formatDateShort(entry.original_date)}
        </p>
      )}
    </header>
  );
}
