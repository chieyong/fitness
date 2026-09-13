import { useEffect, useState } from 'react';

/**
 * Onderaan de sessie: een opmerking bij de hele training, en de knoppen die
 * de sessie afsluiten. Pas als een sessie is afgerond schuift het schema op.
 */
export default function SessionActions({ session, readOnly, onClose, onReopen, onSaveNote }) {
  const [note, setNote] = useState(session.notes ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setNote(session.notes ?? ''); }, [session.id, session.notes]);

  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  if (readOnly) {
    return (
      <div className="actions">
        {session.notes && <p className="actions__note-read">{session.notes}</p>}
        <button type="button" className="actions__secondary" disabled={busy}
          onClick={() => run(onReopen)}>
          Heropenen
        </button>
      </div>
    );
  }

  return (
    <div className="actions">
      <label className="actions__label" htmlFor="session-note">Opmerking bij deze sessie</label>
      <textarea
        id="session-note" className="actions__note" rows={2}
        placeholder="Bijvoorbeeld: het ging net!"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => onSaveNote(note)}
      />

      <div className="actions__buttons">
        <button type="button" className="actions__primary" disabled={busy}
          onClick={() => run(() => onClose('voltooid', note))}>
          Sessie afronden
        </button>
        <button type="button" className="actions__secondary" disabled={busy}
          onClick={() => run(() => onClose('overgeslagen', note))}>
          Overslaan
        </button>
      </div>
    </div>
  );
}
