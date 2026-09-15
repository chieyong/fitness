import { useLayoutEffect, useRef, useState } from 'react';
import { niceDomain, ticksFor, project } from '../lib/chart.js';
import { formatDateShort } from '../lib/schedule.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './LineChart.css';

const PAD = { top: 16, right: 16, bottom: 26, left: 40 };
const HEIGHT = 170;

/**
 * Breedte van de container volgen, zodat de tekst niet meeschaalt met de SVG.
 * Eerst direct meten, vóór het tekenen: wachten op de ResizeObserver liet de
 * grafiek even leeg staan, en in sommige omgevingen bleef dat event uit.
 */
function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/**
 * Eén reeks over de tijd. Bewust één kleur en geen legenda: de titel zegt al
 * wat er staat, en een legenda met één hokje herhaalt dat alleen maar.
 */
export default function LineChart({ points, title, formatValue, emptyLabel }) {
  const boxRef = useRef(null);
  const width = useWidth(boxRef);
  const [active, setActive] = useState(null);
  const { t, locale } = useI18n();

  const values = points.map((p) => p.value);
  const domain = niceDomain(values);
  const plotW = Math.max(width - PAD.left - PAD.right, 10);
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const xAt = (i) => (points.length === 1
    ? plotW / 2
    : (i / (points.length - 1)) * plotW);
  const yAt = (v) => project(v, domain, plotH, true);

  const coords = points.map((p, i) => ({ ...p, cx: xAt(i), cy: yAt(p.value), index: i }));
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.cx} ${c.cy}`).join(' ');
  const last = coords[coords.length - 1];

  const pick = (clientX) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || coords.length === 0) return;
    const x = clientX - box.left - PAD.left;
    const nearest = coords.reduce((a, b) => (Math.abs(b.cx - x) < Math.abs(a.cx - x) ? b : a));
    setActive(nearest.index);
  };

  if (points.length === 0) {
    return (
      <figure className="chart">
        <figcaption className="chart__title">{title}</figcaption>
        <p className="chart__empty">{emptyLabel}</p>
      </figure>
    );
  }

  const shown = active != null ? coords[active] : null;

  return (
    <figure className="chart">
      <figcaption className="chart__title">{title}</figcaption>

      <div
        className="chart__box" ref={boxRef}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img"
            aria-label={t('exercise.chartAria', { title, count: points.length, first: formatValue(points[0].value), last: formatValue(last.value) })}>
            <g transform={`translate(${PAD.left} ${PAD.top})`}>
              {ticksFor(domain).map((t) => (
                <g key={t}>
                  <line className="chart__grid" x1={0} x2={plotW} y1={yAt(t)} y2={yAt(t)} />
                  <text className="chart__tick" x={-8} y={yAt(t)} dy="0.32em" textAnchor="end">
                    {t}
                  </text>
                </g>
              ))}

              {shown && (
                <line className="chart__crosshair"
                  x1={shown.cx} x2={shown.cx} y1={0} y2={plotH} />
              )}

              <path className="chart__line" d={path} />

              {coords.map((c) => (
                <circle key={c.index}
                  className={`chart__dot${active === c.index ? ' chart__dot--active' : ''}`}
                  cx={c.cx} cy={c.cy} r={active === c.index ? 6 : 4} />
              ))}

              {/* Labels alleen bij het laatste punt: een getal bij elk punt leest niemand. */}
              <text className="chart__end" x={last.cx} y={last.cy - 12} textAnchor="end">
                {formatValue(last.value)}
              </text>

              {coords.map((c, i) => (
                (i === 0 || i === coords.length - 1) && (
                  <text key={`x${c.index}`} className="chart__tick"
                    x={c.cx} y={plotH + 18}
                    textAnchor={i === 0 ? 'start' : 'end'}>
                    {formatDateShort(c.date, locale)}
                  </text>
                )
              ))}

              {/* Ruime, onzichtbare trefvlakken -- een punt van 8px raak je niet. */}
              {coords.map((c) => (
                <rect key={`hit${c.index}`} className="chart__hit"
                  x={c.cx - 16} y={-PAD.top} width={32} height={HEIGHT}
                  tabIndex={0} role="button"
                  aria-label={`${formatDateShort(c.date, locale)}: ${formatValue(c.value)}`}
                  onFocus={() => setActive(c.index)}
                  onBlur={() => setActive(null)} />
              ))}
            </g>
          </svg>
        )}

        {shown && (
          <div className="tip" style={{
            left: Math.min(Math.max(shown.cx + PAD.left, 60), Math.max(width - 60, 60)),
            top: shown.cy + PAD.top - 8,
          }}>
            <span className="tip__value">{formatValue(shown.value)}</span>
            <span className="tip__date">{formatDateShort(shown.date, locale)}</span>
          </div>
        )}
      </div>
    </figure>
  );
}
