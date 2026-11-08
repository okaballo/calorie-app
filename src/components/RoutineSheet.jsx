// Create or edit a workout routine: rename it, add or remove exercises and
// sets, change each set's planned kg / reps, then Save. Works on a copy, so
// Cancel leaves the saved routine untouched; Save replaces it (same id).
// Opened from "Add New Routine" and from a routine's pencil on the Workout tab,
// or with a `draft` ({ name, exercises }) from "Splits Suggestions".
import { useRef, useState } from 'react'
import { newEntry, editEntries, exerciseOf, toRoutine, swapEntry, addPartners, supersetTags } from '../lib/workouts.js'
import { useEntryOps } from '../lib/useEntryOps.js'
import { PrimaryButton, Sheet, SheetPortal, TextInput, ConfirmDialog, muted, accentText } from './ui.jsx'
import ExerciseCard from './ExerciseCard.jsx'
import ExercisePickerSheet from './ExercisePickerSheet.jsx'
import { t } from '../lib/i18n.js'

export default function RoutineSheet({ routine, draft = null, bodyWeight = 0, onSave, onDelete, onClose }) {
  const editing = Boolean(routine)
  const [name, setName] = useState(routine?.name ?? draft?.name ?? '')
  const [entries, setEntries] = useState(() => {
    if (routine) return editEntries(routine)
    return draft ? draft.exercises.map((ex) => newEntry(ex, [], bodyWeight)) : []
  })
  const [picker, setPicker] = useState(null)            // null | { replacing: entry | null, partnerOf?: entry }
  const [confirmDelete, setConfirmDelete] = useState(false)
  const initial = useRef(draft ? null : JSON.stringify({ name, entries })) // a draft already holds the user's picks
  const dirty = JSON.stringify({ name, entries }) !== initial.current // unsaved edits: closing by swipe asks first

  const canSave = name.trim() !== '' && entries.length > 0

  const setEntry = (id, fn) => setEntries((list) => list.map((e) => (e.id === id ? fn(e) : e)))
  const ops = useEntryOps(setEntries, setPicker)
  const tags = supersetTags(entries)

  const save = () => {
    // toRoutine only copies the basics, so keep the program the routine belongs to.
    onSave({ ...toRoutine(name.trim(), entries, routine?.id), ...(routine?.program && { program: routine.program }) })
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
          <ExerciseCard key={entry.id} entry={entry} planning tag={tags[entry.id]} ops={ops} />
        ))}
      </div>

      {entries.length === 0 && (
        <p className={`px-1 text-center text-sm ${muted}`}>{t('Add at least one exercise to save this routine.')}</p>
      )}

      <PrimaryButton onClick={() => setPicker({ replacing: null })}>+ {t('Add Exercise')}</PrimaryButton>

      {editing && (
        <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-sm font-medium text-fat-deep dark:text-fat">
          {t('Delete routine')}
        </button>
      )}

      <SheetPortal>
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
      </SheetPortal>

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
