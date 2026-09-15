# Repz

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

Zonder `.env` draait de app ook: dan alleen met demo-gegevens.

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

Op welke weekdagen je traint stel je in bij **Schema → Planning**; standaard dinsdag,
donderdag en zaterdag. Daar kies je ook hoe de workouts rouleren:

- **Op volgorde**: A → B → C, steeds verder na de laatst geplande workout.
- **Willekeurig per ronde**: elke ronde bevat elke workout precies één keer in een geschudde
  volgorde; na elke volledige ronde (drie sessies bij drie workouts, vier bij vier) wordt
  opnieuw geschud. Een halve ronde wordt eerst afgemaakt, en een ronde begint nooit met de
  workout waarmee de vorige eindigde. Elke sessie krijgt daarvoor een rondenummer (`cycle`).

Wijzig je de planning, dan worden de geplande trainingen vanaf vandaag opnieuw ingedeeld;
trainingen waarin al iets gelogd of beoordeeld is blijven staan. De instelling staat in
`schedule_settings`, de logica in `src/lib/schedule.js` en `src/lib/scheduleSettings.js`.

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

## Inloggen en demo

Er is geen inlogscherm vooraf: wie de app opent, ziet meteen de demo, met bovenaan een
balk die zegt dat je moet inloggen om je eigen trainingen op te slaan. De demo is een half
jaar aan voorbeeldtrainingen volgens het echte programma, gemaakt in de browser zelf
(`src/lib/demo/generate.js`, met vaste seed). In de demo pas je bestaande dingen aan: sets loggen, sterren geven, targets en
video's van oefeningen. Dat gaat niet naar de database, maar blijft in `sessionStorage`
staan: herladen behoudt het, de browser sluiten wist het, en een nieuwe dag begint vers.
Het schema ombouwen kan in de demo niet — geen workouts toevoegen, hernoemen, verwijderen
of ordenen, geen oefeningen toevoegen of uit een workout halen, en de planning
(trainingsdagen en volgorde) niet wijzigen; die toont de demo alleen als samenvatting. De
demo-bron weigert dat ook zelf (`lockStructure`), zodat het via een directe link evenmin kan.

Ingelogd staat in dezelfde balk met welk account, met een knop om uit te loggen — op elk
scherm, niet alleen op het scherm van vandaag.

Na inloggen beslist de **database** wie de echte gegevens ziet, niet de app: de functie
`is_owner()` kijkt of het Google-adres in de tabel `app_owners` staat, en de policies op
alle tabellen laten alleen die gebruiker door. Anoniem krijgt niets. Een ander
Google-account kan inloggen, maar ziet de demo met een melding dat het geen toegang heeft.
Bij twijfel — de controle mislukt — toont de app ook de demo: liever te weinig dan te veel.

Het eigenaarsadres staat bewust niet in de repository. Je voegt het één keer toe in de
SQL-editor.

Schermen weten niet met welke bron ze praten: `src/lib/queries.js` stuurt elke aanroep
door naar `sources/supabase.js` of `sources/demo.js`, en een test bewaakt dat die twee
precies dezelfde functies hebben.

### Google-login instellen

1. **Google Cloud Console** → APIs & Services → OAuth consent screen: stel het scherm in.
   Daarna Credentials → Create credentials → OAuth client ID → *Web application*.
   - Authorized JavaScript origins: je Netlify-adres en `http://localhost:5173`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Sign In / Providers → Google: aanzetten, Client ID en
   Client Secret uit stap 1 invullen.
3. **Supabase** → Authentication → URL Configuration: Site URL is je Netlify-adres; zet
   bij Redirect URLs zowel dat adres als `http://localhost:5173`.

### Volgorde bij het live zetten

1. Google en Supabase instellen zoals hierboven — de huidige app merkt daar niets van.
2. Deze code deployen. Tot stap 3 ziet ook de eigenaar na inloggen nog de demo, want
   `is_owner()` bestaat dan nog niet en de app valt veilig terug.
3. `supabase/migrations/003_owner_access.sql` draaien, en direct daarna:
   `insert into public.app_owners (email) values ('jouw-adres@gmail.com');`
4. `supabase/migrations/004_exercise_kind.sql` draaien: materiaal en meetwijze per
   oefening, nodig voor het aanpassen van je schema.
5. `supabase/migrations/005_feedback_and_videos.sql` draaien: sterren en toelichting per
   oefening, en de grens van drie video's.
6. `supabase/migrations/006_schedule_settings.sql` draaien: trainingsdagen en volgorde.
7. Inloggen.

