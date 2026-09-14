-- Fitness Tracker — schema (fase 1)
-- Draai dit in de Supabase SQL editor op een leeg project.

create extension if not exists "pgcrypto";

-- Oefeningen: de bibliotheek, losstaand van een specifiek schema
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_groups text[] not null,
  video_urls text[] check (video_urls is null or cardinality(video_urls) <= 3),
  notes text,
  equipment text check (equipment is null or equipment in ('losse-gewichten', 'machine', 'zonder')),
  measure text check (measure is null or measure in ('gewicht', 'reps', 'tijd')),
  catalog_key text,
  created_at timestamptz default now()
);

-- Trainingsschema's: A, B, C
create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  active boolean default true,
  position int not null default 0          -- bepaalt de rotatievolgorde A -> B -> C
);

-- Koppeling: welke oefening hoort bij welk schema, in welke volgorde, met welk doel
create table if not exists template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references workout_templates(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete restrict,
  position int not null,
  target_sets int not null,
  target_reps_min int,                     -- null bij tijdgebaseerde oefeningen
  target_reps_max int,                     -- voor "3x10-12"; null bij vast getal
  target_seconds int,                      -- voor Plank / side plank i.p.v. reps
  target_seconds_max int,                  -- voor "3x30-45 sec"
  target_note text                         -- "per been", "per kant"
);

-- Geplande/uitgevoerde sessies op een datum
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references workout_templates(id) on delete cascade,
  planned_date date not null,
  actual_date date,
  notes text,                              -- opmerking bij de hele sessie
  status text not null default 'gepland',  -- 'gepland' | 'voltooid' | 'overgeslagen' | 'verzet'
  constraint sessions_status_check
    check (status in ('gepland', 'voltooid', 'overgeslagen', 'verzet'))
);

-- Sets: één rij per set, niet per oefening (nodig voor aggregatie/grafieken)
create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  exercise_id uuid references exercises(id) on delete restrict,
  set_number int not null,
  reps int,
  weight_kg numeric,
  seconds int,
  skipped boolean default false,
  note text,                               -- opmerking bij deze oefening
  logged_at timestamptz default now()
);

-- Hoe een oefening ging: 1 tot 5 sterren en/of een opmerking, per oefening per sessie.
create table if not exists exercise_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  rating int check (rating is null or rating between 1 and 5),
  comment text,
  updated_at timestamptz default now(),
  unique (session_id, exercise_id)
);

create unique index if not exists exercises_catalog_key_idx
  on exercises (catalog_key) where catalog_key is not null;
create index if not exists template_exercises_template_idx on template_exercises (template_id, position);
create index if not exists sessions_planned_date_idx on sessions (planned_date);
create index if not exists exercise_logs_session_idx on exercise_logs (session_id);
create index if not exists exercise_logs_exercise_idx on exercise_logs (exercise_id, logged_at);

-- Eén rij per set binnen een sessie; nodig om een set te kunnen bijwerken.
create unique index if not exists exercise_logs_unique_set
  on exercise_logs (session_id, exercise_id, set_number);

-- Toegang: RLS aan op alles, en alleen de eigenaar (zie app_owners) mag erbij.
-- Anoniem krijgt niets; de app toont dan demo-data uit de browser.
alter table exercises enable row level security;
alter table workout_templates enable row level security;
alter table template_exercises enable row level security;
alter table sessions enable row level security;
alter table exercise_logs enable row level security;
alter table exercise_feedback enable row level security;

create table if not exists public.app_owners (
  email text primary key
);

-- Niemand leest deze tabel rechtstreeks; alleen is_owner() hieronder.
alter table public.app_owners enable row level security;

-- security definer: de functie mag app_owners lezen, de aanroeper niet.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_owners
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['exercises','workout_templates','template_exercises','sessions','exercise_logs','exercise_feedback']
  loop
    execute format('drop policy if exists %I on %I', t || '_anon_all', t);
    execute format('drop policy if exists %I on %I', t || '_owner_all', t);
    execute format(
      'create policy %I on %I for all to authenticated using (public.is_owner()) with check (public.is_owner())',
      t || '_owner_all', t
    );
  end loop;
end $$;

-- Daarna, met je eigen Google-adres (niet committen):
--   insert into public.app_owners (email) values ('jouw-adres@gmail.com');
