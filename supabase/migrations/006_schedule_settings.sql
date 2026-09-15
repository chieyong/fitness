-- Planning: op welke weekdagen je traint, en of de workouts op volgorde of
-- willekeurig per ronde rouleren. Vereist migratie 003 (is_owner).

-- Eén rij: de planning van de eigenaar. Dagen tellen als in JavaScript:
-- zondag = 0, maandag = 1, ... zaterdag = 6.
create table if not exists schedule_settings (
  id int primary key default 1 check (id = 1),
  training_days int[] not null default '{2,4,6}',
  rotation text not null default 'volgorde' check (rotation in ('volgorde', 'willekeurig')),
  updated_at timestamptz default now(),
  constraint schedule_settings_days_valid
    check (cardinality(training_days) between 1 and 7 and training_days <@ array[0,1,2,3,4,5,6])
);

alter table schedule_settings enable row level security;

drop policy if exists schedule_settings_owner_all on schedule_settings;
create policy schedule_settings_owner_all on schedule_settings
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Begin met wat de app tot nu toe deed: dinsdag, donderdag en zaterdag, op volgorde.
insert into schedule_settings (id) values (1) on conflict (id) do nothing;

-- Rondenummer per sessie, voor willekeurige volgorde: welke workouts in de
-- lopende ronde al geweest zijn. Bestaande sessies houden null.
alter table sessions add column if not exists cycle int;

-- Laat de API de wijzigingen meteen zien (anders: 'not found in the schema cache').
notify pgrst, 'reload schema';
