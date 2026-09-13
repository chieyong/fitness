-- GEGENEREERD BESTAND — niet met de hand aanpassen.
-- Bron: scripts/source-data.mjs — pas die aan en draai `npm run generate-seed`.
--
-- Aannames bij het overzetten van de bestaande aantekeningen:
--   - Datums zijn dag/maand/jaar gelezen: 5/9/2026 = 5 september 2026.
--   - "3/11/26" bij Concentration curls en Close-grip bankdrukken gelezen als 3/9/26 — de rest van die Workout C-sessie staat op 3/9 en 3 november ligt in de toekomst.
--   - Lat pulldown 8/9: "6x59, 8x52x 8x52, 8,52" gelezen als vier sets 6x59, 8x52, 8x52, 8x52.
--   - Triceps pushdown 5/9: komma als decimaalteken, dus 22,5 = 22.5 kg en 20,3 = 20.3 kg (ook "20.3" komt voor).
--   - Hanging leg raises heeft geen target in de bron; voorlopig 3x15 aangehouden.
--   - Plank en Hanging leg raises zijn op 13/9 niet genoemd: geen regel aangemaakt (niet als overgeslagen geteld).
--   - Schouderpers (A en C), Beenpers of squats (A en B) en Gebogen rij (A en C) zijn telkens één oefening die in meerdere schema's terugkomt; de logs vormen per oefening één doorlopende reeks. Targets mogen per schema verschillen.
--   - Oefeningen met "X of Y" zijn als één oefening bewaard, zodat de loggeschiedenis aaneengesloten blijft.
--   - Video-URLs voor Gebogen rij staan niet in de bron en zijn leeggelaten.

begin;

-- Schoon beginnen: dit vervangt de placeholder-seed volledig.
delete from exercise_logs;
delete from sessions;
delete from template_exercises;
delete from exercises;
delete from workout_templates;

insert into exercises (name, muscle_groups, notes) values
  ('Bankdrukken', array['borst', 'triceps'], 'Barbell of dumbbell'),
  ('Gebogen rij', array['rug', 'biceps'], 'Barbell, dumbbell of cable; twee uitvoeringen (version 1 / version 2). Komt terug in Workout C'),
  ('Schouderpers', array['schouders', 'triceps'], 'Barbell of dumbbell; komt terug in Workout C'),
  ('Beenpers of squats', array['benen', 'bilspieren'], 'Komt terug in Workout B'),
  ('Bicepscurls', array['biceps'], null),
  ('Triceps pushdown of dips', array['triceps'], null),
  ('Plank', array['core'], null),
  ('Hanging leg raises of buikspier crunch', array['core'], null),
  ('Lat pulldown of pull-ups', array['rug', 'biceps'], null),
  ('Incline dumbbell press', array['borst', 'schouders', 'triceps'], null),
  ('Romanian deadlift', array['hamstrings', 'rug'], null),
  ('Hammer curls', array['biceps', 'onderarmen'], null),
  ('Skull crushers of overhead triceps extension', array['triceps'], null),
  ('Russian twists', array['core'], null),
  ('Cable woodchoppers of side plank', array['core'], null),
  ('Deadlifts', array['rug', 'hamstrings', 'bilspieren'], null),
  ('Uitvalspassen', array['benen', 'bilspieren'], null),
  ('Concentration curls', array['biceps'], null),
  ('Close-grip bankdrukken', array['triceps', 'borst'], 'Ook met dumbbells'),
  ('Ab wheel of decline crunches', array['core'], null),
  ('Plank met schouder taps', array['core'], null);

insert into workout_templates (label, position) values
  ('Workout A', 0),
  ('Workout B', 1),
  ('Workout C', 2);

-- Workout A
insert into template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_seconds, target_seconds_max, target_note)
select t.id, e.id, v.position, v.sets, v.reps_min, v.reps_max, v.seconds, v.seconds_max, v.target_note
from (values
  ('Bankdrukken', 1, 4, 10::int, null::int, null::int, null::int, null::text),
  ('Gebogen rij', 2, 4, 8::int, null::int, null::int, null::int, null::text),
  ('Schouderpers', 3, 3, 10::int, null::int, null::int, null::int, null::text),
  ('Beenpers of squats', 4, 3, 10::int, null::int, null::int, null::int, null::text),
  ('Bicepscurls', 5, 3, 12::int, null::int, null::int, null::int, null::text),
  ('Triceps pushdown of dips', 6, 3, 12::int, null::int, null::int, null::int, null::text),
  ('Plank', 7, 3, null::int, null::int, 30::int, 45::int, null::text),
  ('Hanging leg raises of buikspier crunch', 8, 3, 15::int, null::int, null::int, null::int, null::text)
) as v(name, position, sets, reps_min, reps_max, seconds, seconds_max, target_note)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout A';

