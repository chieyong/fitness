import './AccessBanner.css';

const MESSAGES = {
  'niet-ingelogd': 'Dit zijn demo-gegevens. Log in om je eigen trainingen op te slaan.',
  'niet-geconfigureerd': 'Dit zijn demo-gegevens. Deze versie is niet met een database verbonden.',
  'geen-toegang': 'Dit account heeft geen toegang tot eigen gegevens. Je ziet de demo.',
  'controle-mislukt': 'Je toegang kon niet worden gecontroleerd. Je ziet de demo.',
};

/**
 * Smalle balk bovenaan elk scherm: laat zien of je naar demo- of eigen gegevens
 * kijkt, en biedt in- of uitloggen. Als eigenaar is hij bewust rustiger.
 */
export default function AccessBanner({ access, error, onLogin, onLogout }) {
  const owner = access.mode === 'owner';
  const loggedIn = access.email != null;
  const canLogin = access.reason === 'niet-ingelogd';

  return (
    <div className={`banner${owner ? ' banner--owner' : ''}`} role="status">
      <div className="banner__inner">
        <span className="banner__text">
          {owner ? `Ingelogd als ${access.email}` : MESSAGES[access.reason] ?? MESSAGES['niet-ingelogd']}
          {!owner && loggedIn && <span className="banner__account">{access.email}</span>}
          {error && <span className="banner__error" role="alert">Inloggen lukte niet: {error}</span>}
        </span>
        {canLogin && (
          <button type="button" className="banner__action" onClick={onLogin}>
            Inloggen met Google
          </button>
        )}
        {loggedIn && (
          <button type="button" className="banner__action" onClick={onLogout}>Uitloggen</button>
        )}
      </div>
    </div>
  );
}
