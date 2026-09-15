import Model from 'react-body-highlighter';
import { MUSCLE_STATE_LEVEL, summarizeMuscles } from '../lib/todayMuscles.js';
import { muscleLabel, KNOWN_MUSCLES } from '../lib/muscleLabels.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './TodayBody.css';

/** Kleur per stap: gepland (subtiel), bezig, getraind. Tokens in tokens.css. */
const COLORS = ['var(--today-planned)', 'var(--today-busy)', 'var(--today-done)'];

/** Zoveel namen passen rustig naast het silhouet; de rest als '+10 meer'. */
const MAX_NAMES = 3;

/**
 * Het lichaam van vandaag: welke spiergroepen de training raakt, en welke je al
 * getraind hebt. Kleurt mee zodra je een oefening afvinkt.
 */
export default function TodayBody({ states }) {
  const { t, locale } = useI18n();
  if (states.size === 0) return null;

  const data = [...states.entries()]
    .filter(([m]) => KNOWN_MUSCLES.includes(m))
    .map(([m, s]) => ({ name: muscleLabel(m, locale), muscles: [m], frequency: MUSCLE_STATE_LEVEL[s] }));
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
          <Model key={type} type={type} data={data} bodyColor="var(--body-empty)" highlightedColors={COLORS}
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
        <ul className="todaybody__legend" aria-hidden="true">
          <li><i style={{ background: COLORS[0] }} />{t('muscles.planned')}</li>
          <li><i style={{ background: COLORS[1] }} />{t('muscles.partly')}</li>
          <li><i style={{ background: COLORS[2] }} />{t('muscles.trained')}</li>
        </ul>
      </div>
    </section>
  );
}
