// Create or edit a workout routine: rename it, add or remove exercises and
// sets, change each set's planned kg / reps, then Save. Works on a copy, so
// Cancel leaves the saved routine untouched; Save replaces it (same id).
// Opened from "Add New Routine" and from a routine's pencil on the Workout tab.
import { useState } from 'react'
import { newEntry, newSet, editEntries, exerciseOf, toRoutine } from '../lib/workouts.js'
import { PrimaryButton, Sheet, TextInput, ConfirmDialog, muted, accentText } from './ui.jsx'
import ExerciseCard from './ExerciseCard.jsx'
import ExercisePickerSheet, { PickerPortal } from './ExercisePickerSheet.jsx'
import { t } from '../lib/i18n.js'

export default function RoutineSheet({ routine, onSave, onDelete, onClose }) {
  const editing = Boolean(routine)
  const [name, setName] = useState(routine?.name ?? '')
  const [entries, setEntries] = useState(() => (routine ? editEntries(routine) : []))
  const [picker, setPicker] = useState(null)            // null | { replacing: entry | null }
  const [confirmDelete, setConfirmDelete] = useState(false)

  const canSave = name.trim() !== '' && entries.length > 0

  const setEntry = (id, fn) => setEntries((list) => list.map((e) => (e.id === id ? fn(e) : e)))
  const setSet = (entryId, setId, patch) =>
    setEntry(entryId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }))
  // A new set starts from the last one's numbers.
  const addSet = (entryId) => setEntry(entryId, (e) => {
    const last = e.sets[e.sets.length - 1]
    return { ...e, sets: [...e.sets, newSet(last?.kg ?? '', last?.reps ?? '')] }
  })
  const removeSet = (entryId, setId) => setEntry(entryId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }))

  const save = () => {
    onSave(toRoutine(name.trim(), entries, routine?.id))
    onClose()
  }

  return (
    <Sheet
      title={t(editing ? 'Edit Routine' : 'New Routine')} onClose={onClose}
      action={<button onClick={save} disabled={!canSave} className={`font-semibold disabled:opacity-35 ${accentText}`}>{t('Save')}</button>}
    >
      <TextInput
        value={name} onChange={(e) => setName(e.target.value)}
        placeholder={t('Routine name')} aria-label={t('Routine name')}
      />

      {entries.map((entry) => (
        <ExerciseCard
          key={entry.id}
          entry={entry}
          planning
          onSwap={() => setPicker({ replacing: entry })}
          onRemove={() => setEntries((list) => list.filter((e) => e.id !== entry.id))}
          onSet={(setId, patch) => setSet(entry.id, setId, patch)}
          onAddSet={() => addSet(entry.id)}
          onRemoveSet={(setId) => removeSet(entry.id, setId)}
        />
      ))}

      {entries.length === 0 && (
        <p className={`px-1 text-center text-sm ${muted}`}>{t('Add at least one exercise to save this routine.')}</p>
      )}

      <PrimaryButton onClick={() => setPicker({ replacing: null })}>+ {t('Add Exercise')}</PrimaryButton>

      {editing && (
        <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-sm font-medium text-fat-deep dark:text-fat">
          {t('Delete routine')}
        </button>
      )}

      <PickerPortal>
        {picker && (
          <ExercisePickerSheet
            key="exercise-picker"
            replacing={picker.replacing && exerciseOf(picker.replacing)}
            onPick={(list) => (picker.replacing
              ? setEntry(picker.replacing.id, (e) => ({ ...e, exerciseId: list[0].id, name: list[0].name }))
              : setEntries((all) => [...all, ...list.map((ex) => newEntry(ex))]))}
            onClose={() => setPicker(null)}
          />
        )}
      </PickerPortal>

      {confirmDelete && (
        <ConfirmDialog
          title={t('Delete {name}?', { name: routine.name })}
          message={t('Workouts you already logged from it are not affected.')}
          confirmLabel={t('Delete')}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { onDelete(routine.id); onClose() }}
        />
      )}
    </Sheet>
  )
}
