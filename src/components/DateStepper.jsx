import { addDays, formatDateShort } from '../lib/schedule.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './DateStepper.css';

/**
 * Datum vooruit- en terugzetten. Fase 1 heeft dit nodig om de doorschuiflogica
 * te kunnen zien werken zonder op een echte donderdag te wachten.
 */
export default function DateStepper({ date, today, onChange }) {
  const { t, locale } = useI18n();
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(addDays(date, -1))} aria-label={t('date.back')}>
        <Chevron direction="left" />
      </button>
      <span className="stepper__value">{formatDateShort(date, locale)}</span>
      <button type="button" onClick={() => onChange(addDays(date, 1))} aria-label={t('date.forward')}>
        <Chevron direction="right" />
      </button>
      {date !== today && (
        <button type="button" className="stepper__reset" onClick={() => onChange(today)}>
          {t('date.today')}
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
