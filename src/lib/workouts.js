// Workout logging: the data shapes and the maths, so the Workout tab only
// displays results.
//
// mt.dailyWorkouts  { 'YYYY-MM-DD': workout }, keyed by TRACKING day like meals
//   workout   { name, exercises: [entry], startedAt, routineId? }   the workout IN PROGRESS that day;
//             startedAt (ms) is set by Start on a routine and drives the timer;
//             routineId is the routine it was started from (what Save updates)
//   entry     { id, exerciseId, name, sets: [set], plan?, group?, dropSet?, bw? }  name is a fallback copy
//   set       { id, kg, reps, done, drops? }           kg / reps as typed (strings)
//   plan      [{ kg, reps, drops? }] from a routine: shown as hints, filled in
//             when a set is ticked, so nothing counts until it is actually done
//   group     superset: entries that sit next to each other with the same group
//             id are done back to back. Only adjacent runs count (supersetTags),
//             so dragging an exercise past a member while reordering does not
//             break the pair; tidyGroups clears the leftovers when saving or
//             changing a superset
//   dropSet   true: each set may have `drops` [{ id, kg, reps }], lighter
//             rounds done straight after it without rest
//   bw        body weight (kg) when the exercise was added, only for bodyweight
//             exercises. Their `kg` is the EXTRA weight (belt, vest, dumbbell)
//             and volume = (bw + extra) x reps
//
// mt.workoutHistory  finished workouts, any number per day
//   [{ id, day, name, exercises, startedAt, finishedAt }]   Finish Routine moves
//   the day's workout here, so the day is free for the next one
//
// mt.workoutTemplates  the saved routines (key kept from before they were renamed)
//   [{ id, name, exercises: [{ exerciseId, name, group?, dropSet?, sets: [{ kg, reps, drops?: [{ kg, reps }] }] }] }]
//   kg / reps saved as numbers, 0 = left empty
import { num, fmt0, fmt1 } from './calc.js'
import { getExercise } from './exercisesDB.ts'

export const EMPTY_WORKOUT = { name: '', exercises: [] }

const newId = () => crypto.randomUUID()

export const newSet = (kg = '', reps = '') => ({ id: newId(), kg, reps, done: false })
export const newDrop = (kg = '', reps = '') => ({ id: newId(), kg, reps })

/** Bodyweight exercises are lifted with your own weight: their kg is only what you add. */
export const isBodyweight = (exercise) => exercise?.equipment === 'Bodyweight'

/** Body weight to remember on an entry: the latest weigh-in, for bodyweight exercises only. */
const bwFor = (exercise, bodyWeight) => (isBodyweight(exercise) && num(bodyWeight) > 0 ? { bw: num(bodyWeight) } : {})

/** Sets a new exercise starts with: as many as last time, else 3. */
export const newEntry = (exercise, previous = [], bodyWeight = 0) => ({
  id: newId(),
  exerciseId: exercise.id,
  name: exercise.name,
  sets: Array.from({ length: previous.length || 3 }, () => newSet()),
  ...bwFor(exercise, bodyWeight),
})

/** An entry with another exercise in it (swap): bodyweight exercises take the current body weight. */
export const swapEntry = ({ plan: _plan, bw: _bw, ...entry }, exercise, bodyWeight = 0) => ({
  ...entry, exerciseId: exercise.id, name: exercise.name, ...bwFor(exercise, bodyWeight),
})

/** The exercise behind an entry, falling back to the saved name. */
export const exerciseOf = (entry) =>
  getExercise(entry.exerciseId) ?? { id: entry.exerciseId, name: entry.name, muscle: null, equipment: null, secondary: [] }

/** A set counts once it has reps. */
export const isLogged = (set) => num(set.reps) > 0

/** kg x reps of a set and its drops, with the body weight on top for bodyweight exercises. */
export const setVolume = (entry, set) => {
  const load = (s) => (num(s.kg) + num(entry.bw)) * num(s.reps)
  const drops = entry.dropSet ? (set.drops ?? []).filter(isLogged).reduce((v, d) => v + load(d), 0) : 0
  return (isLogged(set) ? load(set) : 0) + drops
}

export const workoutStats = (workout) => {
  const sets = workout.exercises.flatMap((e) => e.sets)
  return {
    exercises: workout.exercises.length,
    sets: sets.length,
    done: sets.filter((s) => s.done).length,
    logged: sets.filter(isLogged).length,
    volume: workout.exercises.reduce((v, e) => v + e.sets.reduce((n, s) => n + setVolume(e, s), 0), 0),
  }
}

// ---- Supersets, drop sets and order -------------------------------------------
// All take and return the list of entries, so the routine editor and the
// workout screen share them.

