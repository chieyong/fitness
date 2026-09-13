Ik bouw een persoonlijke fitness-tracker app. Lees eerst `FITNESS-APP-SPEC.md` in deze repo
volledig door — daarin staan het datamodel, de featurefases en de design brief.

Start met fase 1 uit de spec (schema-model + datumlogica):
- Zet het Supabase-schema op zoals gespecificeerd.
- Bouw een "wat moet ik vandaag doen"-scherm dat op basis van de huidige (of geselecteerde)
  datum de juiste sessie toont, inclusief de inhaal/doorschuif-logica.
- Volg de design brief in de spec strikt: systeem-fontstack (geen geladen webfont), lichte
  achtergrond, Apple-achtige rust — geen kaartjes-met-schaduw, geen gradients, geen
  standaard AI-look.
- Bouw nog geen logging-invoer, geen grafieken en geen foto-feedback — dat komt in latere
  fases. Hou dit scherm minimaal en werkend.
- Nog geen echte data: gebruik 2-3 voorbeeldoefeningen per sessie als seed-data, zodat het
  schema en de datumlogica getest kunnen worden. De echte migratie van mijn Notion-schema
  doe ik in een volgende stap.

Laat me eerst je aanpak (bestandsstructuur, welke libraries je toevoegt) kort zien voordat je
begint met bouwen.
