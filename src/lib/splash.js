/**
 * Het laadscherm staat in index.html, zodat het er is vóór de app geladen is.
 * Hier alleen het wegnemen: niet eerder dan na een korte minimumtijd, zodat
 * het niet als een flits voorbij schiet op een snelle verbinding.
 */

// Lang genoeg om de hele animatie te zien: inspringen, letters, een paar keer pompen.
export const MIN_VISIBLE = 2400;
const FADE = 400;

/** Hoe lang het laadscherm nog moet blijven. Puur, dus testbaar. */
export function splashDelay(now, start, min = MIN_VISIBLE) {
  return Math.max(0, min - (now - start));
}

export function hideSplash() {
  const el = document.getElementById('splash');
  if (!el || el.dataset.hiding) return;
  el.dataset.hiding = '1';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = reduced ? 0 : splashDelay(performance.now(), window.__splashStart ?? 0);

  setTimeout(() => {
    el.classList.add('splash--done');
    setTimeout(() => {
      el.remove();
      window.dispatchEvent(new Event('repz:splash-weg'));
    }, reduced ? 0 : FADE);
  }, wait);
}

/** Wacht tot het laadscherm echt weg is; direct klaar als er geen (meer) is. */
export function whenSplashGone() {
  return new Promise((resolve) => {
    if (!document.getElementById('splash')) { resolve(); return; }
    window.addEventListener('repz:splash-weg', () => resolve(), { once: true });
  });
}
