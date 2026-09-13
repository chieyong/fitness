import './AccessBanner.css';

const MESSAGES = {
  'niet-ingelogd': 'Je bekijkt de demo. Wat je invult wordt niet bewaard.',
  'niet-geconfigureerd': 'Je bekijkt de demo. Deze versie is niet met een database verbonden.',
  'geen-toegang': 'Dit account heeft geen toegang tot deze gegevens. Je bekijkt de demo.',
  'controle-mislukt': 'Je toegang kon niet worden gecontroleerd. Je bekijkt de demo.',
};

/** Smalle balk bovenaan zolang de app demo-gegevens toont. */
export default function AccessBanner({ access, onLogin, onLogout }) {
  const loggedIn = access.email != null;
  const canLogin = access.reason === 'niet-ingelogd';

  return (
    <div className="banner" role="status">
      <div className="banner__inner">
        <span className="banner__text">
          {MESSAGES[access.reason] ?? MESSAGES['niet-ingelogd']}
          {loggedIn && <span className="banner__account">{access.email}</span>}
        </span>
        {canLogin && (
          <button type="button" className="banner__action" onClick={onLogin}>Inloggen</button>
        )}
        {loggedIn && (
          <button type="button" className="banner__action" onClick={onLogout}>Uitloggen</button>
        )}
      </div>
    </div>
  );
}