Alle migraties zijn veilig opnieuw te draaien: ze controleren zelf wat er al is.

### Beheerscripts

`npm run check`, `smoke` en `history` gebruikten de anon-sleutel, en die ziet na migratie
003 niets meer. Zet daarom `SUPABASE_SERVICE_ROLE_KEY` in je lokale `.env` (Supabase →
Project Settings → API). Die sleutel omzeilt alle toegangsregels: nooit met `VITE_` ervoor,
nooit in Netlify, nooit committen. De app zelf gebruikt hem niet; Vite geeft alleen
`VITE_`-variabelen door aan de browser.

## Stijl, licht en donker

De app gebruikt een navy kaartenstijl: zwevende afgeronde kaarten met zachte schaduw,
blauwe gradient-knoppen, een diagonaal blauw vlak op de achtergrond en Poppins als
lettertype. Onderaan zit een tabbalk met Vandaag, Voortgang en Schema; de actieve tab
staat verhoogd in blauw. Zijschermen (een oefening, oefening toevoegen) hebben een
blauwe terugknop linksboven.

Dit is een bewuste breuk met de oorspronkelijke ontwerpbrief in `FITNESS-APP-SPEC.md`, die
kaarten met schaduw, gradients en een geladen font juist uitsloot.

**Thema.** Standaard volgt de app de telefoon. Met de knop in de balk bovenaan kies je zelf:
Systeem, Licht of Donker. De keuze staat in `localStorage` (`repz.theme`) en wordt vóór de
eerste weergave toegepast, zodat er geen ander thema in beeld flitst. Beide thema's spreken
dezelfde ontwerptaal; alleen de kleuren verschillen.

**Taal.** De app is standaard Engels; de knop `NL`/`EN` in de balk bovenaan wisselt. De
keuze staat in `localStorage` (`repz.locale`). Teksten staan per scherm in
`src/i18n/messages/` als `{ en, nl }`; `useI18n()` geeft `t(sleutel, invulvelden)` en de taal.
Een test bewaakt dat elke tekst in beide talen bestaat, met dezelfde `{invulvelden}`. Datums,
spiergroepen, materiaal, planning en foutmeldingen krijgen de taal als laatste argument.
Wat je zelf invoert blijft zoals je het invoerde: een eigen oefening heet in beide talen
hetzelfde. De bibliotheek heeft Engelse namen (`en` in `catalog.js`) en herkent een
oefening in beide talen als dezelfde. De demo heeft per taal eigen namen en een eigen opslag
(`repz.demo.v2.en` / `.nl`).

**Kleuren.** Alles staat als token in `src/styles/tokens.css`: een lichte reeks op `:root`,
een donkere onder `prefers-color-scheme: dark` en onder `[data-theme="dark"]`. De waarden
zijn nagemeten, niet op het oog gekozen:

- tekst minstens 4,5:1 op het vlak waar hij staat
- witte knoptekst minstens 4,5:1 op beide uiteinden van de blauwe gradient
- sparklines minstens 3:1 op de kaart
- per thema een silhouetschaal die monotoon in lichtheid verloopt, en waarvan de laagste
  stap duidelijk verschilt van een onbelaste spier (ΔE ≥ 8,6); op donker betekent meer
  belasting lichter, op licht donkerder

Nieuwe kleuren horen als token in `tokens.css`, niet hardgecodeerd in een component.

## Eerste gebruik, laadscherm en installeren

**Rondleiding.** Bij het eerste bezoek start op het scherm van vandaag een korte
rondleiding: welkom, een oefeningkaart, een videoknop, en de tabs Voortgang en Schema. Elke stap licht het echte onderdeel uit met een uitlegkaartje erbij. Staat een
onderdeel er niet (geen videoknop, of een rustdag zonder oefeningen), dan wordt die stap
overgeslagen. Overslaan kan altijd, ook met Escape; met de pijltjestoetsen blader je. Of je
hem gezien hebt staat in `localStorage` (`repz.tour.v1`). Onderaan Vandaag staat
"Uitleg bekijken" om hem opnieuw te doorlopen. De stappen staan in `src/data/tourSteps.js`,
de plaatsing van het kaartje in `src/lib/tour.js` (getest).

