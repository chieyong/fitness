/**
 * Thema-keuze: volg het systeem, of kies zelf licht of donker.
 * De kleuren zelf staan in tokens.css; hier wordt alleen gekozen welke reeks
 * geldt, via data-theme op <html>. Zonder attribuut beslist het systeem.
 */

export const THEMES = ['system', 'light', 'dark'];
export const THEME_LABELS = { system: 'Systeem', light: 'Licht', dark: 'Donker' };

const KEY = 'repz.theme';

export function normalizeTheme(value) {
  return THEMES.includes(value) ? value : 'system';
}

/** Systeem, dan licht, dan donker, en weer terug. */
export function nextTheme(pref) {
  return THEMES[(THEMES.indexOf(normalizeTheme(pref)) + 1) % THEMES.length];
}

/** Wat er daadwerkelijk getoond wordt. */
export function effectiveTheme(pref, systemDark) {
  const p = normalizeTheme(pref);
  if (p === 'system') return systemDark ? 'dark' : 'light';
  return p;
}

export function getThemePreference(storage = globalThis.localStorage) {
  try {
    return normalizeTheme(storage?.getItem(KEY));
  } catch {
    return 'system';
  }
}

/** Bewaart de keuze en past hem direct toe. Geeft de genormaliseerde keuze terug. */
export function setThemePreference(pref, {
  storage = globalThis.localStorage,
  root = globalThis.document?.documentElement,
} = {}) {
  const p = normalizeTheme(pref);
  try {
    if (p === 'system') storage?.removeItem(KEY);
    else storage?.setItem(KEY, p);
  } catch {
    // Privémodus of geblokkeerde opslag: de keuze geldt dan alleen voor nu.
  }
  if (root) {
    if (p === 'system') delete root.dataset.theme;
    else root.dataset.theme = p;
  }
  syncThemeColor(p, root);
  return p;
}

/**
 * De browserbalk op de telefoon kleurt mee. Bij een eigen keuze krijgen beide
 * theme-color-tags de achtergrond van dat thema; bij Systeem hun eigen waarde terug.
 */
function syncThemeColor(pref, root) {
  const doc = globalThis.document;
  if (!doc || !root) return;
  const metas = doc.querySelectorAll('meta[name="theme-color"]');
  const bg = globalThis.getComputedStyle?.(root).getPropertyValue('--bg').trim();
  metas.forEach((meta) => {
    if (!meta.dataset.original) meta.dataset.original = meta.getAttribute('content');
    meta.setAttribute('content', pref === 'system' || !bg ? meta.dataset.original : bg);
  });
}
