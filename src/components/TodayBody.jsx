import Model from 'react-body-highlighter';
import { summarizeMuscles } from '../lib/todayMuscles.js';
import { muscleLabel, KNOWN_MUSCLES } from '../lib/muscleLabels.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './TodayBody.css';

/** Zoveel namen passen rustig naast het silhouet; de rest als '+10 meer'. */
const MAX_NAMES = 3;

/**
 * Twee verlopen, allebei doorlopend:
 * - nog niets gedaan: amber, sterker naarmate de spier vandaag meer nadruk krijgt
 *   (primaire spieren van meerdere oefeningen het sterkst)
 * - begonnen: van lichtblauw naar blauw, naar het deel van de gewogen sets dat af is
 * Kleuren komen uit tokens; color-mix houdt ze thema-bewust.
 */
const FOCUS_MIN = 12;
export const focusColor = (focus) =>
  `color-mix(in oklab, var(--today-planned) ${Math.round(FOCUS_MIN + (100 - FOCUS_MIN) * focus)}%, var(--body-empty))`;
export const progressColor = (fraction) =>
  `color-mix(in oklab, var(--today-done) ${Math.round(fraction * 100)}%, var(--today-busy))`;

export default function TodayBody({ states }) {
  const { t, locale } = useI18n();
  if (states.size === 0) return null;

  // react-body-highlighter kiest een kleur per 'frequency'; elke spier krijgt
  // daarom zijn eigen plek in de kleurenlijst.
  const shown = [...states.entries()].filter(([m]) => KNOWN_MUSCLES.includes(m));
  const colors = shown.map(([, s]) => (s.done > 0 ? progressColor(s.fraction) : focusColor(s.focus)));
  const data = shown.map(([m], i) => ({ name: muscleLabel(m, locale), muscles: [m], frequency: i + 1 }));

  const { total, done, remaining } = summarizeMuscles(states);
  const allDone = total > 0 && done === total;
  const list = (ms) => {
    const names = ms.slice(0, MAX_NAMES).map((m) => muscleLabel(m, locale)).join(', ');
    return ms.length > MAX_NAMES ? `${names} ${t('muscles.more', { count: ms.length - MAX_NAMES })}` : names;
  };

  return (
    <section className={`todaybody card${allDone ? ' todaybody--done' : ''}`} aria-labelledby="todaybody-title">
      <div className="todaybody__figures" aria-hidden="true">
        {['anterior', 'posterior'].map((type) => (
          <Model key={type} type={type} data={data} bodyColor="var(--body-empty)" highlightedColors={colors}
            style={{ width: '100%' }} svgStyle={{ width: '100%', height: 'auto' }} />
        ))}
      </div>

      <div className="todaybody__text">
        <h2 id="todaybody-title" className="todaybody__title">{t('muscles.title')}</h2>
        <p className="todaybody__count">
          <span className="todaybody__num">{done}</span>
          <span className="todaybody__of">{t('muscles.of', { total })}</span>
        </p>
        <div className="todaybody__bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
          aria-label={t('muscles.progress', { done, total })}>
          <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        <p className="todaybody__rest">
          {allDone ? t('muscles.allDone') : t('muscles.remaining', { list: list(remaining) })}
        </p>
        <dl className="todaybody__legend" aria-hidden="true">
          <dt>{t('muscles.legendFocus')}</dt>
          <dd><i style={{ background: `linear-gradient(90deg, ${focusColor(0)}, ${focusColor(1)})` }} /></dd>
          <dt>{t('muscles.legendProgress')}</dt>
          <dd><i style={{ background: `linear-gradient(90deg, ${progressColor(0)}, ${progressColor(1)})` }} /></dd>
        </dl>
      </div>
    </section>
  );
}
