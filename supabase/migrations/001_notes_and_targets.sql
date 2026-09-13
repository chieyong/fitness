-- Uitbreidingen voor de echte data en voor opmerkingen bij een sessie.
-- Alles additief: bestaande rijen blijven geldig.

-- Opmerking bij een sessie ("het ging net!").
alter table sessions add column if not exists notes text;

-- Opmerking bij één oefening binnen een sessie. De brondata heeft dit al
-- ("Schouderpers ... Ging net!"), dus session-niveau alleen is niet genoeg.
alter table exercise_logs add column if not exists note text;

-- Targets als "3x30-45 sec" hebben een boven- en ondergrens nodig.
alter table template_exercises add column if not exists target_seconds_max int;

-- Vrije toevoeging aan een target: "per been", "per kant".
alter table template_exercises add column if not exists target_note text;

-- Tijdgebaseerde oefeningen hebben geen reps; dan hoort dit veld leeg te zijn
-- in plaats van een dummywaarde te dragen.
alter table template_exercises alter column target_reps_min drop not null;
