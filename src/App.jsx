import { useEffect, useState } from 'react';
import { resolveAccess, onAuthChange, signInWithGoogle, signOut } from './lib/auth.js';
import { setDataSource } from './lib/queries.js';
import Today from './screens/Today.jsx';
import Exercise from './screens/Exercise.jsx';
import ProgressIndex from './screens/Progress.jsx';
import Schema from './screens/Schema.jsx';
import AddExercise from './screens/AddExercise.jsx';
import AccessBanner from './components/AccessBanner.jsx';
import TabBar from './components/TabBar.jsx';

/** Welk scherm staat er in de URL? Leeg = het scherm van vandaag. */
function routeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const exercise = params.get('oefening');
  if (exercise) return { screen: 'oefening', exercise };
  const adding = params.get('toevoegen');
  if (adding) return { screen: 'toevoegen', template: adding };
  if (params.has('schema')) return { screen: 'schema' };
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

  const login = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) setAuthError(error.message);
  };

  const logout = () => signOut();

  if (!access) return <main className="page" />;

  // Geen inlogscherm vooraf: een nieuwe bezoeker ziet meteen de demo, met in
  // de balk bovenaan hoe je je eigen trainingen bewaart.
  return (
    <>
      <AccessBanner access={access} error={authError} onLogin={login} onLogout={logout} />
      {/* Andere bron = alles opnieuw ophalen; de key dwingt dat af. */}
      <Router key={`${access.mode}:${access.email ?? ''}`} />
    </>
  );
}

function Router() {
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
    url.searchParams.delete('schema');
    url.searchParams.delete('toevoegen');
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
  const navigate = (tab) => {
    if (tab === 'voortgang') go({ voortgang: '1' });
    else if (tab === 'schema') go({ schema: '1' });
    else go({});
  };
  const openAddExercise = (templateId) => go({ toevoegen: templateId });
  // Kom je hier via een gedeelde link, dan is er geen geschiedenis om naar
  // terug te gaan; val dan terug op het scherm van vandaag.
  const back = () => {
    if (window.history.length > 1) window.history.back();
    else go({});
  };

  // Het toevoegformulier is een zijstap: daar geen tabbalk, alleen terug.
  if (route.screen === 'toevoegen') {
    return <AddExercise templateId={route.template} onDone={back} onBack={back} />;
  }

  let screen;
  if (route.screen === 'oefening') {
    screen = <Exercise exerciseId={route.exercise} onBack={back} />;
  } else if (route.screen === 'voortgang') {
    screen = (
      <ProgressIndex
        muscle={route.muscle}
        onSelectMuscle={(m) => go({ voortgang: m ?? '1' }, { inPlace: true })}
        onOpenExercise={openExercise}
      />
    );
  } else if (route.screen === 'schema') {
    screen = <Schema onAddExercise={openAddExercise} />;
  } else {
    screen = <Today onOpenExercise={openExercise} />;
  }

  // Een oefening hoort bij Voortgang: die tab blijft dan aan.
  const activeTab = route.screen === 'oefening' ? 'voortgang' : route.screen;

  return (
    <>
      {screen}
      <TabBar active={activeTab} onNavigate={navigate} />
    </>
  );
}
