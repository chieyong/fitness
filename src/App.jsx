import { useEffect, useState } from 'react';
import { resolveAccess, onAuthChange, signInWithGoogle, signOut } from './lib/auth.js';
import { setDataSource } from './lib/queries.js';
import Today from './screens/Today.jsx';
import Exercise from './screens/Exercise.jsx';
import ProgressIndex from './screens/Progress.jsx';
import Login from './screens/Login.jsx';
import AccessBanner from './components/AccessBanner.jsx';

const DEMO_KEY = 'fitness.demo';

/** Welk scherm staat er in de URL? Leeg = het scherm van vandaag. */
function routeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const exercise = params.get('oefening');
  if (exercise) return { screen: 'oefening', exercise };
  if (params.has('voortgang')) {
    return { screen: 'voortgang', muscle: params.get('voortgang') || null };
  }
  return { screen: 'vandaag' };
}

/** Een mislukte Google-login komt terug met een foutmelding in de URL. */
function takeAuthError() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const message = hash.get('error_description') ?? query.get('error_description');
  if (message) {
    window.history.replaceState(null, '', window.location.pathname);
  }
  return message;
}

export default function App() {
  const [access, setAccess] = useState(null);
  const [demoChosen, setDemoChosen] = useState(() => sessionStorage.getItem(DEMO_KEY) === '1');
  const [authError, setAuthError] = useState(takeAuthError);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const next = await resolveAccess().catch(() => (
        { mode: 'demo', reason: 'controle-mislukt', email: null }
      ));
      if (cancelled) return;
      // Eerst de bron, dan pas de schermen: die halen meteen gegevens op.
      setDataSource(next.mode === 'owner' ? 'supabase' : 'demo');
      setAccess(next);
    };

    check();
    const stop = onAuthChange(check);
    return () => { cancelled = true; stop(); };
  }, []);

  const chooseDemo = () => {
    sessionStorage.setItem(DEMO_KEY, '1');
    setDemoChosen(true);
  };

  const login = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error.message);
  };

  const logout = async () => {
    sessionStorage.removeItem(DEMO_KEY);
    setDemoChosen(false);
    await signOut();
  };

  if (!access) return <main className="page" />;

  // Niet ingelogd en nog geen keuze gemaakt: eerst het inlogscherm.
  if (access.reason === 'niet-ingelogd' && !demoChosen) {
    return <Login onLogin={login} onDemo={chooseDemo} error={authError} />;
  }

  return (
    <>
      {access.mode === 'demo' && (
        <AccessBanner access={access} onLogin={login} onLogout={logout} />
      )}
      {/* Andere bron = alles opnieuw ophalen; de key dwingt dat af. */}
      <Router
        key={`${access.mode}:${access.email ?? ''}`}
        account={access.mode === 'owner' ? { email: access.email, onLogout: logout } : null}
      />
    </>
  );
}

function Router({ account }) {
  const [route, setRoute] = useState(routeFromUrl);

  // De browserknoppen horen gewoon te werken.
  useEffect(() => {
    const onPop = () => setRoute(routeFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /**
   * Naar een ander scherm: nieuwe geschiedenisstap en bovenaan beginnen.
   * Met `inPlace` blijft het hetzelfde scherm (bijv. een spiergroep openklappen):
   * dan geen extra stap in de geschiedenis en geen sprong naar boven -- het
   * scherm regelt het scrollen zelf, geanimeerd.
   */
  const go = (params, { inPlace = false } = {}) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('oefening');
    url.searchParams.delete('voortgang');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    if (inPlace) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
      window.scrollTo(0, 0);
    }
    setRoute(routeFromUrl());
  };

  const openExercise = (id) => go({ oefening: id });
  const openProgress = () => go({ voortgang: '1' });
  // Kom je hier via een gedeelde link, dan is er geen geschiedenis om naar
  // terug te gaan; val dan terug op het scherm van vandaag.
  const back = () => {
    if (window.history.length > 1) window.history.back();
    else go({});
  };

  if (route.screen === 'oefening') {
    return <Exercise exerciseId={route.exercise} onBack={back} />;
  }
  if (route.screen === 'voortgang') {
    return (
      <ProgressIndex
        muscle={route.muscle}
        onSelectMuscle={(m) => go({ voortgang: m ?? '1' }, { inPlace: true })}
        onOpenExercise={openExercise}
        onGoToday={() => go({})}
        onBack={back}
      />
    );
  }
  return <Today onOpenExercise={openExercise} onOpenProgress={openProgress} account={account} />;
}
