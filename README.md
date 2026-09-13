# Fitness Tracker

Persoonlijke 3-daagse trainingstracker (Workout A/B/C). Spec: [FITNESS-APP-SPEC.md](FITNESS-APP-SPEC.md).

**Status: fase 4** — schema-model, datumlogica, logging, progressiegrafieken en
spiergroep-aggregatie op een lichaamssilhouet. Nog geen foto-feedback.

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

## Voortgang

Tik op een oefeningnaam in een sessie, of op "Voortgang" rechtsboven, voor de
geschiedenis van die oefening: zwaarste set en volume per training, plus een tabel
met alle sets. Tijdgebaseerde oefeningen tonen de langste set in plaats van gewicht.

De grafieken tonen één reeks in één kleur, zonder legenda — de titel zegt al wat er
staat. De y-as begint bewust niet bij nul: bij een lijngrafiek is het verschil tussen
59 en 79 kg de informatie, en die verdwijnt als de as bij nul begint. Elk punt is
bereikbaar met muis én toetsenbord, en dezelfde cijfers staan in de tabel eronder,
zodat niets alleen achter een hover zit.

## Spiergroepen

Via Voortgang → "Per spiergroep": een silhouet van voor- en achterkant waarin elke
spiergroep gekleurd is naar hoe zwaar hij belast is. Klik een groep aan voor de
oefeningen die eraan bijdroegen. Een gekozen groep staat in de URL (`?spieren=triceps`),
dus een selectie is deelbaar.

**Sets is de standaardmaat, niet kilo's.** Volume in kg is binnen één oefening een
prima maat voor vooruitgang, maar tussen spiergroepen misleidend: in de huidige data
hebben benen en triceps bijna hetzelfde kg-volume (6602 om 6496) terwijl benen 9 sets
kreeg en triceps 39. Een beenpers verplaatst meer gewicht dan een curl door anatomie,
niet door inspanning. Beide maten zitten erin; het scherm waarschuwt bij kilo's.

Een oefening telt volledig mee voor elke spiergroep die eraan meedoet. Het totaal over
alle groepen is daarom hoger dan het werkelijke werk — de vergelijking tússen groepen
is wat deze cijfers dragen, niet de som.

De kleurschaal is één tint van licht naar donker, met monotoon dalende lichtheid, zodat
de volgorde afleesbaar is zonder de kleuren te kennen.

Het silhouet komt van [react-body-highlighter](https://github.com/giavinh79/react-body-highlighter)
(MIT, ~20 kB): echte spierregio's in plaats van een eigen abstractie. De aggregatie blijft
van ons — de component kleurt op `frequency`, en daar voeren we de stap van onze eigen
schaal in. Twee beperkingen van die component: de polygonen zijn alleen met de muis te
bedienen en ze dragen geen selectiestaat. Daarom is de tabel eronder ook een selecteerbare
lijst; die is wel met het toetsenbord te bedienen en markeert de gekozen groep.

**Spiersleutels zijn Engels, labels Nederlands.** `exercises.muscle_groups` bevat de
sleutels die de component kent (`chest`, `upper-back`, `front-deltoids`, …); `src/lib/muscleLabels.js`
vertaalt die naar wat het scherm toont. Bij een nieuwe oefening moet je die sleutels
gebruiken, anders kleurt het silhouet niets.

## Nog te doen

- **Beveiliging.** De RLS-policies staan op `using (true)` voor `anon`, en de anon-sleutel
  zit in de client-bundel. Op een publieke Netlify-URL betekent dat: iedereen die het adres
  kent kan de trainingsdata lezen en wijzigen. Bewust uitgesteld, niet vergeten. De oplossing
  is Supabase Auth (single user) plus policies op `auth.uid()`.
- Fase 5: AI-feedback op voortgangsfoto's
- Target voor "Hanging leg raises of buikspier crunch" staat op 3x15; die kwam niet uit
  de bron en is een plaatshouder.

Met `?date=2026-09-15` open je het scherm op een andere dag — handig om de
doorschuiflogica te bekijken zonder te wachten.