**Laadscherm.** Het logo — een vette, schuine R met een bliksemsnede — knalt in beeld, het
scherm schokt, er gaat een schokgolf door, REPZ schuift cursief in en het logo gloeit na. Het staat inline in `index.html`, zodat het er is vóór de app geladen is, en verdwijnt
zodra de app weet wat hij moet tonen — maar niet eerder dan na 2,4 seconden, zodat de animatie helemaal te zien is. De
rondleiding wacht tot het laadscherm weg is. Met "minder beweging" aan staat alles stil.

**Installeren als app (PWA).** Repz is te installeren via "Zet op beginscherm" (iPhone,
Safari) of de installatieknop (Android, Chrome). Het manifest, de service worker en de
iconen komen van `vite-plugin-pwa` (zie `vite.config.js`); de iconen staan in
`public/icons/`, met een maskable-variant voor Android.

De service worker bewaart alleen de app zelf offline: code, stijlen, iconen en het
lettertype. **Trainingsgegevens van Supabase gaan altijd over het netwerk en komen nooit
in de cache.** De demo werkt daardoor volledig offline; eigen gegevens hebben verbinding
nodig. Een nieuwe versie wordt op de achtergrond opgehaald en geldt bij de volgende start.

Let op bij inloggen vanuit de geïnstalleerde app op een iPhone: Google-login opent in een
aparte browser, en iOS geeft de sessie niet altijd terug aan de app op het beginscherm.
Lukt dat niet, log dan eerst in via Safari.

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

Oefeningen staan ingeklapt: een statusrondje, de naam en wat je vorige keer deed. Het
rondje kent vier staten — open, bezig, klaar, overgeslagen — zodat "drie van de vier sets"
zichtbaar anders is dan "nog niets". Tik een oefening aan om te loggen; er staat er één
tegelijk open.

Een sessie met status `gepland` is invulbaar: per set reps en gewicht (of seconden),
met de vorige keer als referentie erboven. Een set wordt opgeslagen zodra het veld de
focus verliest; leegmaken wist hem. Komma en punt zijn allebei een decimaalteken.

"Vorige keer" kijkt naar de oefening, niet naar de workout. Doe je de beenpers in zowel
A als B, dan zie je gewoon de laatste keer dat je hem deed.

Een sessie afronden (of overslaan) zet de status vast; pas daarna schuift het schema op
naar de volgende training.

## Schema aanpassen

Via de tab Schema onderaan. Per workout kun je oefeningen verplaatsen, hun
target aanpassen (sets plus reps of seconden, met een optionele bovengrens) en ze uit de
workout halen. Workouts kun je toevoegen, hernoemen en verwijderen.

