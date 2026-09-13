import { isConfigured } from './lib/supabase.js';
import Today from './screens/Today.jsx';

export default function App() {
  if (!isConfigured) {
    return (
      <main className="page">
        <h1 style={{ fontSize: 'var(--text-display)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          Nog niet verbonden
        </h1>
        <p style={{ color: 'var(--ink-secondary)', marginTop: 'var(--space-3)', maxWidth: '34em' }}>
          Kopieer <code>.env.example</code> naar <code>.env</code> en vul de Supabase-URL en
          anon-key van je project in. Draai daarna <code>supabase/schema.sql</code> en{' '}
          <code>supabase/seed.sql</code> in de SQL-editor.
        </p>
      </main>
    );
  }

  return <Today />;
}
