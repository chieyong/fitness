/**
 * Vertalen, puur: geen React, zodat het testbaar is. Teksten staan per scherm in
 * src/i18n/messages/<gebied>.js als { en: {...}, nl: {...} }.
 *
 * Een tekst is een string met {invulvelden}, of een object met meervoudsvormen
 * ({ one, other }) dat op `count` wordt gekozen.
 */

export const LOCALES = ['en', 'nl'];
export const DEFAULT_LOCALE = 'en';
export const LOCALE_KEY = 'repz.locale';

export function normalizeLocale(value) {
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function getStoredLocale(storage) {
  try {
    return normalizeLocale(storage?.getItem(LOCALE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function storeLocale(locale, storage) {
  try { storage?.setItem(LOCALE_KEY, normalizeLocale(locale)); } catch { /* opslag geblokkeerd */ }
}

export function interpolate(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (match, name) => (vars && vars[name] != null ? String(vars[name]) : match));
}

/** Voegt de tekstlijsten van alle gebieden samen tot één lijst per taal. */
export function mergeMessages(...areas) {
  const out = Object.fromEntries(LOCALES.map((l) => [l, {}]));
  for (const area of areas) {
    for (const l of LOCALES) Object.assign(out[l], area?.[l] ?? {});
  }
  return out;
}

/**
 * Een vertaalfunctie voor één taal. Ontbreekt een tekst in die taal, dan de
 * standaardtaal; ontbreekt hij helemaal, dan de sleutel zelf (zichtbaar fout).
 */
export function createTranslator(messages, locale) {
  const lang = normalizeLocale(locale);
  const primary = messages[lang] ?? {};
  const fallback = messages[DEFAULT_LOCALE] ?? {};
  const plural = new Intl.PluralRules(lang);
  return (key, vars) => {
    let entry = primary[key] ?? fallback[key];
    if (entry == null) return key;
    if (typeof entry === 'object') {
      entry = entry[plural.select(Number(vars?.count ?? 0))] ?? entry.other;
    }
    return interpolate(entry, vars);
  };
}

/** De invulvelden in een tekst of meervoudsobject, gesorteerd; voor de volledigheidstest. */
export function placeholders(entry) {
  const texts = typeof entry === 'object' ? Object.values(entry) : [entry];
  const names = new Set();
  for (const t of texts) for (const m of String(t).matchAll(/\{(\w+)\}/g)) names.add(m[1]);
  return [...names].sort();
}
