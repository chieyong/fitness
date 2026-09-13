import { formatDateShort } from '../lib/schedule.js';
import './MiniBars.css';

const MAX_BARS = 8;
const BAR = 6;
const GAP = 3;
const HEIGHT = 28;

/**
 * Eén staafje per training, oplopend in de tijd. Staven beginnen bij nul --
 * dat is bij staven verplicht, anders liegt de hoogte. Het verschil tussen
 * 59 en 79 kg leest daardoor subtiel; het exacte verschil staat ernaast als
 * getal, en de volledige grafiek zit een tik verderop.
 */
export default function MiniBars({ points, formatValue }) {
  const shown = points.slice(-MAX_BARS);
  if (shown.length === 0) return <span className="minibars minibars--empty">geen data</span>;

  const max = Math.max(...shown.map((p) => p.value));
  const width = shown.length * BAR + (shown.length - 1) * GAP;

  return (
    <svg className="minibars" width={width} height={HEIGHT}
      role="img"
      aria-label={shown.map((p) => `${formatDateShort(p.date)}: ${formatValue(p.value)}`).join(', ')}>
      {shown.map((p, i) => {
        const h = max > 0 ? Math.max(2, (p.value / max) * HEIGHT) : 2;
        const isLast = i === shown.length - 1;
        return (
          <rect key={p.date}
            className={isLast ? 'minibars__bar minibars__bar--last' : 'minibars__bar'}
            x={i * (BAR + GAP)} y={HEIGHT - h}
            width={BAR} height={h} rx={2} ry={2} />
        );
      })}
    </svg>
  );
}
