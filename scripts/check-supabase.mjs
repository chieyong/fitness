/**
 * Controleert of .env klopt, of het schema is aangemaakt en of de seed erin zit.
 * Draaien met: npm run check
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m, hint) => {
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
  if (hint) console.log(`    ${hint}`);
};

let env;
try {
  env = Object.fromEntries(
    readFileSync(new URL('../.env', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
} catch {
  bad('Geen .env gevonden', 'Draai: cp .env.example .env — en vul de twee waarden in.');
  process.exit(1);
}

const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
// Na migratie 003 ziet de anon-sleutel niets meer; beheer gaat via service-role.
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const key = serviceKey || anonKey;

console.log('\nEnv');
if (!url || url.includes('jouwproject')) {
  bad('VITE_SUPABASE_URL ontbreekt of is nog de voorbeeldwaarde');
  process.exit(1);
}
if (!anonKey || anonKey === 'eyJ...') {
  bad('VITE_SUPABASE_ANON_KEY ontbreekt of is nog de voorbeeldwaarde');
  process.exit(1);
}
ok(`URL ${url}`);
ok(`anon key ${anonKey.slice(0, 8)}…${anonKey.slice(-4)}`);
if (serviceKey) ok('service-role-sleutel gevonden: controle loopt langs de toegangsregels heen');
else console.log('  - geen SUPABASE_SERVICE_ROLE_KEY: na migratie 003 ziet deze controle geen rijen');

const supabase = createClient(url, key);

console.log('\nTabellen');
const tables = ['exercises', 'workout_templates', 'template_exercises', 'sessions', 'exercise_logs'];
let schemaOk = true;
for (const table of tables) {
  const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    schemaOk = false;
    bad(`${table} — ${error.message}`);
  } else {
    ok(`${table} (${count} rijen)`);
  }
}

if (!schemaOk) {
  console.log('\n  Draai supabase/schema.sql in de SQL-editor van je project.\n');
  process.exit(1);
}

console.log('\nSeed');
const { data: templates } = await supabase
  .from('workout_templates')
  .select('id, label, position, template_exercises(count)')
  .order('position');

if (!templates?.length) {
  bad('Geen workout-templates', serviceKey
    ? 'Draai supabase/seed.sql in de SQL-editor.'
    : 'Leeg met de anon-sleutel kan ook betekenen dat de toegangsregels werken. Zet SUPABASE_SERVICE_ROLE_KEY in .env om echt te controleren.');
  process.exit(1);
}
for (const t of templates) {
  const n = t.template_exercises?.[0]?.count ?? 0;
  n > 0 ? ok(`${t.label} — ${n} oefeningen`) : bad(`${t.label} — geen oefeningen gekoppeld`);
}

console.log('\n\x1b[32mAlles staat klaar.\x1b[0m Start de app met: npm run dev\n');
