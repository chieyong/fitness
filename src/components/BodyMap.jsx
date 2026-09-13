import { FRONT, BACK, VIEWBOX } from './bodyRegions.js';
import './BodyMap.css';

/**
 * Sequentiële schaal: één tint, licht naar donker. De lichtheid daalt
 * monotoon, dus de volgorde is af te lezen zonder de kleuren te kennen.
 */
const RAMP = ['#DCE9FA', '#B3D1F5', '#7FB0EC', '#3F8AE0', '#0062C4'];
const EMPTY = '#E8E8ED';

export function rampColor(intensity) {
  if (intensity == null || intensity <= 0) return EMPTY;
  const i = Math.min(RAMP.length - 1, Math.floor(intensity * RAMP.length));
  return RAMP[i];
}

export { RAMP, EMPTY };

/** Voor- en achterkant naast elkaar; klik een spiergroep om die te kiezen. */
export default function BodyMap({ intensity, selected, onSelect, valueLabel }) {
  return (
    <div className="body">
      <Figure parts={FRONT} label="Voorkant"
        intensity={intensity} selected={selected} onSelect={onSelect} valueLabel={valueLabel} />
      <Figure parts={BACK} label="Achterkant"
        intensity={intensity} selected={selected} onSelect={onSelect} valueLabel={valueLabel} />
    </div>
  );
}

function Figure({ parts, label, intensity, selected, onSelect, valueLabel }) {
  return (
    <figure className="body__figure">
      <svg viewBox={VIEWBOX} className="body__svg" role="group" aria-label={label}>
        {parts.map((part) => {
          const muscle = part.muscle;
          const value = muscle ? intensity.get(muscle) ?? 0 : null;
          const isSelected = muscle != null && muscle === selected;

          const common = {
            className: [
              'region',
              muscle ? 'region--active' : 'region--neutral',
              isSelected ? 'region--selected' : '',
            ].filter(Boolean).join(' '),
            fill: muscle ? rampColor(value) : EMPTY,
            ...(muscle ? {
              tabIndex: 0,
              role: 'button',
              'aria-pressed': isSelected,
              'aria-label': `${muscle}: ${valueLabel(muscle)}`,
              onClick: () => onSelect(isSelected ? null : muscle),
              onKeyDown: (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(isSelected ? null : muscle);
                }
              },
            } : {}),
          };

          return part.shape.r != null && part.shape.cx == null
            ? <rect key={part.id} {...common}
                x={part.shape.x} y={part.shape.y}
                width={part.shape.w} height={part.shape.h}
                rx={part.shape.r} ry={part.shape.r} />
            : <circle key={part.id} {...common}
                cx={part.shape.cx} cy={part.shape.cy} r={part.shape.r} />;
        })}
      </svg>
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
