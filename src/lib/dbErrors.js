/**
 * Herkennen van databasefouten die op een ontbrekende migratie wijzen, zodat de
 * app daar netjes op kan reageren in plaats van een heel scherm te laten falen.
 */

/** PostgREST meldt een onbekende tabel als PGRST205, of met deze tekst. */
export function isMissingTable(error, table) {
  if (!error) return false;
  const message = String(error.message ?? '');
  const matches = error.code === 'PGRST205' || /could not find the table/i.test(message);
  return matches && (!table || message.includes(table) || error.code === 'PGRST205');
}

/** PostgREST meldt een onbekende kolom als PGRST204. */
export function isMissingColumn(error, column) {
  if (!error) return false;
  const message = String(error.message ?? '');
  const matches = error.code === 'PGRST204' || /could not find the .* column/i.test(message);
  return matches && (!column || message.includes(`'${column}'`));
}
