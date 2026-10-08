/**
 * Extra oefeningen in één sessie, in dezelfde vorm als de oefeningen uit het
 * workoutschema, zodat het scherm ze op dezelfde manier toont en logt. Een extra
 * die (inmiddels) al in de workout staat, tonen we niet dubbel.
 */
export function extraItems(extras, exercisesById, templateRows = []) {
  const inWorkout = new Set(templateRows.map((r) => r.exercise_id));
  return extras
    .filter((x) => !inWorkout.has(x.exercise_id) && exercisesById.has(x.exercise_id))
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((x) => {
      const e = exercisesById.get(x.exercise_id);
      return {
        ...x,
        id: `extra:${x.id}`,
        extraId: x.id,
        extra: true,
        alternative: null,
        swapped: false,
        exercise: {
          id: e.id, name: e.name, muscle_groups: e.muscle_groups, notes: e.notes ?? null,
          video_urls: e.video_urls ?? null, catalog_key: e.catalog_key ?? null,
        },
      };
    });
}
