-- Extra oefeningen bij één sessie: eenmalig toegevoegd tijdens het trainen, los
-- van het workoutschema. Zelfde target-kolommen als template_exercises.
-- Vereist migratie 003 (is_owner).

create table if not exists session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  position int not null default 0,
  target_sets int not null,
  target_reps_min int,
  target_reps_max int,
  target_seconds int,
  target_seconds_max int,
  target_note text,
  unique (session_id, exercise_id)
);

create index if not exists session_exercises_session_idx on session_exercises (session_id, position);

alter table session_exercises enable row level security;

drop policy if exists session_exercises_owner_all on session_exercises;
create policy session_exercises_owner_all on session_exercises
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Laat de API de wijzigingen meteen zien (anders: 'not found in the schema cache').
notify pgrst, 'reload schema';
