/**
 * YouTube-links bij een oefening: herkennen, controleren en afspeelbaar maken.
 * Puur, zodat elke vorm van link te testen is.
 */

export const MAX_VIDEOS = 3;

const ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Haalt de video-id uit een YouTube-link. Kent de gewone link, youtu.be,
 * Shorts (staand beeld) en embed-links, met of zonder https en extra
 * parameters. Geeft null bij alles wat geen YouTube-video is.
 */
export function parseYouTube(input) {
  const text = String(input ?? '').trim();
  if (!text) return null;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  let id = null;
  let vertical = false;

  if (host === 'youtu.be') {
    id = parts[0];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (parts[0] === 'shorts') { id = parts[1]; vertical = true; }
    else if (parts[0] === 'embed' || parts[0] === 'live') id = parts[1];
  }

  return id && ID.test(id) ? { id, vertical } : null;
}

/** Afspelen zonder tracking-cookies, en direct starten in de pop-up. */
export function embedUrl(id) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
}

/** Eén vaste vorm om op te slaan; Shorts blijven Shorts, zodat staand beeld bekend blijft. */
export function canonicalUrl({ id, vertical }) {
  return vertical ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
}

/** Lege velden tellen niet mee. */
const filled = (urls) => (urls ?? []).map((u) => String(u ?? '').trim()).filter(Boolean);

/** Foutmeldingen voor een lijst links, in het Nederlands. */
export function validateVideoUrls(urls) {
  const list = filled(urls);
  const errors = [];
  if (list.length > MAX_VIDEOS) errors.push(`Maximaal ${MAX_VIDEOS} video's per oefening.`);
  const seen = new Set();
  list.forEach((u, i) => {
    const parsed = parseYouTube(u);
    if (!parsed) {
      errors.push(`Link ${i + 1} is geen geldige YouTube-link.`);
    } else if (seen.has(parsed.id)) {
      errors.push('Dezelfde video staat er twee keer in.');
    } else {
      seen.add(parsed.id);
    }
  });
  return errors;
}

/** De lijst zoals hij wordt opgeslagen: geldig, uniek, canoniek, of null als leeg. */
export function cleanVideoUrls(urls) {
  const out = [];
  const seen = new Set();
  for (const u of filled(urls)) {
    const parsed = parseYouTube(u);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    out.push(canonicalUrl(parsed));
  }
  return out.length ? out.slice(0, MAX_VIDEOS) : null;
}
