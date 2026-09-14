import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { nextAvailable, placeTip } from '../lib/tour.js';
import './Tour.css';

const PAD = 8;

/**
 * Rondleiding: dimt het scherm, licht één onderdeel uit en zet er een kort
 * uitlegkaartje naast. Overslaan kan altijd; Escape doet hetzelfde.
 */
export default function Tour({ steps, open, onClose }) {
  const [index, setIndex] = useState(-1);
  const [spot, setSpot] = useState(null);
  const [pos, setPos] = useState(null);
  // Pas schuiven als het kaartje al eens op zijn plek stond: de eerste keer
  // verschijnt het direct, in plaats van vanuit een beginpositie in te vliegen.
  const [placed, setPlaced] = useState(false);
  const tipRef = useRef(null);
  const primaryRef = useRef(null);

  const exists = useCallback((sel) => Boolean(document.querySelector(sel)), []);

  useEffect(() => {
    if (open) setIndex(nextAvailable(steps, -1, 1, exists));
    else { setIndex(-1); setSpot(null); setPos(null); setPlaced(false); }
  }, [open, steps, exists]);

  const step = index >= 0 ? steps[index] : null;
  const nextIndex = step ? nextAvailable(steps, index, 1, exists) : -1;
  const prevIndex = step ? nextAvailable(steps, index, -1, exists) : -1;
  const available = steps.filter((s) => !s.target || exists(s.target));
  const number = step ? available.indexOf(step) + 1 : 0;

  const measure = useCallback(() => {
    if (!step) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const tipBox = tipRef.current?.getBoundingClientRect() ?? { width: 300, height: 160 };
    const tip = { width: tipBox.width, height: tipBox.height };

    if (!step.target) {
      setSpot(null);
      setPos({ top: Math.max(16, (viewport.height - tip.height) / 2), left: (viewport.width - tip.width) / 2, placement: 'midden', arrow: 0 });
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rect = { top: r.top - PAD, bottom: r.bottom + PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
    setSpot(rect);
    setPos(placeTip(rect, tip, viewport));
  }, [step]);

  // Doel in beeld brengen, en meten zodra het scrollen klaar is.
  useLayoutEffect(() => {
    if (!step) return undefined;
    const el = step.target && document.querySelector(step.target);
    const fixed = el && getComputedStyle(el.closest('.tabbar, .appbar') ?? el).position === 'fixed';
    if (el && !fixed) {
      const r = el.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 200) {
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
      }
    }
    measure();
    const t = setTimeout(measure, 380);
    primaryRef.current?.focus();
    return () => clearTimeout(t);
  }, [step, measure]);

  useEffect(() => {
    if (!pos || placed) return undefined;
    const t = setTimeout(() => setPlaced(true), 60);
    return () => clearTimeout(t);
  }, [pos, placed]);

  useEffect(() => {
    if (!step) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose(false);
      if (e.key === 'ArrowRight' && nextIndex >= 0) setIndex(nextIndex);
      if (e.key === 'ArrowLeft' && prevIndex >= 0) setIndex(prevIndex);
    };
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
      document.removeEventListener('keydown', onKey);
    };
  }, [step, measure, nextIndex, prevIndex, onClose]);

  if (!open || !step) return null;

  const last = nextIndex < 0;

  return (
    <div className={`tour${spot ? '' : ' tour--center'}`}>
      {spot && (
        <div className={`tour__spot${placed ? ' tour__spot--placed' : ''}`} aria-hidden="true"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }} />
      )}
      <div ref={tipRef}
        className={`tour__tip tour__tip--${pos?.placement ?? 'midden'}${placed ? ' tour__tip--placed' : ''}`}
        role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body"
        style={{
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          visibility: pos ? 'visible' : 'hidden',
          '--arrow': `${pos?.arrow ?? 0}px`,
        }}>
        <span className="tour__count">{number} van {available.length}</span>
        <h2 id="tour-title" className="tour__title">{step.title}</h2>
        <p id="tour-body" className="tour__body">{step.body}</p>
        <div className="tour__buttons">
          {!last && <button type="button" className="tour__skip" onClick={() => onClose(false)}>Overslaan</button>}
          <span className="tour__nav">
            {prevIndex >= 0 && <button type="button" className="tour__back" onClick={() => setIndex(prevIndex)}>Terug</button>}
            <button ref={primaryRef} type="button" className="tour__next"
              onClick={() => (last ? onClose(true) : setIndex(nextIndex))}>
              {last ? 'Aan de slag' : 'Volgende'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
