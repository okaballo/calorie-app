// Workout logging: the data shapes and the maths, so the Workout tab only
// displays results.
//
// mt.dailyWorkouts  { 'YYYY-MM-DD': workout }, keyed by TRACKING day like meals
//   workout   { name, exercises: [entry], startedAt, routineId? }   the workout IN PROGRESS that day;
//             startedAt (ms) is set by Start on a routine and drives the timer;
//             routineId is the routine it was started from (what Save updates)
//   entry     { id, exerciseId, name, sets: [set], plan? }  name is a fallback copy
//   set       { id, kg, reps, done }                   kg / reps as typed (strings)
//   plan      [{ kg, reps }] from a routine: shown as hints, filled in when a
//             set is ticked, so nothing counts until it is actually done
//
// mt.workoutHistory  finished workouts, any number per day
//   [{ id, day, name, exercises, startedAt, finishedAt }]   Finish Routine moves
//   the day's workout here, so the day is free for the next one
//
// mt.workoutTemplates  the saved routines (key kept from before they were renamed)
//   [{ id, name, exercises: [{ exerciseId, name, sets: [{ kg, reps }] }] }]
//   kg / reps saved as numbers, 0 = left empty
import { num, fmt0, fmt1 } from './calc.js'
import { EXERCISE_BY_ID } from './exercisesDB.ts'

export const EMPTY_WORKOUT = { name: '', exercises: [] }

const newId = () => crypto.randomUUID()

export const newSet = (kg = '', reps = '') => ({ id: newId(), kg, reps, done: false })

/** Sets a new exercise starts with: as many as last time, else 3. */
export const newEntry = (exercise, previous = []) => ({
  id: newId(),
  exerciseId: exercise.id,
  name: exercise.name,
  sets: Array.from({ length: previous.length || 3 }, () => newSet()),
})

/** The exercise behind an entry, falling back to the saved name. */
export const exerciseOf = (entry) =>
  EXERCISE_BY_ID[entry.exerciseId] ?? { id: entry.exerciseId, name: entry.name, muscle: null, equipment: null, secondary: [] }

/** A set counts once it has reps. */
export const isLogged = (set) => num(set.reps) > 0

export const workoutStats = (workout) => {
  const sets = workout.exercises.flatMap((e) => e.sets)
  const logged = sets.filter(isLogged)
  return {
    exercises: workout.exercises.length,
    sets: sets.length,
    done: sets.filter((s) => s.done).length,
    logged: logged.length,
    volume: logged.reduce((v, s) => v + num(s.kg) * num(s.reps), 0),
  }
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
  exercises: exercises.map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    sets: e.sets.map((s, i) => ({
      kg: num(s.kg) || num(e.plan?.[i]?.kg),
      reps: num(s.reps) || num(e.plan?.[i]?.reps),
    })),
  })),
})

/** Entries for starting a routine: empty sets, its numbers as the plan. */
export const startEntries = (routine) =>
  routine.exercises.map((e) => ({
    id: newId(),
    exerciseId: e.exerciseId,
    name: e.name,
    sets: e.sets.map(() => newSet()),
    plan: e.sets.map((s) => ({ kg: s.kg, reps: s.reps })),
  }))

/** Entries for editing a routine: its numbers are the real values in the inputs. */
export const editEntries = (routine) =>
  routine.exercises.map((e) => ({
    id: newId(),
    exerciseId: e.exerciseId,
    name: e.name,
    sets: e.sets.map((s) => newSet(s.kg ? String(s.kg) : '', s.reps ? String(s.reps) : '')),
  }))

/** "60 × 8", or "× 8" for a set without weight (bodyweight). */
export const setText = (s) => (num(s.kg) > 0 ? `${fmt1(num(s.kg))} × ${fmt0(num(s.reps))}` : `× ${fmt0(num(s.reps))}`)

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
