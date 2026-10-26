// The workout of one tracking day, full screen: its name, totals, every
// exercise with its sets, "Add Exercise" and Finish Routine. Opened from the
// Workout tab (Start on a routine, or Continue Routine), so the
// tab itself stays a short list of routines instead of a stack of cards.
// All edits go straight to mt.dailyWorkouts through `onUpdate`.
//
// Save (top right) writes the exercises back to the routine this workout was
// started from. It lights up only once the exercise list differs from that
// routine (an exercise added, removed, replaced or reordered). A workout with
// no source routine (e.g. a repeated one) asks for a name and saves a new one.
import { useState } from 'react'
import { fmt0 } from '../lib/calc.js'
import { EMPTY_WORKOUT, newEntry, newSet, exerciseOf, workoutStats, lastSets, bestSets, toRoutine } from '../lib/workouts.js'
import {
  Card, PrimaryButton, Sheet, TextInput, ConfirmDialog, NameDialog, muted, accentText,
} from './ui.jsx'
import ExerciseCard from './ExerciseCard.jsx'
import ExercisePickerSheet, { PickerPortal } from './ExercisePickerSheet.jsx'
import { t } from '../lib/i18n.js'

export default function WorkoutSessionSheet({
  dayLabel, workout, history, day, routines, onUpdate, onFinish, onSaveRoutine, onClose,
}) {
  const stats = workoutStats(workout)
  const hasExercises = workout.exercises.length > 0

  const [picker, setPicker] = useState(null)            // null | { replacing: entry | null }
  const [naming, setNaming] = useState(false)           // name dialog for a workout with no source routine
  const [savedFlash, setSavedFlash] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // All functional, so quick typing never loses a keystroke.
  const update = (fn) => onUpdate(day, fn)
  const setEntry = (id, fn) => update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.id === id ? fn(e) : e)) }))
  const setSet = (entryId, setId, patch) =>
    setEntry(entryId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }))
  // A new set starts from the last one's numbers, like most lifting logs.
  const addSet = (entryId) => setEntry(entryId, (e) => {
    const last = e.sets[e.sets.length - 1]
    return { ...e, sets: [...e.sets, newSet(last?.kg ?? '', last?.reps ?? '')] }
  })
  // The plan is matched by position, so it loses the same row.
  const removeSet = (entryId, setId) => setEntry(entryId, (e) => {
    const i = e.sets.findIndex((s) => s.id === setId)
    return { ...e, sets: e.sets.filter((_, j) => j !== i), plan: e.plan?.filter((_, j) => j !== i) }
  })
  const removeEntry = (id) => update((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== id) }))

  const addExercises = (list) => update((w) => ({
    ...w,
    exercises: [...w.exercises, ...list.map((ex) => newEntry(ex, lastSets(history, ex.id, day)))],
  }))
  // Logged sets are kept; planned weights were for the old exercise, so they go.
  // eslint-disable-next-line no-unused-vars
  const swapExercise = (entryId, ex) => setEntry(entryId, ({ plan, ...e }) => ({ ...e, exerciseId: ex.id, name: ex.name }))

  // The routine this workout was started from, if it still exists.
  const source = routines.find((r) => r.id === workout.routineId)
  const changed = source
    ? source.exercises.map((e) => e.exerciseId).join() !== workout.exercises.map((e) => e.exerciseId).join()
    : hasExercises
  const flash = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const save = () => {
    if (!source) return setNaming(true)
    onSaveRoutine(toRoutine(source.name, workout.exercises, source.id))
    flash()
  }
  // No source routine: save a new one and make it this workout's source.
  const saveNew = (name) => {
    const routine = toRoutine(name, workout.exercises)
    onSaveRoutine(routine)
    update((w) => ({ ...w, routineId: routine.id }))
    setNaming(false)
    flash()
  }
  const finish = () => {
    onFinish(day)
    onClose()
  }

  return (
    <Sheet
      title={workout.name.trim() || t('Workout')} onClose={onClose} closeLabel="Done"
      action={(
        <button onClick={save} disabled={!changed && !savedFlash} className={`font-semibold disabled:opacity-35 ${accentText}`}>
          {t(savedFlash ? 'Saved' : 'Save')}
        </button>
      )}
    >
      <Card className="space-y-3.5">
        <div className="flex items-baseline justify-between">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${muted}`}>{t('Workout')}</p>
          <p className="text-sm font-semibold">{dayLabel}</p>
        </div>
        <TextInput
          value={workout.name}
          onChange={(e) => update((w) => ({ ...w, name: e.target.value }))}
          placeholder={t('Workout name (optional)')} aria-label={t('Workout name (optional)')}
        />
        <div className="grid grid-cols-3 divide-x divide-black/6 text-center dark:divide-white/8">
          <div>
            <p className="text-xl font-semibold tabular-nums">{stats.exercises}</p>
            <p className={`text-xs ${muted}`}>{t('Exercises')}</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums">
              {stats.done}<span className={`text-sm font-normal ${muted}`}>/{stats.sets}</span>
            </p>
            <p className={`text-xs ${muted}`}>{t('Sets done')}</p>
          </div>
          <div>
            <p className={`text-xl font-semibold tabular-nums ${stats.volume > 0 ? accentText : ''}`}>{fmt0(stats.volume)}</p>
            <p className={`text-xs ${muted}`}>{t('Volume (kg)')}</p>
          </div>
        </div>
      </Card>

      {workout.exercises.map((entry) => (
        <ExerciseCard
          key={entry.id}
          entry={entry}
          previous={lastSets(history, entry.exerciseId, day)}
          best={bestSets(history, entry.exerciseId, day)}
          onSwap={() => setPicker({ replacing: entry })}
          onRemove={() => removeEntry(entry.id)}
          onSet={(setId, patch) => setSet(entry.id, setId, patch)}
          onAddSet={() => addSet(entry.id)}
          onRemoveSet={(setId) => removeSet(entry.id, setId)}
        />
      ))}

      {!hasExercises && <p className={`px-1 text-center text-sm ${muted}`}>{t('No exercises logged for this day yet.')}</p>}
      <PrimaryButton onClick={() => setPicker({ replacing: null })}>+ {t('Add Exercise')}</PrimaryButton>

      {hasExercises && (
        <>
          <button
            onClick={finish}
            className="w-full rounded-2xl border-[0.5px] border-black/10 bg-white py-3.5 font-semibold transition active:scale-[0.98] active:bg-black/5 dark:border-white/12 dark:bg-white/4 dark:active:bg-white/8"
          >
            {t('Finish Routine')}
          </button>
          <button onClick={() => setConfirmClear(true)} className="w-full py-2 text-sm font-medium text-fat-deep dark:text-fat">
            {t('Clear Workout')}
          </button>
        </>
      )}

      <PickerPortal>
        {picker && (
          <ExercisePickerSheet
            key="exercise-picker"
            replacing={picker.replacing && exerciseOf(picker.replacing)}
            onPick={(list) => (picker.replacing ? swapExercise(picker.replacing.id, list[0]) : addExercises(list))}
            onClose={() => setPicker(null)}
          />
        )}
      </PickerPortal>

      {naming && (
        <NameDialog
          title={t('Save as Routine')}
          message={t(stats.exercises === 1
            ? '1 exercise. Start it from Routines next time.'
            : '{n} exercises. Start it from Routines next time.', { n: stats.exercises })}
          initial={workout.name}
          placeholder={t('Routine name')}
          confirmLabel={t('Save')}
          onCancel={() => setNaming(false)}
          onConfirm={saveNew}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title={t('Clear this workout?')}
          message={t("This removes every exercise and set logged on {day}. It can't be undone.", { day: dayLabel })}
          confirmLabel={t('Clear')}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => { update(() => EMPTY_WORKOUT); setConfirmClear(false) }}
        />
      )}
    </Sheet>
  )
}
