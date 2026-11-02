// Pick exercises from the built-in database (lib/exercisesDB.ts).
//
//   add mode   tap rows to select several, then Add. They are added in the
//              order they were tapped.
//   swap mode  (`replacing` = the exercise being swapped) opens on the same
//              muscle with the closest alternatives first; one tap swaps.
//
// "Create custom exercise" adds the user's own exercise (CustomExerciseSheet),
// kept in mt.customExercises and shown here like the built-in ones.
//
// "My equipment" is remembered (mt.gymEquipment), so someone whose gym has no
// Smith machine or cables only ever sees exercises they can actually do.
import { useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { MUSCLES, EQUIPMENT, filterExercises, findAlternatives, isCustomId, setCustomExercises } from '../lib/exercisesDB.ts'
import { CustomExercisesContext } from '../lib/customExercisesContext.js'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { Sheet, SearchInput, AddButton, Chip, ChipRow, ConfirmDialog, muted, faint, accentText, divider } from './ui.jsx'
import CustomExerciseSheet from './CustomExerciseSheet.jsx'
import { t } from '../lib/i18n.js'

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)

/**
 * Where to render the picker: into <body>, because the screens that open it
 * are themselves sliding, transformed panels (a fixed sheet inside a transform
 * is positioned against that panel). data-no-swipe keeps drags in the picker
 * from switching tabs. Children are <ExercisePickerSheet key=...> or nothing.
 */
export const PickerPortal = ({ children }) => createPortal(
  <div data-no-swipe><AnimatePresence>{children}</AnimatePresence></div>,
  document.body,
)

export default function ExercisePickerSheet({ replacing = null, partnerOf = null, onPick, onClose }) {
  const swap = Boolean(replacing)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState(replacing?.muscle ?? null)
  const [equipment, setEquipment] = useLocalStorage('mt.gymEquipment', [])
  const [selected, setSelected] = useState([]) // exercises, in tap order
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(null) // custom exercise awaiting confirmation
  const { list: custom, setList: setCustom } = useContext(CustomExercisesContext)
  setCustomExercises(custom) // the lookups below read the registry; keep it in step with this render


  const toggleEquipment = (eq) =>
    setEquipment((list) => (list.includes(eq) ? list.filter((x) => x !== eq) : [...list, eq]))

  const results = useMemo(() => {
    // Swapping with no search and the original muscle: best matches first.
    if (swap && !query.trim() && muscle === replacing.muscle) return findAlternatives(replacing.id, equipment)
    return filterExercises({ query, muscle, equipment }).filter((e) => e.id !== replacing?.id)
  }, [swap, replacing, query, muscle, equipment, custom])

  const isSelected = (ex) => selected.some((s) => s.id === ex.id)
  const toggle = (ex) => setSelected((list) => (isSelected(ex) ? list.filter((s) => s.id !== ex.id) : [...list, ex]))

  const tap = (ex) => {
    if (!swap) return toggle(ex)
    onPick([ex])
    onClose()
  }

  const add = () => {
    onPick(selected)
    onClose()
  }

  return (
    <Sheet
      title={partnerOf ? t('Superset with {name}', { name: partnerOf }) : t(swap ? 'Swap Exercise' : 'Add Exercises')}
      variant="modal"
      z="z-50"
      onClose={onClose}
      action={!swap && (
        <button onClick={add} disabled={selected.length === 0} className={`font-semibold disabled:opacity-35 ${accentText}`}>
          {selected.length > 0 ? t('Add ({n})', { n: selected.length }) : t('Add')}
        </button>
      )}
    >
      {swap && (
        <p className={`text-sm ${muted}`}>
          {t('Alternatives for {name}. Your sets are kept.', { name: replacing.name })}
        </p>
      )}

      <SearchInput
        value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery('')} autoCorrect="off"
        placeholder={t('Search exercises')} aria-label={t('Search exercises')}
      />

      <ChipRow label={t('Muscle')}>
        <Chip active={!muscle} onClick={() => setMuscle(null)}>{t('All')}</Chip>
        {MUSCLES.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>{t(m)}</Chip>
        ))}
      </ChipRow>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className={`text-xs font-semibold uppercase tracking-wide ${faint}`}>{t('My Equipment')}</h3>
          {equipment.length > 0 && (
            <button onClick={() => setEquipment([])} className={`text-xs font-medium ${accentText}`}>{t('Show all')}</button>
          )}
        </div>
        <ChipRow label={t('My Equipment')}>
          {EQUIPMENT.map((eq) => (
            <Chip key={eq} active={equipment.includes(eq)} onClick={() => toggleEquipment(eq)}>{t(eq)}</Chip>
          ))}
        </ChipRow>
        <p className={`text-xs ${faint}`}>
          {t(equipment.length ? 'Only showing exercises for the equipment you picked.' : 'Pick the equipment your gym has to hide the rest.')}
        </p>
      </div>

      {!swap && (
        <button onClick={() => setCreating(true)} className={`text-sm font-semibold ${accentText}`}>
          + {t('Create custom exercise')}
        </button>
      )}

      <ul className={`divide-y ${divider}`}>
        {results.map((ex) => {
          const on = isSelected(ex)
          return (
            <li key={ex.id} className="flex items-center gap-3 py-2.5">
              <button onClick={() => tap(ex)} className="min-w-0 flex-1 text-start">
                <p className="truncate text-sm font-medium">
                  {ex.name}
                  {ex.custom && <span className={`ms-2 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-semibold bg-royal/10 dark:bg-royal/25 ${accentText}`}>{t('Custom')}</span>}
                </p>
                <p className={`truncate text-xs ${muted}`}>
                  <span className={accentText}>{t(ex.muscle)}</span> · {t(ex.equipment)}
                  {ex.secondary.length > 0 && <span className={faint}> · {ex.secondary.map((m) => t(m)).join(', ')}</span>}
                </p>
              </button>
              {ex.custom && isCustomId(ex.id) && (
                <button
                  onClick={() => setDeleting(ex)} aria-label={t('Delete {name}', { name: ex.name })}
                  className={`shrink-0 px-1 text-lg leading-none ${faint}`}
                >
                  ×
                </button>
              )}
              {swap ? (
                <button
                  onClick={() => tap(ex)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${accentText} bg-royal/10 dark:bg-royal/25`}
                >
                  {t('Swap')}
                </button>
              ) : on ? (
                <button
                  onClick={() => toggle(ex)}
                  aria-label={t('Remove {name}', { name: ex.name })}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal text-on-accent transition active:scale-90"
                >
                  <CheckIcon />
                </button>
              ) : (
                <AddButton label={t('Add {name}', { name: ex.name })} onClick={() => toggle(ex)} />
              )}
            </li>
          )
        })}
        {results.length === 0 && <p className={`py-3 text-sm ${muted}`}>{t('No exercises match your filters.')}</p>}
      </ul>

      <PickerPortal>
        {creating && (
          <CustomExerciseSheet
            key="custom-exercise"
            existingNames={custom.map((c) => c.name)}
            onSave={(ex) => {
              setCustom((list) => [...list, ex])
              setCustomExercises([...custom, ex])
              if (!swap) setSelected((list) => [...list, ex])
              setQuery('')
            }}
            onClose={() => setCreating(false)}
          />
        )}
      </PickerPortal>

      {deleting && (
        <ConfirmDialog
          title={t('Delete {name}?', { name: deleting.name })}
          message={t('Routines and workouts that use it keep its name.')}
          confirmLabel={t('Delete')}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            setCustom((list) => list.filter((c) => c.id !== deleting.id))
            setSelected((list) => list.filter((s) => s.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}
    </Sheet>
  )
}
