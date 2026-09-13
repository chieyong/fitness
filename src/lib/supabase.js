import { createClient } from '@supabase/supabase-js';

// In de browser levert Vite import.meta.env; onder Node (scripts, tests) valt dit
// terug op process.env, zodat dezelfde datalaag buiten de app testbaar blijft.
const inBrowser = Boolean(import.meta.env);
const env = import.meta.env ?? process.env;

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

// Beheerscripts onder Node mogen de service-role-sleutel gebruiken: sinds alleen
// de eigenaar de gegevens mag zien, ziet de anon-sleutel niets meer. In de
// browser bestaat die variabele niet -- Vite geeft alleen VITE_-variabelen door.
const scriptKey = inBrowser ? null : process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Zonder .env draait de app in demo, maar hij moet dat wel netjes kunnen zeggen. */
export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, scriptKey ?? anonKey, scriptKey ? { auth: { persistSession: false } } : undefined)
  : null;