/** A group only means something while its members sit next to each other. */
export const tidyGroups = (entries) => entries.map((e, i) => (
  e.group && entries[i - 1]?.group !== e.group && entries[i + 1]?.group !== e.group
    ? { ...e, group: undefined } : e
))

/**
 * Superset new entries with the one `id`: they go right after it (after the end
 * of its superset, if it is already in one) and share its group.
 */
export const addPartners = (all, id, partners) => {
  const entries = tidyGroups(all)
  const i = entries.findIndex((e) => e.id === id)
  if (i < 0 || partners.length === 0) return all
  const group = entries[i].group ?? newId()
  let end = i
  while (entries[end + 1]?.group === group) end++
  return [
    ...entries.slice(0, end + 1).map((e, j) => (j === i ? { ...e, group } : e)),
    ...partners.map((p) => ({ ...p, group })),
    ...entries.slice(end + 1),
  ]
}

/** Take the entry out of its superset. */
export const unlink = (entries, id) => tidyGroups(tidyGroups(entries).map((e) => (e.id === id ? { ...e, group: undefined } : e)))

/** Remove an entry (and a superset it leaves with only one member). */
export const removeEntryFrom = (entries, id) => tidyGroups(tidyGroups(entries).filter((e) => e.id !== id))

/** Swap an entry with its neighbour above (dir -1) or below (dir +1). */
export const moveEntry = (entries, id, dir) => {
  const i = entries.findIndex((e) => e.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= entries.length) return entries
  const next = [...entries]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** Turn drop set on or off for an entry; off forgets its drops. */
export const toggleDropSet = (entry) => (entry.dropSet
  ? { ...entry, dropSet: undefined, sets: entry.sets.map(({ drops: _d, ...s }) => s) }
  : { ...entry, dropSet: true })

const mapSet = (entry, setId, fn) => ({ ...entry, sets: entry.sets.map((s) => (s.id === setId ? fn(s) : s)) })

/** A new empty drop under a set. */
export const addDrop = (entry, setId) => mapSet(entry, setId, (s) => ({ ...s, drops: [...(s.drops ?? []), newDrop()] }))

export const patchDrop = (entry, setId, dropId, patch) =>
  mapSet(entry, setId, (s) => ({ ...s, drops: s.drops.map((d) => (d.id === dropId ? { ...d, ...patch } : d)) }))

export const removeDrop = (entry, setId, dropId) =>
  mapSet(entry, setId, (s) => ({ ...s, drops: s.drops.filter((d) => d.id !== dropId) }))

/** { entryId: { n, of } } for entries that sit together in a superset: "Superset 2/3". */
export const supersetTags = (entries) => {
  const tags = {}
  for (let i = 0; i < entries.length; i++) {
    const g = entries[i].group
    if (!g) continue
    let start = i
    while (entries[start - 1]?.group === g) start--
    let end = i
    while (entries[end + 1]?.group === g) end++
    if (end > start) tags[entries[i].id] = { n: i - start + 1, of: end - start + 1 }
  }
  return tags
}

/** Gives each group a fresh id, so starting a routine twice never joins two supersets. */
const freshGroups = (list) => {
  const map = {}
  return list.map((e) => (e.group ? { ...e, group: (map[e.group] ??= newId()) } : e))
}

/** Newest first: by tracking day, then by when it was finished. */
export const byRecent = (a, b) => b.day.localeCompare(a.day) || (b.finishedAt ?? 0) - (a.finishedAt ?? 0)

/**
 * Does a finished workout belong to this routine? By the routine it was
 * started from; workouts without one (from before that was recorded, or
 * repeated from history) count when their name is the routine's name, as long
 * as the routine they point at no longer exists.
 */
export const fromRoutine = (workout, routine, routines) =>
  workout.routineId === routine.id ||
  (!routines.some((r) => r.id === workout.routineId) &&
    workout.name.trim().toLowerCase() === routine.name.trim().toLowerCase())

/** Volume (kg x reps) per day of a routine's finished workouts, oldest first, for the chart. */
export function routineVolume(history, routine, routines) {
  const byDay = new Map()
  for (const h of history) {
    if (!fromRoutine(h, routine, routines)) continue
    byDay.set(h.day, (byDay.get(h.day) ?? 0) + workoutStats(h).volume)
  }
  return [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }))
}

/** The logged sets of an exercise from the latest finished workout on or before `day`, or []. */
export function lastSets(history, exerciseId, day) {
  for (const h of history.filter((w) => w.day <= day).sort(byRecent)) {
    const sets = h.exercises.find((e) => e.exerciseId === exerciseId)?.sets.filter(isLogged)
    if (sets?.length) return sets
  }
  return []
}

/**
 * The heaviest weight ever lifted in each set position of an exercise, from the
 * finished workouts on or before `day`: [best of set 1, best of set 2, ...].
 * A position with no logged weight is 0 (bodyweight sets stay 0).
 */
