/** Parsen en tonen van getalinvoer. Puur. */

/**
 * '22,5' en '22.5' leveren allebei 22.5 -- in de gym typ je op een telefoon
 * het teken dat je toetsenbord aanbiedt, niet het teken dat de database wil.
 * Lege of onzinnige invoer levert null.
 */
export function parseDecimal(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(',', '.');
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Hele getallen voor reps en seconden; 10.6 wordt 11. */
export function parseWhole(value) {
  const n = parseDecimal(value);
  return n == null ? null : Math.round(n);
}

/** Toont een getal zonder overbodige nullen: 20.30 -> '20.3', 14 -> '14'. */
export function formatNumber(value) {
  if (value == null) return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}
