import { formatDateShort } from '../lib/schedule.js';
import './MiniLine.css';

const MAX_POINTS = 12;
const WIDTH = 64;
const HEIGHT = 26;
const PAD = 4;

/**
 * Sparkline: één punt per training. Anders dan bij staven mag de as hier
 * afgekapt worden -- de vorm van het verloop is wat telt, niet de absolute
 * hoogte. Daardoor is een stap van 12 naar 14 kg wél zichtbaar. Het getal
 * ernaast draagt de precieze waarde.
 */
export default function MiniLine({ points, formatValue }) {
  const shown = points.slice(-MAX_POINTS);
  if (shown.length === 0) {
    return <span className="miniline miniline--empty">geen data</span>;
  }

  const values = shown.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i) => (shown.length === 1
    ? WIDTH / 2
    : PAD + (i / (shown.length - 1)) * (WIDTH - PAD * 2));
  const y = (v) => HEIGHT - PAD - ((v - min) / span) * (HEIGHT - PAD * 2);

  const d = shown.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const lastIndex = shown.length - 1;

  return (
    <svg className="miniline" width={WIDTH} height={HEIGHT}
      role="img"
      aria-label={shown.map((p) => `${formatDateShort(p.date)}: ${formatValue(p.value)}`).join(', ')}>
      {shown.length > 1 && <path className="miniline__path" d={d} />}
      <circle className="miniline__end" cx={x(lastIndex)} cy={y(shown[lastIndex].value)} r={3} />
    </svg>
  );
}
