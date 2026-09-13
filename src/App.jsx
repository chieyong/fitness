import { useEffect, useState } from 'react';
import { isConfigured } from './lib/supabase.js';
import Today from './screens/Today.jsx';
import Exercise from './screens/Exercise.jsx';
import ProgressIndex from './screens/Progress.jsx';

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

export default function App() {
  if (!isConfigured) {
    return (
      <main className="page">
        <h1 style={{ fontSize: 'var(--text-display)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          Nog niet verbonden
        </h1>
        <p style={{ color: 'var(--ink-secondary)', marginTop: 'var(--space-3)', maxWidth: '34em' }}>
          Deze build heeft geen Supabase-sleutels meegekregen.
          {' '}Lokaal: kopieer <code>.env.example</code> naar <code>.env</code> en vul
          {' '}<code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code> in.
          {' '}Op Netlify: zet diezelfde twee als environment variables en draai de
          {' '}deploy opnieuw — Vite leest ze tijdens de build, niet in de browser.
        </p>
      </main>
    );
  }

  return <Router />;
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
  return <Today onOpenExercise={openExercise} onOpenProgress={openProgress} />;
}
