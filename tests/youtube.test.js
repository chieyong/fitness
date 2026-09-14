import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseYouTube, embedUrl, canonicalUrl, validateVideoUrls, cleanVideoUrls, MAX_VIDEOS,
} from '../src/lib/youtube.js';

const ID = 'abcDEF12_-3';

test('herkent de gangbare vormen van een YouTube-link', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}&t=42s`,
    `youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=deeltracking`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `  https://youtu.be/${ID}  `,
  ]) {
    assert.deepEqual(parseYouTube(url), { id: ID, vertical: false }, url);
  }
});

test('Shorts worden als staand beeld herkend', () => {
  assert.deepEqual(parseYouTube(`https://www.youtube.com/shorts/${ID}`), { id: ID, vertical: true });
});

test('alles wat geen YouTube-video is, levert null', () => {
  for (const url of [
    '', null, 'geen link', 'https://vimeo.com/123456789',
    'https://www.youtube.com/@kanaal', 'https://www.youtube.com/watch?v=kort',
    'https://evilyoutube.com/watch?v=' + ID, 'https://youtube.com.evil.nl/watch?v=' + ID,
  ]) {
    assert.equal(parseYouTube(url), null, String(url));
  }
});

test('afspelen gaat via youtube-nocookie en start direct', () => {
  assert.equal(embedUrl(ID), `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0&playsinline=1`);
  assert.equal(canonicalUrl({ id: ID, vertical: true }), `https://www.youtube.com/shorts/${ID}`);
});

test('validatie: maximaal drie, geldig en zonder dubbele video', () => {
  assert.deepEqual(validateVideoUrls([`https://youtu.be/${ID}`, '', null]), []);
  assert.equal(validateVideoUrls(['onzin'])[0], 'Link 1 is geen geldige YouTube-link.');
  assert.ok(validateVideoUrls([`https://youtu.be/${ID}`, `https://www.youtube.com/watch?v=${ID}`])
    .includes('Dezelfde video staat er twee keer in.'));
  const four = ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc', 'ddddddddddd'].map((id) => `https://youtu.be/${id}`);
  assert.ok(validateVideoUrls(four).includes(`Maximaal ${MAX_VIDEOS} video's per oefening.`));
});

test('opslaan: canoniek, uniek, zonder lege velden, en null als er niets over is', () => {
  assert.deepEqual(cleanVideoUrls([` https://youtu.be/${ID}?t=3 `, '', `https://www.youtube.com/watch?v=${ID}`]),
    [`https://www.youtube.com/watch?v=${ID}`]);
  assert.equal(cleanVideoUrls(['', '  ']), null);
  assert.equal(cleanVideoUrls(null), null);
});
