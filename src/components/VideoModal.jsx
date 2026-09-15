import { useEffect, useRef } from 'react';
import { embedUrl } from '../lib/youtube.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import './VideoModal.css';

/**
 * Speelt een YouTube-video af in een venster boven de app. Sluiten met de
 * knop, Escape of een tik naast het venster; daarna gaat de focus terug naar
 * waar hij was.
 */
export default function VideoModal({ video, onClose }) {
  const closeRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!video) return undefined;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div className="vmodal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`vmodal__box${video.vertical ? ' vmodal__box--vertical' : ''}`}
        role="dialog" aria-modal="true" aria-label={video.title}>
        <div className="vmodal__head">
          <span className="vmodal__title">{video.title}</span>
          <button ref={closeRef} type="button" className="vmodal__close" onClick={onClose} aria-label={t('video.close')}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="vmodal__frame">
          <iframe
            src={embedUrl(video.id)}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
