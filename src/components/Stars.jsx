import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './Stars.css';

/**
 * Vijf sterren. Met onChange is het een keuze (nog een keer op dezelfde ster
 * tikken wist hem); zonder onChange alleen weergave.
 */
export default function Stars({ value, onChange, size = 20, label }) {
  const { t } = useI18n();
  const words = (n) => t(`stars.${n}`);
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  const interactive = typeof onChange === 'function';

  if (!interactive) {
    if (!value) return null;
    return (
      <span className="stars stars--static" role="img" aria-label={t('stars.static', { value })}>
        {[1, 2, 3, 4, 5].map((n) => <Star key={n} filled={n <= value} size={size} />)}
      </span>
    );
  }

  return (
    <span className="stars" role="radiogroup" aria-label={label ?? t('stars.label')} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n}
          aria-label={t('stars.option', { count: n, label: words(n) })}
          className="stars__button"
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(value === n ? null : n)}>
          <Star filled={n <= shown} size={size} />
        </button>
      ))}
      {shown > 0 && <span className="stars__label">{words(shown)}</span>}
    </span>
  );
}

function Star({ filled, size }) {
  return (
    <svg className={`star${filled ? ' star--on' : ''}`} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 1.8l2.47 5.02 5.53.8-4 3.9.94 5.5L10 14.42l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"
        strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
