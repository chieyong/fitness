-- Fase 1 seed: 3 schema's met elk 3 voorbeeldoefeningen.
-- Placeholder-data om schema en datumlogica te testen; de echte Notion-migratie
-- komt in een aparte stap en vervangt dit.

insert into exercises (name, muscle_groups) values
  ('Bankdrukken',        array['borst','triceps']),
  ('Roeien met halter',  array['rug','biceps']),
  ('Plank',              array['core']),
  ('Squat',              array['benen','bilspieren']),
  ('Schouderpers',       array['schouders','triceps']),
  ('Lunges',             array['benen','bilspieren']),
  ('Optrekken',          array['rug','biceps']),
  ('Romanian deadlift',  array['hamstrings','rug']),
  ('Side plank',         array['core'])
on conflict do nothing;

insert into workout_templates (label, position) values
  ('Workout A', 0),
  ('Workout B', 1),
  ('Workout C', 2)
on conflict do nothing;

-- Workout A
insert into template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_seconds)
select t.id, e.id, v.position, v.sets, v.reps_min, v.reps_max, v.seconds
from (values
  ('Bankdrukken',       1, 3, 10, 12, null::int),
  ('Roeien met halter', 2, 3, 10, 12, null::int),
  ('Plank',             3, 3,  1, null::int, 60)
) as v(name, position, sets, reps_min, reps_max, seconds)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout A';

-- Workout B
insert into template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_seconds)
select t.id, e.id, v.position, v.sets, v.reps_min, v.reps_max, v.seconds
from (values
  ('Squat',         1, 4, 8, 10, null::int),
  ('Schouderpers',  2, 3, 10, 12, null::int),
  ('Lunges',        3, 3, 12, null::int, null::int)
) as v(name, position, sets, reps_min, reps_max, seconds)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout B';

-- Workout C
insert into template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_seconds)
select t.id, e.id, v.position, v.sets, v.reps_min, v.reps_max, v.seconds
from (values
  ('Optrekken',         1, 3, 6, 8, null::int),
  ('Romanian deadlift', 2, 3, 10, 12, null::int),
  ('Side plank',        3, 2, 1, null::int, 45)
) as v(name, position, sets, reps_min, reps_max, seconds)
join exercises e on e.name = v.name
join workout_templates t on t.label = 'Workout C';
