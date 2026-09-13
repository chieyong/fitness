-- Eén rij per set binnen een sessie. Zonder deze sleutel levert het bijwerken
-- van een set een tweede rij op in plaats van een wijziging.
create unique index if not exists exercise_logs_unique_set
  on exercise_logs (session_id, exercise_id, set_number);
