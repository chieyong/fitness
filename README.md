# Fitness Tracker

Persoonlijke 3-daagse trainingstracker (Workout A/B/C). Spec: [FITNESS-APP-SPEC.md](FITNESS-APP-SPEC.md).

**Status: fase 1** — schema-model en datumlogica. Nog geen logging, grafieken of foto-feedback.

## Opzetten

1. Maak een Supabase-project aan.
2. Draai in de SQL-editor eerst `supabase/schema.sql`, daarna `supabase/seed.sql`.
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

## Nog te doen

- Echte migratie van het Notion-schema (vervangt `seed.sql`)
- Fase 2: sets/reps/gewicht loggen, met "vorige keer" als referentie
- Fase 3–5: progressiegrafieken, spiergroep-visualisatie, AI-foto-feedback
- Netlify-deploy (env-vars als build-secrets)

Met `?date=2026-09-15` open je het scherm op een andere dag — handig om de
doorschuiflogica te bekijken zonder te wachten.