export function bestSets(history, exerciseId, day) {
  const best = []
  for (const h of history) {
    if (h.day > day) continue
    h.exercises.filter((e) => e.exerciseId === exerciseId).forEach((e) =>
      e.sets.forEach((s, i) => { if (isLogged(s)) best[i] = Math.max(best[i] ?? 0, num(s.kg)) }))
  }
  return Array.from(best, (v) => v ?? 0)
}

/** Copies exercises into a routine (values only, no ticks). A set left empty
 *  keeps its planned values, so re-saving loses nothing. Pass `id` to replace
 *  an existing routine. */
export const toRoutine = (name, exercises, id = newId()) => ({
  id,
  name,
  exercises: tidyGroups(exercises).map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    ...(e.group && { group: e.group }),
    ...(e.dropSet && { dropSet: true }),
    sets: e.sets.map((s, i) => ({
      kg: num(s.kg) || num(e.plan?.[i]?.kg),
      reps: num(s.reps) || num(e.plan?.[i]?.reps),
      ...(e.dropSet && s.drops?.length && {
        drops: s.drops.map((d, j) => ({
          kg: num(d.kg) || num(e.plan?.[i]?.drops?.[j]?.kg),
          reps: num(d.reps) || num(e.plan?.[i]?.drops?.[j]?.reps),
        })),
      }),
    })),
  })),
})

/** Entries for starting a routine: empty sets, its numbers as the plan. */
export const startEntries = (routine, bodyWeight = 0) =>
  freshGroups(routine.exercises.map((e) => ({
    id: newId(),
    exerciseId: e.exerciseId,
    name: e.name,
    group: e.group,
    ...(e.dropSet && { dropSet: true }),
    sets: e.sets.map((s) => ({ ...newSet(), ...(e.dropSet && s.drops?.length && { drops: s.drops.map(() => newDrop()) }) })),
    plan: e.sets.map((s) => ({ kg: s.kg, reps: s.reps, drops: s.drops })),
    ...bwFor(getExercise(e.exerciseId), bodyWeight),
  })))

/** Entries for editing a routine: its numbers are the real values in the inputs. */
export const editEntries = (routine) =>
  freshGroups(routine.exercises.map((e) => ({
    id: newId(),
    exerciseId: e.exerciseId,
    name: e.name,
    group: e.group,
    ...(e.dropSet && { dropSet: true }),
    sets: e.sets.map((s) => ({
      ...newSet(s.kg ? String(s.kg) : '', s.reps ? String(s.reps) : ''),
      ...(e.dropSet && s.drops?.length && {
        drops: s.drops.map((d) => newDrop(d.kg ? String(d.kg) : '', d.reps ? String(d.reps) : '')),
      }),
    })),
  })))

/** "60 x 8", or "x 8" for a set without weight. Bodyweight sets show only what was added: "+10 x 8". */
export const setText = (s, bodyweight = false) => {
  const kg = num(s.kg) > 0 ? `${bodyweight ? '+' : ''}${fmt1(num(s.kg))} ` : ''
  return `${kg}× ${fmt0(num(s.reps))}`
}

/** In progress: started with a routine and not finished yet. */
export const isLive = (workout) => Boolean(workout.startedAt) && !workout.finishedAt

/** "7:05" or "1:02:09" from milliseconds. */
export const formatDuration = (ms) => {
  const total = Math.max(Math.floor(ms / 1000), 0)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export const isEmptyWorkout = (workout) => !workout || (workout.exercises.length === 0 && !workout.name.trim())

/**
 * Muscles worked by a list of finished workouts: muscle -> { exercises, sets, primary, last, items }.
 * An exercise counts for its primary and its secondary muscles; `primary` is true when at least
 * one exercise had it as the main muscle; `last` is the latest day it was worked; `items` are the
 * exercises ({ id, name, text }) with their logged sets. Only logged sets count.
 */
export const musclesOn = (workouts) => {
  const out = {}
  for (const w of workouts) {
    for (const e of w.exercises) {
      const ex = exerciseOf(e)
      if (!ex.muscle) continue
      const logged = e.sets.filter(isLogged)
      const text = logged.map((s) => setText(s, isBodyweight(ex))).join(', ')
      for (const m of [ex.muscle, ...ex.secondary]) {
        const s = (out[m] ??= { exercises: 0, sets: 0, primary: false, last: '', items: [] })
        s.exercises += 1
        s.sets += logged.length
        if (m === ex.muscle) s.primary = true
        if (w.day > s.last) s.last = w.day
        s.items.push({ id: `${w.id}-${e.id}`, name: ex.name, text })
      }
    }
  }
  return out
}