-- Workout B
insert into template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_seconds, target_seconds_max, target_note)
select t.id, e.id, v.position, v.sets, v.reps_min, v.reps_max, v.seconds, v.seconds_max, v.target_note
from (values
  ('Beenpers of squats', 1, 4, 8::int, 10::int, null::int, null::int, null::text),
  ('Lat pulldown of pull-ups', 2, 4, 8::int, 10::int, null::int, null::int, null::text),
  ('Incline dumbbell press', 3, 3, 10::int, null::int, null::int, null::int, null::text),
  ('Romanian deadlift', 4, 3, 10::int, null::int, null::int, null::int, null::text),
  ('Hammer curls', 5, 3, 12::int, null::int, null::int, null::int, null::text),
  ('Skull crushers of overhead triceps extension', 6, 3, 12::int, null::int, null::int, null::int, null::text),
  ('Russian twists', 7, 3, 20::int, null::int, null::int, null::int, null::text),
  ('Cable woodchoppers of side plank', 8, 3, null::int, null::int, 30::int, null::int, 'per kant'::text)
) as v(name, position, sets, reps_min, reps_max, seconds, seconds_max, target_note)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout B';

-- Workout C
insert into template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_seconds, target_seconds_max, target_note)
select t.id, e.id, v.position, v.sets, v.reps_min, v.reps_max, v.seconds, v.seconds_max, v.target_note
from (values
  ('Deadlifts', 1, 4, 6::int, 8::int, null::int, null::int, null::text),
  ('Schouderpers', 2, 3, 10::int, null::int, null::int, null::int, null::text),
  ('Gebogen rij', 3, 3, 10::int, null::int, null::int, null::int, null::text),
  ('Uitvalspassen', 4, 3, 12::int, null::int, null::int, null::int, 'per been'::text),
  ('Concentration curls', 5, 3, 12::int, null::int, null::int, null::int, null::text),
  ('Close-grip bankdrukken', 6, 3, 10::int, null::int, null::int, null::int, null::text),
  ('Ab wheel of decline crunches', 7, 3, 15::int, null::int, null::int, null::int, null::text),
  ('Plank met schouder taps', 8, 3, 20::int, null::int, null::int, null::int, null::text)
) as v(name, position, sets, reps_min, reps_max, seconds, seconds_max, target_note)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout C';

-- Geschiedenis: één sessie per trainingsdag, één rij per set.
-- 2026-09-03 — Workout C
insert into sessions (template_id, planned_date, actual_date, status)
select id, '2026-09-03', '2026-09-03', 'voltooid' from workout_templates where label = 'Workout C';

insert into exercise_logs (session_id, exercise_id, set_number, reps, weight_kg, skipped, note)
select s.id, e.id, v.set_number, v.reps, v.weight_kg, v.skipped, v.note
from (values
  ('Deadlifts', 1, null::int, null::numeric, true, null::text),
  ('Schouderpers', 1, 10::int, 12::numeric, false, null::text),
  ('Schouderpers', 2, 7::int, 14::numeric, false, null::text),
  ('Schouderpers', 3, 7::int, 12::numeric, false, null::text),
  ('Schouderpers', 4, 8::int, 12::numeric, false, null::text),
  ('Gebogen rij', 1, 10::int, 10::numeric, false, null::text),
  ('Gebogen rij', 2, 10::int, 12::numeric, false, null::text),
  ('Gebogen rij', 3, 10::int, 14::numeric, false, null::text),
  ('Uitvalspassen', 1, null::int, null::numeric, true, null::text),
  ('Concentration curls', 1, 10::int, 12::numeric, false, null::text),
  ('Concentration curls', 2, 8::int, 12::numeric, false, null::text),
  ('Concentration curls', 3, 10::int, 10::numeric, false, null::text),
  ('Close-grip bankdrukken', 1, 10::int, 10::numeric, false, null::text),
  ('Close-grip bankdrukken', 2, 10::int, 12::numeric, false, null::text),
  ('Close-grip bankdrukken', 3, 10::int, 12::numeric, false, null::text),
  ('Ab wheel of decline crunches', 1, null::int, null::numeric, true, null::text),
  ('Plank met schouder taps', 1, null::int, null::numeric, true, null::text)
) as v(name, set_number, reps, weight_kg, skipped, note)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout C'
join sessions s on s.template_id = t.id and s.planned_date = '2026-09-03';

