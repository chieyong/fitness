-- Materiaal en meetwijze per oefening, voor het aanpassen van je schema.
--
-- equipment: waarmee je de oefening doet -- de filter bij het kiezen.
-- measure:   wat je logt -- kilo's en reps, alleen reps, of seconden.
-- catalog_key: welke oefening uit de bibliotheek dit is, zodat een tweede
--              keer kiezen dezelfde oefening (en geschiedenis) oplevert.

alter table exercises add column if not exists equipment text;
alter table exercises add column if not exists measure text;
alter table exercises add column if not exists catalog_key text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercises_equipment_check') then
    alter table exercises add constraint exercises_equipment_check
      check (equipment is null or equipment in ('losse-gewichten', 'machine', 'zonder'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'exercises_measure_check') then
    alter table exercises add constraint exercises_measure_check
      check (measure is null or measure in ('gewicht', 'reps', 'tijd'));
  end if;
end $$;

create unique index if not exists exercises_catalog_key_idx
  on exercises (catalog_key) where catalog_key is not null;

-- De oefeningen die er al zijn: materiaal en meetwijze invullen.
update exercises e
set equipment = v.equipment, measure = v.measure
from (values
  ('Bankdrukken', 'losse-gewichten', 'gewicht'),
  ('Gebogen rij', 'losse-gewichten', 'gewicht'),
  ('Schouderpers', 'losse-gewichten', 'gewicht'),
  ('Beenpers of squats', 'machine', 'gewicht'),
  ('Bicepscurls', 'losse-gewichten', 'gewicht'),
  ('Triceps pushdown of dips', 'machine', 'gewicht'),
  ('Plank', 'zonder', 'tijd'),
  ('Hanging leg raises of buikspier crunch', 'zonder', 'reps'),
  ('Lat pulldown of pull-ups', 'machine', 'gewicht'),
  ('Incline dumbbell press', 'losse-gewichten', 'gewicht'),
  ('Romanian deadlift', 'losse-gewichten', 'gewicht'),
  ('Hammer curls', 'losse-gewichten', 'gewicht'),
  ('Skull crushers of overhead triceps extension', 'losse-gewichten', 'gewicht'),
  ('Russian twists', 'zonder', 'reps'),
  ('Cable woodchoppers of side plank', 'zonder', 'tijd'),
  ('Deadlifts', 'losse-gewichten', 'gewicht'),
  ('Uitvalspassen', 'losse-gewichten', 'gewicht'),
  ('Concentration curls', 'losse-gewichten', 'gewicht'),
  ('Close-grip bankdrukken', 'losse-gewichten', 'gewicht'),
  ('Ab wheel of decline crunches', 'zonder', 'reps'),
  ('Plank met schouder taps', 'zonder', 'reps')
) as v(name, equipment, measure)
where e.name = v.name;
