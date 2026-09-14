-- Hoe een oefening ging (sterren en een opmerking), en video's bij een oefening.
-- Vereist migratie 003 (is_owner) en draait na 004.

-- Eén rij per oefening per sessie: 1 tot 5 sterren, een opmerking, of allebei.
create table if not exists exercise_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  rating int check (rating is null or rating between 1 and 5),
  comment text,
  updated_at timestamptz default now(),
  unique (session_id, exercise_id)
);

alter table exercise_feedback enable row level security;

drop policy if exists exercise_feedback_owner_all on exercise_feedback;
create policy exercise_feedback_owner_all on exercise_feedback
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Opmerkingen die tot nu toe op een set stonden ("Ging net!") verhuizen mee,
-- zodat er niets verloren gaat. De oorspronkelijke notitie blijft op de set staan.
insert into exercise_feedback (session_id, exercise_id, comment)
select session_id, exercise_id, string_agg(note, ' ' order by set_number)
from exercise_logs
where note is not null and btrim(note) <> ''
group by session_id, exercise_id
on conflict (session_id, exercise_id) do nothing;

-- Video's staan al in exercises.video_urls; hier alleen de grens van drie.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercises_video_urls_max') then
    alter table exercises add constraint exercises_video_urls_max
      check (video_urls is null or cardinality(video_urls) <= 3);
  end if;
end $$;
