import { useState } from 'react';
import { THEME_LABELS, getThemePreference, nextTheme, setThemePreference } from '../lib/theme.js';
import './AccessBanner.css';

const MESSAGES = {
  'niet-ingelogd': 'Dit zijn demo-gegevens. Log in om je eigen trainingen op te slaan.',
  'niet-geconfigureerd': 'Dit zijn demo-gegevens. Deze versie is niet met een database verbonden.',
  'geen-toegang': 'Dit account heeft geen toegang tot eigen gegevens. Je ziet de demo.',
  'controle-mislukt': 'Je toegang kon niet worden gecontroleerd. Je ziet de demo.',
};

/**
 * De balk bovenaan elk scherm: de naam van de app, en in- of uitloggen.
 * In de demo staat eronder een regel die zegt waar je naar kijkt.
 */
export default function AccessBanner({ access, error, onLogin, onLogout }) {
  const owner = access.mode === 'owner';
  const loggedIn = access.email != null;
  const canLogin = access.reason === 'niet-ingelogd';
  const [theme, setTheme] = useState(getThemePreference);
  const cycleTheme = () => setTheme(setThemePreference(nextTheme(theme)));

  return (
    <header className="appbar">
      <div className="appbar__inner">
        <span className="appbar__name">Repz</span>
        <span className="appbar__actions">
          <button type="button" className="appbar__theme" onClick={cycleTheme}
            aria-label={`Thema: ${THEME_LABELS[theme]}. Tik om te wisselen.`}
            title={`Thema: ${THEME_LABELS[theme]}`}>
            <ThemeIcon theme={theme} />
            <span className="appbar__theme-label">{THEME_LABELS[theme]}</span>
          </button>
          {owner && <span className="appbar__account">{access.email}</span>}
          {canLogin && (
            <button type="button" className="appbar__action" onClick={onLogin} aria-label="Inloggen met Google">
              <span className="appbar__action-long" aria-hidden="true">Inloggen met Google</span>
              <span className="appbar__action-short" aria-hidden="true">Inloggen</span>
            </button>
          )}
          {loggedIn && (
            <button type="button" className="appbar__action" onClick={onLogout}>Uitloggen</button>
          )}
        </span>
      </div>

      {(!owner || error) && (
        <div className="appbar__note" role="status">
          <div className="appbar__note-inner">
            {!owner && (MESSAGES[access.reason] ?? MESSAGES['niet-ingelogd'])}
            {!owner && loggedIn && <span className="appbar__note-account">{access.email}</span>}
            {error && <span className="appbar__error" role="alert">Inloggen lukte niet: {error}</span>}
          </div>
        </div>
      )}
    </header>
  );
}

/** Zon voor licht, maan voor donker, half gevulde cirkel voor Systeem. */
function ThemeIcon({ theme }) {
  const common = { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true };
  if (theme === 'light') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
      </svg>
    );
  }
  if (theme === 'dark') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 2.2a5.8 5.8 0 0 1 0 11.6z" fill="currentColor" />
    </svg>
  );
}