**Oefening toevoegen** gaat via keuzelijsten: kies een spiergroep, filter op materiaal
(losse gewichten, machine of kabel, zonder hulpmiddelen) en kies uit de bibliotheek van
zo'n 90 oefeningen in `src/data/catalog.js`. Of zoek op naam. Staat je oefening er niet
tussen, dan maak je een eigen oefening met naam, spiergroepen, materiaal en meetwijze
(kilo's en reps, alleen reps, of seconden).

**Je geschiedenis blijft altijd bewaard.** Een oefening uit een workout halen verwijdert
alleen de koppeling, niet de oefening of haar logs. Een workout verwijderen archiveert hem:
afgeronde trainingen blijven, alleen zijn geplande sessies vervallen. Kies je een oefening
uit de bibliotheek die je al hebt (op sleutel of naam), dan wordt dat dezelfde oefening en
loopt de grafiek door.

Ingelogd worden wijzigingen bewaard. In de demo pas je alleen targets en video's van bestaande oefeningen aan, tot je de browser sluit. Aanpassen gaat via het potloodje naast een oefening.

## Spieren van vandaag

Boven de oefeningen staat een klein silhouet (voor- en achterkant) met de spiergroepen die
de training van die dag raakt, met twee doorlopende verlopen:

- **nog niets gedaan:** amber, sterker naarmate de spier vandaag meer nadruk krijgt (geplande
  gewogen sets, zie hieronder)
- **begonnen:** van lichtblauw naar blauw, naar het deel van de gewogen sets dat af is

Ernaast loopt de teller "3 van 12 getraind" op, met de spiergroepen die nog te gaan zijn,
zwaarste nadruk eerst. Overgeslagen oefeningen tellen niet mee; sets boven het target ook
niet. Logica in `src/lib/todayMuscles.js`; kleuren als tokens `--today-planned`,
`--today-busy` en `--today-done`, gemengd met `color-mix` zodat ze met het thema meegaan.

## Primaire, secundaire en tertiaire spieren

Elke oefening belast spieren ongelijk. Per spier telt een set daarom naar rol: **primair ×1,
secundair ×0,5, tertiair ×0,25**. Dat geldt voor Voortgang (gewogen sets en volume per
spiergroep, en de kleur van het silhouet), voor Vandaag (nadruk en voortgang) en voor de
lijstjes per spiergroep, waar bij elke oefening de rol staat. Het oefeningscherm toont de
spieren per rol.

De verdeling staat in `src/data/muscleRoles.js` als `'primair | secundair | tertiair'`, per
bibliotheeksleutel, plus aliassen voor programmanamen. `src/lib/muscleWeights.js` zoekt hem
op: eerst `muscle_roles` op de oefening (voor later), dan `catalog_key`, dan de naam in
beide talen; anders geldt de eerste spiergroep als primair en de rest als secundair — dat
geldt dus voor eigen oefeningen. Tests bewaken dat elke bibliotheek- en programmaoefening
een verdeling heeft die haar spiergroepen dekt.

Het silhouet in Voortgang kleurt doorlopend (geen vijf stappen meer) tussen `--ramp-1` en
`--ramp-5`.

## Hoe ging het?

Onder de sets van een oefening geef je met 1 tot 5 sterren aan hoe het ging, met eventueel
een toelichting. Sterren worden direct bewaard, de toelichting zodra je het veld verlaat.
Nog een keer op dezelfde ster tikken wist de beoordeling. Ingeklapt staat de beoordeling
klein onder de naam, en bij de volgende keer zie je hoe het toen ging.

Dit staat per oefening per sessie in `exercise_feedback`. Het oude opmerkingenvak onder
de hele sessie is weg; opmerkingen die al op een set stonden ("Ging net!") heeft
migratie 005 meegenomen.

## Video's

In het schema kun je per oefening maximaal drie YouTube-links opslaan. Je begint met één veld; na elke ingevulde link verschijnt er één bij. Herkend worden: gewone links,
youtu.be, Shorts en embed-links worden herkend (`src/lib/youtube.js`). De video's horen
bij de oefening zelf, dus je ziet ze in elke workout waar die oefening in staat.

Op het scherm van vandaag staan kleine afspeelknopjes rechts op de oefeningkaart. Een
tik opent de video in een venster boven de app, via youtube-nocookie. Shorts krijgen een
staand venster. Sluiten met de knop, Escape of een tik ernaast.

## Voortgang

"Voortgang" opent met het lichaamssilhouet. Daaronder staat elke spiergroep als een
ingeklapte regel met een sparkline en het totaal — je ziet het verloop dus zonder iets
open te klappen. Tik een spiergroep aan (op het silhouet of op de regel zelf) en de
pagina schuift erheen en klapt de oefeningen uit; er staat er één tegelijk open. Nog een
keer tikken klapt hem geanimeerd in en brengt je rustig terug naar waar je stond.

Per oefening: een sparkline, waar je nu staat en het verschil sinds de eerste keer. Tik
de oefening aan voor de volledige grafieken en een tabel met alle sets. Tijdgebaseerde
oefeningen tonen de langste set in plaats van gewicht.

Zodra het silhouet uit beeld is, verschijnt rechtsonder een knop terug naar het
totaaloverzicht.

De sparklines zijn lijnen en geen staven: bij een lijn mag de as afgekapt worden, dus een
stap van 12 naar 14 kg is zichtbaar. Bij staven zou dat de hoogte laten liegen. De precieze
waarde staat als getal ernaast.

De grafieken tonen één reeks in één kleur, zonder legenda — de titel zegt al wat er
staat. De y-as begint bewust niet bij nul: bij een lijngrafiek is het verschil tussen
59 en 79 kg de informatie, en die verdwijnt als de as bij nul begint. Elk punt is
bereikbaar met muis én toetsenbord, en dezelfde cijfers staan in de tabel eronder,
zodat niets alleen achter een hover zit.

## Spiergroepen

Het silhouet toont voor- en achterkant, waarin elke spiergroep gekleurd is naar hoe zwaar
hij belast is. Een gekozen groep staat in de URL (`?voortgang=triceps`), dus een selectie
is deelbaar en opent meteen op de juiste plek.

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

- Fase 5: AI-feedback op voortgangsfoto's
- Target voor "Hanging leg raises of buikspier crunch" staat op 3x15; die kwam niet uit
  de bron en is een plaatshouder.

Met `?date=2026-09-15` open je het scherm op een andere dag — handig om de
doorschuiflogica te bekijken zonder te wachten.
