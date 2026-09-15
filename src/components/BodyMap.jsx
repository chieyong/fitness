import Model from 'react-body-highlighter';
import { muscleLabel } from '../lib/muscleLabels.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './BodyMap.css';

/**
 * Doorlopende schaal tussen de laagste en hoogste stap uit tokens.css (één
 * tint, monotoon in lichtheid, per thema gecontroleerd). color-mix in oklab
 * geeft een gelijkmatig verloop en blijft thema-bewust, want de component zet
 * de kleur als inline fill en daarin werkt var() gewoon.
 */
export const LOW = 'var(--ramp-start)';
export const HIGH = 'var(--ramp-5)';
export const EMPTY = 'var(--body-empty)';

export const rampColor = (intensity) =>
  `color-mix(in oklab, ${HIGH} ${Math.round(Math.max(0, Math.min(1, intensity)) * 100)}%, ${LOW})`;

/**
 * Het silhouet komt van react-body-highlighter. Die kiest een kleur per
 * `frequency`; elke spier krijgt daarom zijn eigen plek in de kleurenlijst, met
 * precies de kleur die bij zijn intensiteit hoort.
 */
export default function BodyMap({ intensity, selected, onSelect, valueLabel }) {
  const { t, locale } = useI18n();
  const shown = [...intensity.entries()].filter(([, value]) => value > 0);
  const colors = shown.map(([, value]) => rampColor(value));
  const data = shown.map(([muscle], i) => ({ name: muscleLabel(muscle, locale), muscles: [muscle], frequency: i + 1 }));

  const handle = ({ muscle }) => onSelect(muscle === selected ? null : muscle);

  return (
    <div className="body">
      <Figure type="anterior" label={t('progress.front')} data={data} colors={colors} onClick={handle} />
      <Figure type="posterior" label={t('progress.backSide')} data={data} colors={colors} onClick={handle} />
      <p className="body__sr">
        {[...intensity.keys()].map((m) => `${muscleLabel(m, locale)}: ${valueLabel(m)}`).join('. ')}
      </p>
    </div>
  );
}

function Figure({ type, label, data, colors, onClick }) {
  return (
    <figure className="body__figure">
      <Model
        type={type}
        data={data}
        onClick={onClick}
        bodyColor={EMPTY}
        highlightedColors={colors}
        style={{ width: '100%' }}
        svgStyle={{ width: '100%', height: 'auto' }}
      />
      <figcaption className="body__caption">{label}</figcaption>
    </figure>
  );
}

/** Schaallegenda: een doorlopend verloop van weinig naar de drukste spiergroep. */
export function RampLegend({ maxLabel }) {
  const { t } = useI18n();
  return (
    <div className="ramp">
      <span className="ramp__end">{t('progress.none')}</span>
      <span className="ramp__bar" aria-hidden="true" style={{ background: `linear-gradient(90deg, ${EMPTY} 0 8%, ${LOW} 8%, ${HIGH})` }} />
      <span className="ramp__end">{maxLabel}</span>
    </div>
  );
}
