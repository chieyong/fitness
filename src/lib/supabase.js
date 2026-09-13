import { createClient } from '@supabase/supabase-js';

// In de browser levert Vite import.meta.env; onder Node (scripts, tests) valt dit
// terug op process.env, zodat dezelfde datalaag buiten de app testbaar blijft.
const env = import.meta.env ?? process.env;

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

/** Zonder .env draait de app niet, maar hij moet dat wel netjes kunnen zeggen. */
export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured ? createClient(url, anonKey) : null;
