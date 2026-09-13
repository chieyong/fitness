# Fitness Tracker

Persoonlijke 3-daagse trainingstracker (Workout A/B/C). Spec: [FITNESS-APP-SPEC.md](FITNESS-APP-SPEC.md).

**Status: fase 2** — schema-model, datumlogica en handmatige logging. Nog geen grafieken of foto-feedback.

## Opzetten

1. Maak een Supabase-project aan.
2. Draai in de SQL-editor eerst `supabase/schema.sql`, daarna `supabase/seed.sql`.
   Bestaat de database al, draai dan de bestanden in `supabase/migrations/` op volgorde.
3. `cp .env.example .env` en vul `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in
   (Project Settings → API).
4. `npm install` en dan `npm run check` — dat controleert env, tabellen en seed in één keer.
5. `npm run dev`

## Commando's

| | |
|---|---|
| `npm run dev` | dev-server op :5173 |
| `npm run build` | productiebuild naar `dist/` |
| `npm test` | tests van de datumlogica |
| `npm run check` | controleert Supabase-verbinding, schema en seed |
| `npm run smoke` | draait de datalaag tegen Supabase en print het schema |
| `npm run history` | print de geimporteerde trainingsgeschiedenis |
| `npm run generate-seed` | genereert `supabase/seed.sql` uit `scripts/source-data.mjs` |

## De planningsregel

Trainingsdagen zijn **dinsdag, donderdag en zaterdag**, in vaste rotatie A → B → C.

Mis je een sessie, dan **schuift alles op**: de gemiste sessie wordt je eerstvolgende
training en de rest schuift mee. De volgorde blijft dus altijd intact en je raakt nooit een
workout kwijt. Staat er achterstand open, dan is vandaag meteen een inhaaldag — ook als
vandaag geen reguliere trainingsdag is. Sessies die je bewust op `overgeslagen` zet vervallen
wel; die schuiven niet mee.

De app houdt zes sessies vooruit gepland. Dat gebeurt automatisch bij het laden.

## Structuur

```
supabase/schema.sql   tabellen uit de spec
supabase/seed.sql     3 schema's × 3 voorbeeldoefeningen (placeholder)
src/lib/schedule.js   alle datum- en doorschuiflogica — puur, zonder React of Supabase
src/lib/queries.js    data-toegang
src/screens/Today.js  "wat moet ik vandaag doen"
tests/                tests op schedule.js
```

`schedule.js` is bewust vrij van React en Supabase: de doorschuifregels zijn het enige
niet-triviale stuk in fase 1, en dit maakt ze los testbaar.

## Deploy (Netlify)

`netlify.toml` legt build (`npm run build`) en publicatiemap (`dist`) vast. De twee
Supabase-variabelen staan er bewust niet in — die horen in **Site configuration →
Environment variables**:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Vite bakt ze tijdens de build in de bundel. Zet je ze later, dan moet je de deploy
opnieuw draaien; een herstart van de site is niet genoeg. Toont de site "Nog niet
verbonden", dan zijn ze niet meegekomen in de build.

## Loggen

Een sessie met status `gepland` is invulbaar: per set reps en gewicht (of seconden),
met de vorige keer als referentie erboven. Een set wordt opgeslagen zodra het veld de
focus verliest; leegmaken wist hem. Komma en punt zijn allebei een decimaalteken.

"Vorige keer" kijkt naar de oefening, niet naar de workout. Doe je de beenpers in zowel
A als B, dan zie je gewoon de laatste keer dat je hem deed.

Een sessie afronden (of overslaan) zet de status vast; pas daarna schuift het schema op
naar de volgende training.

## Nog te doen

- **Beveiliging.** De RLS-policies staan op `using (true)` voor `anon`, en de anon-sleutel
  zit in de client-bundel. Op een publieke Netlify-URL betekent dat: iedereen die het adres
  kent kan de trainingsdata lezen en wijzigen. Bewust uitgesteld, niet vergeten. De oplossing
  is Supabase Auth (single user) plus policies op `auth.uid()`.
- Fase 3–5: progressiegrafieken, spiergroep-visualisatie, AI-foto-feedback
- Netlify-deploy (env-vars als build-secrets)

Met `?date=2026-09-15` open je het scherm op een andere dag — handig om de
doorschuiflogica te bekijken zonder te wachten.
