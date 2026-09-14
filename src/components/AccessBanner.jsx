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

  return (
    <header className="appbar">
      <div className="appbar__inner">
        <span className="appbar__name">Repz</span>
        <span className="appbar__actions">
          {owner && <span className="appbar__account">{access.email}</span>}
          {canLogin && (
            <button type="button" className="appbar__action" onClick={onLogin}>Inloggen met Google</button>
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
