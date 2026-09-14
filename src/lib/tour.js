/**
 * De rondleiding voor nieuwe gebruikers: onthouden of hij gezien is, bepalen welke
 * stap er kan (het onderdeel moet bestaan), en waar het uitlegkaartje komt.
 * Puur, zodat de plaatsing ook op de randen van het scherm te testen is.
 */

export const TOUR_KEY = 'repz.tour.v1';

/** Geblokkeerde opslag telt als gezien: liever geen uitleg dan hem bij elk bezoek. */
export function hasSeenTour(storage) {
  try {
    return storage?.getItem(TOUR_KEY) === 'klaar';
  } catch {
    return true;
  }
}

export function markTourSeen(storage) {
  try { storage?.setItem(TOUR_KEY, 'klaar'); } catch { /* niets aan te doen */ }
}

/**
 * De eerstvolgende stap in `direction` (+1 of -1) die kan: zonder doel, of met een
 * doel dat op het scherm staat. -1 als er geen is.
 */
export function nextAvailable(steps, from, direction, exists) {
  for (let i = from + direction; i >= 0 && i < steps.length; i += direction) {
    if (!steps[i].target || exists(steps[i].target)) return i;
  }
  return -1;
}

/**
 * Plaats het kaartje onder het doel, of erboven als daar geen ruimte is.
 * Horizontaal gecentreerd, maar altijd binnen beeld; het pijltje wijst naar het doel.
 */
export function placeTip(rect, tip, viewport, { gap = 14, margin = 16 } = {}) {
  const fitsBelow = rect.bottom + gap + tip.height <= viewport.height - margin;
  const fitsAbove = rect.top - gap - tip.height >= margin;
  const below = fitsBelow || !fitsAbove;

  const rawTop = below ? rect.bottom + gap : rect.top - gap - tip.height;
  const top = Math.min(Math.max(margin, rawTop), viewport.height - margin - tip.height);

  const centered = rect.left + rect.width / 2 - tip.width / 2;
  const left = Math.min(Math.max(margin, centered), viewport.width - margin - tip.width);

  const arrow = Math.min(Math.max(18, rect.left + rect.width / 2 - left), tip.width - 18);
  return { top, left, placement: below ? 'onder' : 'boven', arrow };
}
