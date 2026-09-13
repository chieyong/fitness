# Fitness Tracker — Project Spec

## Wat dit is

Een persoonlijke fitness-tracker die mijn eigen 3-daagse trainingsschema (Workout A/B/C,
momenteel bijgehouden in Notion) vervangt. Kernfunctie: per trainingsdag zien wat ik moet
doen, tijdens/na de sessie sets/reps/gewicht loggen, en achteraf progressie zien — per
oefening en per spiergroep.

Dit is geen poging om Hevy/Strong/Fitbod te verslaan in algemene logging. De waarde zit in:
- Mijn eigen schema en mijn eigen inhaal/doorschuif-regels, niet een generiek template.
- Spiergroep-aggregatie met een selecteerbare lichaamsvisualisatie.
- (Latere fase) AI-feedback op voortgangsfoto's.

## Tech stack

- React (functionele componenten, hooks)
- Supabase (Postgres + auth, tabelstructuur hieronder)
- Netlify (deploy), zoals mijn andere projecten (Weekly Pulse, Glim)
- D3.js of Recharts voor grafieken — D3 voor de lichaamsvisualisatie (custom SVG), Recharts
  mag voor standaard lijngrafieken als dat sneller bouwt
- Geen mobiele app; responsive web, want ik gebruik 'm ook op de telefoon in de gym

## Datamodel (Supabase / Postgres)

```sql
-- Oefeningen: de bibliotheek, losstaand van een specifiek schema
create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- "Bankdrukken"
  muscle_groups text[] not null,         -- ['borst','triceps']
  video_urls text[],                     -- ['...version1', '...version2']
  notes text,
  created_at timestamptz default now()
);

-- Trainingsschema's: A, B, C
create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  label text not null,                   -- "Workout A"
  active boolean default true
);

-- Koppeling: welke oefening hoort bij welk schema, in welke volgorde, met welk doel
create table template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references workout_templates(id),
  exercise_id uuid references exercises(id),
  position int not null,
  target_sets int not null,
  target_reps_min int not null,
  target_reps_max int,                   -- voor "3x10-12"; null bij vast getal
  target_seconds int                     -- voor Plank / side plank i.p.v. reps
);

-- Geplande/uitgevoerde sessies op een datum
create table sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references workout_templates(id),
  planned_date date not null,
  actual_date date,
  status text not null default 'gepland' -- 'gepland' | 'voltooid' | 'overgeslagen' | 'verzet'
);

-- Sets: één rij per set, niet per oefening (nodig voor aggregatie/grafieken)
create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id),
  exercise_id uuid references exercises(id),
  set_number int not null,
  reps int,
  weight_kg numeric,
  seconds int,
  skipped boolean default false,
  logged_at timestamptz default now()
);
```

**Inhaal/doorschuif-logica**: zit in `sessions.status` + een functie die op basis van
`planned_date` en `status` de eerstvolgende geldige sessie berekent. Geen aparte tabel nodig.

## Migratie van bestaand Notion-schema

Ik heb een bestaand schema (Workout A/B/C) met per oefening een target (bijv. "3x10") en
een geschiedenis van losse logs per datum (bijv. "5/9/2026: 10x14, 10x12, 10x12"). Dit moet
als seed-data ingeladen worden:
- Elke regel wordt één `exercises`-record + één `template_exercises`-koppeling.
- Elke datum in de geschiedenis wordt een `sessions`-record (status `voltooid` of
  `overgeslagen` bij "niet gedaan").
- Elke los getallenpaar (bijv. "10x14") wordt één rij in `exercise_logs`.
- Let op datumnotatie-inconsistenties in de brondata (wisselend dag/maand-volgorde) —
  bij twijfel de meest recente/logische interpretatie aanhouden en apart vermelden welke
  aannames zijn gemaakt.

## Featurefases (MVP-opbouw)

1. **Schema-model + datumlogica** — sessies, target sets/reps, "wat moet ik vandaag doen"-scherm
   op basis van datum en inhaal/doorschuifregels. Nog geen logging.
2. **Handmatige logging** — invoer van sets/reps/gewicht per oefening, met "vorige keer: X"
   zichtbaar als referentie.
3. **Basis progressievisualisatie** — lijngrafiek per oefening (gewicht/volume over tijd).
4. **Spiergroep-aggregatie + lichaamsvisualisatie** — volume per spiergroep, selecteerbaar op
   een lichaamssilhouet.
5. **AI-foto-feedback** — los experiment, losstaand van de rest; bescheiden in scope
   (ondersteunend, geen diagnose).

Begin bij fase 1 en bouw niet vooruit — elke fase moet werkend en bruikbaar zijn voordat de
volgende begint.

## Design brief — clean, minimal, Apple-achtig

Expliciet niet de standaard "AI-gegenereerde" look: geen warme crème achtergrond met
terracotta accent, geen zwarte achtergrond met felgroen/vermiljoen accent, geen SaaS-kaartjes
met identieke afgeronde hoeken en dezelfde zachte grijze schaduw overal.

**Typografie**
- Gebruik de systeem-fontstack (`-apple-system, BlinkMacSystemFont, "SF Pro Text",
  "SF Pro Display"`) als primair lettertype — dit geeft op macOS/iOS echt San Francisco,
  zonder een font te hoeven laden. Val op andere platforms terug op een neutrale sans
  (`system-ui`), niet op Inter/Helvetica als bewuste keuze — laat het systeem het bepalen.
- Eén duidelijke type-schaal: groot en licht (font-weight 400-500) voor de datum/sessietitel
  bovenaan, medium (500-600) voor oefeningnamen, regular voor cijfers/logdata. Geen dikke
  zware koppen.
- Cijfers (gewichten, reps) in tabular figures (`font-variant-numeric: tabular-nums`) zodat
  kolommen met sets netjes uitlijnen.
- Geen tracked-out ALL-CAPS labels, geen middle-dot-gescheiden metastrings.

**Kleur**
- Lichte modus als basis: bijna-wit achtergrond (`#FAFAFA` / `#F5F5F7` — Apple's eigen grijs),
  tekst in `#1D1D1F` (Apple's near-black, geen puur zwart).
- Eén accentkleur, functioneel gebruikt (bijv. voor "voltooid"-status of actieve knoppen) —
  denk aan een ingehouden blauw (`#0071E3`-achtig) of iets dat bij de gym/energie past
  zonder cliché te worden (geen felgroen "fitness-app-groen" tenzij bewust gekozen).
- Spiergroepen in de lichaamsvisualisatie: een subtiele, beperkte kleurschaal (intensiteit =
  volume), geen regenboog.

**Layout**
- Genereuze witruimte, geen dichte kaartenrasters. Content links uitgelijnd, niet gecentreerd
  in brede kolommen.
- Dunne scheidingslijnen (hairlines) in plaats van kaarten-met-schaduw om oefeningen binnen
  een sessie te scheiden.
- Eén sessie = één scherm, oefeningen als verticale lijst, per oefening compact: naam, target,
  laatste keer, invoervelden voor huidige sets.
- Subtiele, doelgerichte micro-animaties (bijv. een vinkje dat verschijnt bij het voltooien
  van een set) — geen scroll-reveals of hover-effecten op alles.

**Wat te vermijden**
- Geen emoji als UI-decoratie.
- Geen "→" achter knoppen/links.
- Geen monospace voor cijfers/labels (tabular-nums op de systeemfont is genoeg).
- Geen gradients als decoratie.

## Waar ik nu sta

Fase 1 (schema-model + datumlogica) is de eerstvolgende stap. Nog niets gebouwd.