-- 2026-09-05 — Workout A
insert into sessions (template_id, planned_date, actual_date, status)
select id, '2026-09-05', '2026-09-05', 'voltooid' from workout_templates where label = 'Workout A';

insert into exercise_logs (session_id, exercise_id, set_number, reps, weight_kg, skipped, note)
select s.id, e.id, v.set_number, v.reps, v.weight_kg, v.skipped, v.note
from (values
  ('Bankdrukken', 1, 10::int, 14::numeric, false, null::text),
  ('Bankdrukken', 2, 10::int, 12::numeric, false, null::text),
  ('Bankdrukken', 3, 10::int, 12::numeric, false, null::text),
  ('Gebogen rij', 1, 8::int, 12::numeric, false, null::text),
  ('Gebogen rij', 2, 8::int, 12::numeric, false, null::text),
  ('Gebogen rij', 3, 8::int, 12::numeric, false, null::text),
  ('Gebogen rij', 4, 8::int, 12::numeric, false, null::text),
  ('Schouderpers', 1, 10::int, 12::numeric, false, 'Ging net!'::text),
  ('Schouderpers', 2, 10::int, 12::numeric, false, null::text),
  ('Schouderpers', 3, 10::int, 12::numeric, false, null::text),
  ('Beenpers of squats', 1, 10::int, 59::numeric, false, null::text),
  ('Beenpers of squats', 2, 10::int, 66::numeric, false, null::text),
  ('Beenpers of squats', 3, 12::int, 66::numeric, false, null::text),
  ('Bicepscurls', 1, 10::int, 10::numeric, false, null::text),
  ('Bicepscurls', 2, 10::int, 10::numeric, false, null::text),
  ('Bicepscurls', 3, 10::int, 10::numeric, false, null::text),
  ('Triceps pushdown of dips', 1, 12::int, 18::numeric, false, null::text),
  ('Triceps pushdown of dips', 2, 6::int, 22.5::numeric, false, null::text),
  ('Triceps pushdown of dips', 3, 12::int, 20.3::numeric, false, null::text),
  ('Triceps pushdown of dips', 4, 12::int, 20.3::numeric, false, null::text),
  ('Plank', 1, null::int, null::numeric, true, null::text),
  ('Hanging leg raises of buikspier crunch', 1, null::int, null::numeric, true, null::text)
) as v(name, set_number, reps, weight_kg, skipped, note)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout A'
join sessions s on s.template_id = t.id and s.planned_date = '2026-09-05';

-- 2026-09-08 — Workout B
insert into sessions (template_id, planned_date, actual_date, status)
select id, '2026-09-08', '2026-09-08', 'voltooid' from workout_templates where label = 'Workout B';

insert into exercise_logs (session_id, exercise_id, set_number, reps, weight_kg, skipped, note)
select s.id, e.id, v.set_number, v.reps, v.weight_kg, v.skipped, v.note
from (values
  ('Beenpers of squats', 1, 10::int, 73::numeric, false, null::text),
  ('Beenpers of squats', 2, 10::int, 73::numeric, false, null::text),
  ('Beenpers of squats', 3, 10::int, 73::numeric, false, null::text),
  ('Lat pulldown of pull-ups', 1, 6::int, 59::numeric, false, null::text),
  ('Lat pulldown of pull-ups', 2, 8::int, 52::numeric, false, null::text),
  ('Lat pulldown of pull-ups', 3, 8::int, 52::numeric, false, null::text),
  ('Lat pulldown of pull-ups', 4, 8::int, 52::numeric, false, null::text),
  ('Incline dumbbell press', 1, 10::int, 12::numeric, false, null::text),
  ('Incline dumbbell press', 2, 10::int, 14::numeric, false, null::text),
  ('Incline dumbbell press', 3, 10::int, 14::numeric, false, null::text),
  ('Incline dumbbell press', 4, 8::int, 14::numeric, false, null::text),
  ('Romanian deadlift', 1, null::int, null::numeric, true, null::text),
  ('Hammer curls', 1, 10::int, 12::numeric, false, null::text),
  ('Hammer curls', 2, 10::int, 12::numeric, false, null::text),
  ('Hammer curls', 3, 10::int, 12::numeric, false, null::text),
  ('Skull crushers of overhead triceps extension', 1, 10::int, 23::numeric, false, null::text),
  ('Skull crushers of overhead triceps extension', 2, 10::int, 27::numeric, false, null::text),
  ('Skull crushers of overhead triceps extension', 3, 12::int, 27::numeric, false, null::text),
  ('Russian twists', 1, null::int, null::numeric, true, null::text),
  ('Cable woodchoppers of side plank', 1, null::int, null::numeric, true, null::text)
) as v(name, set_number, reps, weight_kg, skipped, note)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout B'
join sessions s on s.template_id = t.id and s.planned_date = '2026-09-08';

