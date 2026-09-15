import { formatDateLong, formatDateShort } from '../lib/schedule.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './SessionHeader.css';

/**
 * De kop van het scherm: welke dag het is, welke workout er staat, en -- als er
 * iets is ingehaald -- waar die sessie oorspronkelijk stond.
 */
export default function SessionHeader({ date, today, template, entry, done }) {
  const { t, locale } = useI18n();
  return (
    <header className="session-header">
      <p className="session-header__date">{formatDateLong(date, today, locale)}</p>
      <h1 className="session-header__title">
        {template ? template.label : t('session.rest')}
      </h1>
      {entry?.shifted && (
        <p className="session-header__note">
          {t('session.shifted', { date: formatDateShort(entry.original_date, locale) })}
        </p>
      )}
      {done && (
        <p className="session-header__done">
          {t(done.status === 'voltooid' ? 'session.completed' : 'session.skipped')}
        </p>
      )}
    </header>
  );
}
