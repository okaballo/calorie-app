// How the app's localStorage data maps to the Supabase tables (supabase/schema.sql).
//
// Collections: arrays of records with an `id`. Each record is one row, so a
// change to one meal sends one row, and a delete becomes a "tombstone"
// (deleted_at set) that other devices pick up.
//   mt.meals          -> meals_log
//   mt.weights        -> weight_log
//   mt.workoutHistory -> workouts_log   (finished workouts)
//
// Documents: everything else is small and per-user, so it lives in columns of
// the user's single `profiles` row. Only the columns that changed are sent.

/** Tracking-day key ("YYYY-MM-DD") of a meal without a `day` (old saves). */
const dayOf = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const isoOrNull = (v) => {
  if (v === undefined || v === null || v === '') return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
const msOrUndefined = (v) => (v ? new Date(v).getTime() : undefined)

export const COLLECTIONS = [
  {
    key: 'mt.meals',
    table: 'meals_log',
    toRow: (m) => ({
      id: String(m.id),
      day: m.day ?? dayOf(m.date),
      eaten_at: isoOrNull(m.date),
      name: m.name ?? '',
      items: Array.isArray(m.items) ? m.items : [],
    }),
    fromRow: (r) => ({ id: r.id, name: r.name ?? '', date: r.eaten_at, day: r.day, items: r.items ?? [] }),
    // newest first, like App keeps it
    sort: (a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')),
  },
  {
    key: 'mt.weights',
    table: 'weight_log',
    toRow: (w) => ({ id: String(w.id), date: w.date, kg: Number(w.kg) }),
    fromRow: (r) => ({ id: r.id, date: r.date, kg: Number(r.kg) }),
    // oldest first
    sort: (a, b) => String(a.date).localeCompare(String(b.date)),
  },
  {
    key: 'mt.workoutHistory',
    table: 'workouts_log',
    toRow: (w) => ({
      id: String(w.id),
      day: w.day ?? null,
      name: w.name ?? '',
      routine_id: w.routineId ?? null,
      started_at: isoOrNull(w.startedAt),
      finished_at: isoOrNull(w.finishedAt),
      exercises: Array.isArray(w.exercises) ? w.exercises : [],
    }),
    fromRow: (r) => {
      const w = { id: r.id, day: r.day, name: r.name ?? '', exercises: r.exercises ?? [] }
      if (r.routine_id) w.routineId = r.routine_id
      const s = msOrUndefined(r.started_at); if (s) w.startedAt = s
      const f = msOrUndefined(r.finished_at); if (f) w.finishedAt = f
      return w
    },
    // newest first: by tracking day, then by when it was finished (lib/workouts.js byRecent)
    sort: (a, b) => String(b.day ?? '').localeCompare(String(a.day ?? '')) || (b.finishedAt ?? 0) - (a.finishedAt ?? 0),
  },
]

/** Union of two arrays of records by `id`; `first` wins when both have one. */
const unionById = (first, second) => {
  const seen = new Set((first ?? []).map((x) => x && x.id))
  return [...(first ?? []), ...(second ?? []).filter((x) => x && !seen.has(x.id))]
}
const unionValues = (a, b) => [...new Set([...(a ?? []), ...(b ?? [])])]

// Columns of the profiles row. `nullable`: null is a real value (removed), not "unset".
// `merge` is used only on a device's FIRST sync:
// the user's library (their own foods, meals, routines, cheat days) is joined
// with what is already in the cloud instead of being replaced by it.
export const PROFILE_FIELDS = [
  { key: 'mt.profile', column: 'profile' },
  { key: 'mt.avatar', column: 'avatar', nullable: true },        // null = the photo was removed
  { key: 'mt.theme', column: 'theme' },
  { key: 'mt.lang', column: 'lang' },
  { key: 'mt.gymEquipment', column: 'gym_equipment' },
  { key: 'mt.volumeRoutine', column: 'volume_routine', nullable: true },
  { key: 'mt.customFoods', column: 'custom_foods', merge: unionById },
  { key: 'mt.templates', column: 'saved_meals', merge: unionById },
  { key: 'mt.workoutTemplates', column: 'routines', merge: unionById },
  { key: 'mt.customExercises', column: 'custom_exercises', merge: unionById },
  { key: 'mt.cheatDays', column: 'cheat_days', merge: unionValues },
  { key: 'mt.activeDay', column: 'active_day' },
  { key: 'mt.dailyWorkouts', column: 'live_workouts' },
]

export const COLLECTION_BY_KEY = Object.fromEntries(COLLECTIONS.map((c) => [c.key, c]))
export const FIELD_BY_KEY = Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, f]))
/** Every localStorage key that is synced. (mt.holdHint and the like stay on the device.) */
export const SYNCED_KEYS = [...COLLECTIONS.map((c) => c.key), ...PROFILE_FIELDS.map((f) => f.key)]
