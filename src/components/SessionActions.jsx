import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * Onderaan de sessie: afronden of overslaan. Opmerkingen horen nu bij een
 * oefening zelf (sterren en toelichting), dus hier geen tekstvak meer.
 * Pas als een sessie is afgerond schuift het schema op.
 */
export default function SessionActions({ session, readOnly, onClose, onReopen }) {
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();

  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  if (readOnly) {
    return (
      <div className="actions">
        {session.notes && <p className="actions__note-read">{session.notes}</p>}
        <div className="actions__buttons">
          <button type="button" className="actions__secondary" disabled={busy}
            onClick={() => run(onReopen)}>
            {t('session.reopen')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="actions">
      <div className="actions__buttons">
        <button type="button" className="actions__primary" disabled={busy}
          onClick={() => run(() => onClose('voltooid', session.notes))}>
          {t('session.finish')}
        </button>
        <button type="button" className="actions__secondary" disabled={busy}
          onClick={() => run(() => onClose('overgeslagen', session.notes))}>
          {t('session.skip')}
        </button>
      </div>
    </div>
  );
}
