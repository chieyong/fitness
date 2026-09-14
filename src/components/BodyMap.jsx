import Model from 'react-body-highlighter';
import { intensityBucket } from '../lib/muscles.js';
import { muscleLabel } from '../lib/muscleLabels.js';
import './BodyMap.css';

/**
 * Sequentiële schaal: één tint, monotoon in lichtheid, zodat de volgorde af te
 * lezen is zonder de kleuren te kennen. De waarden staan als tokens in
 * tokens.css, met een eigen reeks voor donker. De component zet de kleur als
 * inline fill, en daarin werkt var() gewoon: het silhouet wisselt dus mee met
 * het thema zonder dat hier iets hoeft te luisteren.
 */
export const RAMP = [1, 2, 3, 4, 5].map((n) => `var(--ramp-${n})`);
export const EMPTY = 'var(--body-empty)';

/**
 * Het silhouet komt van react-body-highlighter: echte spierregio's in plaats
 * van een eigen abstractie. De aggregatie blijft van ons -- de component kleurt
 * op `frequency`, en daar voeren we de stap van onze eigen schaal in.
 */
export default function BodyMap({ intensity, selected, onSelect, valueLabel }) {
  const data = [...intensity.entries()]
    .map(([muscle, value]) => ({
      name: muscleLabel(muscle),
      muscles: [muscle],
      frequency: intensityBucket(value, RAMP.length),
    }))
    .filter((d) => d.frequency > 0);

  const handle = ({ muscle }) => onSelect(muscle === selected ? null : muscle);

  return (
    <div className="body">
      <Figure type="anterior" label="Voorkant" data={data} onClick={handle} />
      <Figure type="posterior" label="Achterkant" data={data} onClick={handle} />
      <p className="body__sr">
        {[...intensity.keys()].map((m) => `${muscleLabel(m)}: ${valueLabel(m)}`).join('. ')}
      </p>
    </div>
  );
}

function Figure({ type, label, data, onClick }) {
  return (
    <figure className="body__figure">
      <Model
        type={type}
        data={data}
        onClick={onClick}
        bodyColor={EMPTY}
        highlightedColors={RAMP}
        style={{ width: '100%' }}
        svgStyle={{ width: '100%', height: 'auto' }}
      />
      <figcaption className="body__caption">{label}</figcaption>
    </figure>
  );
}

/** Schaallegenda: zonder deze is een kleurverloop niet af te lezen. */
export function RampLegend({ maxLabel }) {
  return (
    <div className="ramp">
      <span className="ramp__end">niets</span>
      <span className="ramp__bar" aria-hidden="true">
        {RAMP.map((c) => <i key={c} style={{ background: c }} />)}
      </span>
      <span className="ramp__end">{maxLabel}</span>
    </div>
  );
}
