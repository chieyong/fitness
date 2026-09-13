/** Schaalrekenwerk voor de grafieken. Puur, zodat het te testen is. */

/**
 * Een domein met ronde grenzen rond de waarden, plus wat lucht.
 * Lijngrafieken beginnen hier bewust niet bij nul: het verschil tussen 59 en
 * 79 kg is de informatie, en die verdwijnt als de as bij nul begint. Bij staven
 * zou dat misleidend zijn, bij een lijn is het de gebruikelijke keuze -- de
 * astekst vertelt waar de schaal begint.
 */
export function niceDomain(values, { padRatio = 0.15 } = {}) {
  const nums = values.filter((v) => v != null && Number.isFinite(v));
  if (nums.length === 0) return { min: 0, max: 1, step: 1 };

  let min = Math.min(...nums);
  let max = Math.max(...nums);

  if (min === max) {
    // Eén waarde, of een vlakke reeks: zet er symmetrisch ruimte omheen.
    const pad = Math.max(Math.abs(min) * 0.1, 1);
    min -= pad;
    max += pad;
  } else {
    const pad = (max - min) * padRatio;
    min -= pad;
    max += pad;
  }

  const step = niceStep((max - min) / 4);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;

  return { min: lo, max: hi, step };
}

/** Rondt een stapgrootte af op 1, 2, 2.5 of 5 maal een macht van tien. */
export function niceStep(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / power;
  const snapped = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return snapped * power;
}

/** Tickwaarden binnen een domein, inclusief de grenzen. */
export function ticksFor({ min, max, step }) {
  const out = [];
  // Kleine marge tegen afrondingsfouten bij stappen als 2.5.
  for (let v = min; v <= max + step * 1e-9; v += step) {
    out.push(Number(v.toFixed(6)));
  }
  return out;
}

/** Plaats een waarde op een as van `length` pixels (y telt van boven af). */
export function project(value, { min, max }, length, invert = false) {
  if (max === min) return length / 2;
  const t = (value - min) / (max - min);
  return invert ? length - t * length : t * length;
}
