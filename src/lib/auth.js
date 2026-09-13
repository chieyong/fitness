/**
 * Inloggen met Google via Supabase, en de vraag die erop volgt: mag deze
 * gebruiker de echte gegevens zien? Dat beslist de database (is_owner), niet
 * de app -- de app volgt alleen het antwoord.
 */
import { supabase, isConfigured } from './supabase.js';

/**
 * Wat de app laat zien, afgeleid uit wat er bekend is. Puur, zodat elke tak
 * te testen is. Bij twijfel altijd demo: liever te weinig tonen dan te veel.
 */
export function accessFor({ configured, session, owner, error }) {
  const email = session?.user?.email ?? null;
  if (!configured) return { mode: 'demo', reason: 'niet-geconfigureerd', email: null };
  if (!session) return { mode: 'demo', reason: 'niet-ingelogd', email: null };
  if (error) return { mode: 'demo', reason: 'controle-mislukt', email };
  if (owner !== true) return { mode: 'demo', reason: 'geen-toegang', email };
  return { mode: 'owner', reason: null, email };
}

export async function resolveAccess() {
  if (!isConfigured) return accessFor({ configured: false });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return accessFor({ configured: true, session: null });

  const { data, error } = await supabase.rpc('is_owner');
  return accessFor({ configured: true, session, owner: data, error });
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    // Terug naar dezelfde app, zonder de queryparameters van het scherm.
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}

/** Luistert naar in- en uitloggen; geeft een functie terug om te stoppen. */
export function onAuthChange(callback) {
  if (!isConfigured) return () => {};
  // Uitgesteld: een Supabase-aanroep binnen deze callback kan supabase-js laten
  // vastlopen, en resolveAccess doet er meteen een.
  const { data } = supabase.auth.onAuthStateChange(() => setTimeout(callback, 0));
  return () => data.subscription.unsubscribe();
}
