-- Alleen de eigenaar ziet en wijzigt de gegevens.
--
-- Tot nu toe mocht de anon-sleutel alles. Die sleutel staat in de publieke
-- bundel, dus iedereen met de URL kon de trainingsdata lezen en aanpassen.
-- Na deze migratie krijgt anoniem niets meer; de app toont dan demo-data die
-- in de browser zelf wordt gemaakt.
--
-- Wie eigenaar is staat in een tabel, niet in dit bestand: zo komt geen
-- e-mailadres in de repository, en kan er later iemand bij zonder de policies
-- te herschrijven. Vul die tabel direct na deze migratie (zie onderaan).

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
  foreach t in array array['exercises','workout_templates','template_exercises','sessions','exercise_logs']
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
