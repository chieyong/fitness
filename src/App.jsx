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
          Deze build heeft geen Supabase-sleutels meegekregen.
          {' '}Lokaal: kopieer <code>.env.example</code> naar <code>.env</code> en vul
          {' '}<code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code> in.
          {' '}Op Netlify: zet diezelfde twee als environment variables en draai de
          {' '}deploy opnieuw — Vite leest ze tijdens de build, niet in de browser.
        </p>
      </main>
    );
  }

  return <Today />;
}
