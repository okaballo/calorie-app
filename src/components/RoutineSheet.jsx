// Create or edit a workout routine: rename it, add or remove exercises and
// sets, change each set's planned kg / reps, then Save. Works on a copy, so
// Cancel leaves the saved routine untouched; Save replaces it (same id).
// Opened from "Add New Routine" and from a routine's pencil on the Workout tab.
import { useRef, useState } from 'react'
import {
  newEntry, newSet, editEntries, exerciseOf, toRoutine, swapEntry, addPartners, unlink, removeEntryFrom, moveEntry,
  toggleDropSet, supersetTags, addDrop, patchDrop, removeDrop,
} from '../lib/workouts.js'
import { PrimaryButton, Sheet, TextInput, ConfirmDialog, buttonBg, muted, accentText } from './ui.jsx'
import SplitsSheet from './SplitsSheet.jsx'
import ExerciseCard from './ExerciseCard.jsx'
import ExercisePickerSheet, { PickerPortal } from './ExercisePickerSheet.jsx'
import { t } from '../lib/i18n.js'

export default function RoutineSheet({ routine, bodyWeight = 0, onSave, onDelete, onClose }) {
  const editing = Boolean(routine)
  const [name, setName] = useState(routine?.name ?? '')
  const [entries, setEntries] = useState(() => (routine ? editEntries(routine) : []))
  const [picker, setPicker] = useState(null)            // null | { replacing: entry | null, partnerOf?: entry }
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [splitsOpen, setSplitsOpen] = useState(false)
  const initial = useRef(JSON.stringify({ name, entries }))
  const dirty = JSON.stringify({ name, entries }) !== initial.current // unsaved edits: closing by swipe asks first

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

  const tags = supersetTags(entries)

  const save = () => {
    onSave(toRoutine(name.trim(), entries, routine?.id))
    onClose()
  }

  return (
    <Sheet
      title={t(editing ? 'Edit Routine' : 'New Routine')} onClose={onClose} dirty={dirty}
      action={<button onClick={save} disabled={!canSave} className={`font-semibold disabled:opacity-35 ${accentText}`}>{t('Save')}</button>}
    >
      <TextInput
        value={name} onChange={(e) => setName(e.target.value)}
        placeholder={t('Routine name')} aria-label={t('Routine name')}
      />

      <div className="space-y-4">
        {entries.map((entry) => (
          <ExerciseCard
            key={entry.id}
            entry={entry}
            planning
            tag={tags[entry.id]}
            onSwap={() => setPicker({ replacing: entry })}
            onRemove={() => setEntries((list) => removeEntryFrom(list, entry.id))}
            onAddPartner={() => setPicker({ replacing: null, partnerOf: entry })}
            onMove={(dir) => setEntries((list) => moveEntry(list, entry.id, dir))}
            onUnlink={() => setEntries((list) => unlink(list, entry.id))}
            onToggleDropSet={() => setEntry(entry.id, toggleDropSet)}
            onSet={(setId, patch) => setSet(entry.id, setId, patch)}
            onAddSet={() => addSet(entry.id)}
            onRemoveSet={(setId) => removeSet(entry.id, setId)}
            onDrop={(setId, dropId, patch) => setEntry(entry.id, (e) => patchDrop(e, setId, dropId, patch))}
            onAddDrop={(setId) => setEntry(entry.id, (e) => addDrop(e, setId))}
            onRemoveDrop={(setId, dropId) => setEntry(entry.id, (e) => removeDrop(e, setId, dropId))}
          />
        ))}
      </div>

      {entries.length === 0 && (
        <p className={`px-1 text-center text-sm ${muted}`}>{t('Add at least one exercise to save this routine.')}</p>
      )}

      <PrimaryButton onClick={() => setPicker({ replacing: null })}>+ {t('Add Exercise')}</PrimaryButton>
      <button
        onClick={() => setSplitsOpen(true)}
        className={`w-full rounded-2xl py-3 font-semibold transition active:scale-[0.98] ${buttonBg} ${accentText}`}
      >
        {t('Splits Suggestions')}
      </button>

      {editing && (
        <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-sm font-medium text-fat-deep dark:text-fat">
          {t('Delete routine')}
        </button>
      )}

      <PickerPortal>
        {splitsOpen && (
          <SplitsSheet
            key="splits"
            added={entries.map((e) => e.exerciseId)}
            onAdd={(list, dayName) => {
              setEntries((all) => [...all, ...list.map((ex) => newEntry(ex, [], bodyWeight))])
              if (dayName && !name.trim()) setName(dayName)
            }}
            onClose={() => setSplitsOpen(false)}
          />
        )}
        {picker && (
          <ExercisePickerSheet
            key="exercise-picker"
            replacing={picker.replacing && exerciseOf(picker.replacing)}
            partnerOf={picker.partnerOf && exerciseOf(picker.partnerOf).name}
            onPick={(list) => {
              const made = list.map((ex) => newEntry(ex, [], bodyWeight))
              if (picker.replacing) setEntry(picker.replacing.id, (e) => swapEntry(e, list[0], bodyWeight))
              else if (picker.partnerOf) setEntries((all) => addPartners(all, picker.partnerOf.id, made))
              else setEntries((all) => [...all, ...made])
            }}
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