-- 2026-09-11 — Workout C
insert into sessions (template_id, planned_date, actual_date, status)
select id, '2026-09-11', '2026-09-11', 'voltooid' from workout_templates where label = 'Workout C';

insert into exercise_logs (session_id, exercise_id, set_number, reps, weight_kg, skipped, note)
select s.id, e.id, v.set_number, v.reps, v.weight_kg, v.skipped, v.note
from (values
  ('Deadlifts', 1, null::int, null::numeric, true, null::text),
  ('Schouderpers', 1, 10::int, 14::numeric, false, null::text),
  ('Schouderpers', 2, 10::int, 14::numeric, false, null::text),
  ('Gebogen rij', 1, 10::int, 14::numeric, false, null::text),
  ('Gebogen rij', 2, 10::int, 16::numeric, false, null::text),
  ('Gebogen rij', 3, 10::int, 18::numeric, false, null::text),
  ('Uitvalspassen', 1, null::int, null::numeric, true, null::text),
  ('Concentration curls', 1, 10::int, 12::numeric, false, null::text),
  ('Concentration curls', 2, 10::int, 12::numeric, false, null::text),
  ('Close-grip bankdrukken', 1, 10::int, 14::numeric, false, null::text),
  ('Close-grip bankdrukken', 2, 10::int, 14::numeric, false, null::text),
  ('Close-grip bankdrukken', 3, 10::int, 14::numeric, false, null::text),
  ('Ab wheel of decline crunches', 1, null::int, null::numeric, true, null::text),
  ('Plank met schouder taps', 1, null::int, null::numeric, true, null::text)
) as v(name, set_number, reps, weight_kg, skipped, note)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout C'
join sessions s on s.template_id = t.id and s.planned_date = '2026-09-11';

-- 2026-09-13 — Workout A
insert into sessions (template_id, planned_date, actual_date, status)
select id, '2026-09-13', '2026-09-13', 'voltooid' from workout_templates where label = 'Workout A';

insert into exercise_logs (session_id, exercise_id, set_number, reps, weight_kg, skipped, note)
select s.id, e.id, v.set_number, v.reps, v.weight_kg, v.skipped, v.note
from (values
  ('Bankdrukken', 1, 10::int, 14::numeric, false, null::text),
  ('Bankdrukken', 2, 10::int, 16::numeric, false, null::text),
  ('Bankdrukken', 3, 10::int, 16::numeric, false, null::text),
  ('Bankdrukken', 4, 8::int, 16::numeric, false, null::text),
  ('Gebogen rij', 1, 8::int, 14::numeric, false, null::text),
  ('Gebogen rij', 2, 8::int, 14::numeric, false, null::text),
  ('Gebogen rij', 3, 8::int, 14::numeric, false, null::text),
  ('Gebogen rij', 4, 8::int, 16::numeric, false, null::text),
  ('Schouderpers', 1, 10::int, 14::numeric, false, null::text),
  ('Schouderpers', 2, 9::int, 12::numeric, false, null::text),
  ('Schouderpers', 3, 5::int, 12::numeric, false, null::text),
  ('Beenpers of squats', 1, 10::int, 79::numeric, false, null::text),
  ('Beenpers of squats', 2, 10::int, 79::numeric, false, null::text),
  ('Beenpers of squats', 3, 10::int, 79::numeric, false, null::text),
  ('Bicepscurls', 1, 12::int, 12::numeric, false, null::text),
  ('Bicepscurls', 2, 12::int, 12::numeric, false, null::text),
  ('Bicepscurls', 3, 12::int, 12::numeric, false, null::text),
  ('Triceps pushdown of dips', 1, 12::int, 32::numeric, false, null::text),
  ('Triceps pushdown of dips', 2, 12::int, 36::numeric, false, null::text),
  ('Triceps pushdown of dips', 3, 12::int, 36::numeric, false, null::text)
) as v(name, set_number, reps, weight_kg, skipped, note)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout A'
join sessions s on s.template_id = t.id and s.planned_date = '2026-09-13';

commit;
