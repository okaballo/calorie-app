// "Splits suggestions": the usual ways to divide training over the week (Push /
// Pull / Legs, Upper / Lower, ...), each day with a short list of staple
// exercises. "Add all" picks a whole day; the + beside an exercise picks just
// that one, and its tick takes it back. Next hands the picks to a new routine,
// named after the first day added in full. "Add Program" at the end of a split
// saves every day of it as its own routine straight away.
import { useState } from 'react'
import { SPLITS, splitDayExercises } from '../lib/exercisesDB.ts'
import { Sheet, AddButton, Card, CheckIcon, muted, faint, accentText, divider } from './ui.jsx'
import { t } from '../lib/i18n.js'

export default function SplitsSheet({ onNext, onAddProgram, onClose }) {
  const [picked, setPicked] = useState([]) // exercises, in tap order
  const [dayName, setDayName] = useState(null)

  const isPicked = (ex) => picked.some((p) => p.id === ex.id)
  const remove = (ex) => {
    const left = picked.filter((p) => p.id !== ex.id)
    setPicked(left)
    if (left.length === 0) setDayName(null)
  }

  return (
    <Sheet
      title={t('Splits Suggestions')} variant="modal" z="z-50" onClose={onClose} dirty={picked.length > 0}
      action={(
        <button onClick={() => onNext(picked, dayName)} disabled={picked.length === 0} className={`font-semibold disabled:opacity-35 ${accentText}`}>
          {picked.length > 0 ? t('Next ({n})', { n: picked.length }) : t('Next')}
        </button>
      )}
    >
      {SPLITS.map((split) => (
        <Card key={split.id} className="space-y-4">
          <div>
            <h2 className="text-[17px] font-semibold">{t(split.name)}</h2>
            <p className={`text-xs ${muted}`}>{t(split.note)}</p>
          </div>
          {split.days.map((day) => {
            const list = splitDayExercises(day)
            const missing = list.filter((ex) => !isPicked(ex))
            return (
              <div key={day.name}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{t(day.name)}</h3>
                    <p className={`truncate text-xs ${faint}`}>{day.muscles.map((m) => t(m)).join(', ')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setPicked([...picked, ...missing])
                      setDayName(dayName ?? day.name)
                    }}
                    disabled={missing.length === 0}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold bg-royal/10 disabled:opacity-40 dark:bg-royal/25 ${accentText}`}
                  >
                    {t(missing.length === 0 ? 'Added' : 'Add all')}
                  </button>
                </div>
                <ul className={`mt-1 divide-y ${divider}`}>
                  {list.map((ex) => (
                    <li key={ex.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ex.name}</p>
                        <p className={`truncate text-xs ${muted}`}><span className={accentText}>{t(ex.muscle)}</span> · {t(ex.equipment)}</p>
                      </div>
                      {isPicked(ex) ? (
                        <button
                          onClick={() => remove(ex)} aria-label={t('Remove {name}', { name: ex.name })}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal text-on-accent transition active:scale-90"
                        >
                          <CheckIcon />
                        </button>
                      ) : (
                        <AddButton label={t('Add {name}', { name: ex.name })} onClick={() => setPicked([...picked, ex])} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          <button
            onClick={() => onAddProgram(split)}
            className={`w-full rounded-full py-2.5 text-[15px] font-semibold bg-royal/10 transition active:scale-[0.98] dark:bg-royal/25 ${accentText}`}
          >
            {t('Add Program')}
          </button>
        </Card>
      ))}
    </Sheet>
  )
}
