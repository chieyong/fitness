-- Alternatieven: per oefening één vergelijkbare oefening om in een sessie naar te
-- wisselen (bijvoorbeeld Beenpers <-> Squat). De app houdt het paar symmetrisch:
-- als A naar B wijst, wijst B naar A. Sets gaan naar de oefening die je echt deed.

alter table exercises
  add column if not exists alternative_id uuid references exercises(id) on delete set null;

-- Laat de API de wijzigingen meteen zien (anders: 'not found in the schema cache').
notify pgrst, 'reload schema';
