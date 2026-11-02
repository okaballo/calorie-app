// Create an exercise that is not in the built-in list (a machine your gym has
// and the app does not, say): a name, the muscle it mainly trains, optionally
// others it also works, and its equipment. It is saved with the user's own
// exercises and then behaves like any built-in one.
import { useState } from 'react'
import { MUSCLES, EQUIPMENT, makeCustomExercise } from '../lib/exercisesDB.ts'
import { Sheet, TextInput, ChipRow, Chip, muted, faint, accentText } from './ui.jsx'
import { t } from '../lib/i18n.js'

export default function CustomExerciseSheet({ existingNames = [], onSave, onClose }) {
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState(null)
  const [secondary, setSecondary] = useState([])
  const [equipment, setEquipment] = useState('Machine')

  const trimmed = name.trim()
  const taken = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
  const canSave = trimmed !== '' && muscle !== null && !taken

  const pickPrimary = (m) => {
    setMuscle(m)
    setSecondary((list) => list.filter((x) => x !== m))
  }
  const toggleSecondary = (m) => setSecondary((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]))

  const save = () => {
    onSave(makeCustomExercise(trimmed, muscle, secondary, equipment))
    onClose()
  }

  return (
    <Sheet
      title={t('New Exercise')} variant="modal" z="z-[55]" onClose={onClose} dirty={trimmed !== ''}
      action={<button onClick={save} disabled={!canSave} className={`font-semibold disabled:opacity-35 ${accentText}`}>{t('Save')}</button>}
    >
      <div className="space-y-1.5">
        <TextInput
          value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus autoCorrect="off"
          placeholder={t('Exercise name')} aria-label={t('Exercise name')}
        />
        {taken && <p className="px-1 text-xs text-fat-deep dark:text-fat">{t('You already have an exercise with this name.')}</p>}
      </div>

      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${faint}`}>{t('Main muscle')}</h3>
        <ChipRow label={t('Main muscle')}>
          {MUSCLES.map((m) => <Chip key={m} active={muscle === m} onClick={() => pickPrimary(m)}>{t(m)}</Chip>)}
        </ChipRow>
      </div>

      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${faint}`}>{t('Also works (optional)')}</h3>
        <ChipRow label={t('Also works (optional)')}>
          {MUSCLES.filter((m) => m !== muscle).map((m) => (
            <Chip key={m} active={secondary.includes(m)} onClick={() => toggleSecondary(m)}>{t(m)}</Chip>
          ))}
        </ChipRow>
      </div>

      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${faint}`}>{t('Equipment')}</h3>
        <ChipRow label={t('Equipment')}>
          {EQUIPMENT.map((eq) => <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(eq)}>{t(eq)}</Chip>)}
        </ChipRow>
        <p className={`text-xs ${muted}`}>{t('Pick Bodyweight if you lift your own weight; your weight from the Weight tab is then counted.')}</p>
      </div>
    </Sheet>
  )
}
