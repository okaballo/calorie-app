// "Splits suggestions": the usual ways to divide training over the week (Push /
// Pull / Legs, Upper / Lower, ...), each day with a short list of staple
// exercises. "Add all" puts a whole day into the routine being built (and names
// the routine after the day if it has no name yet); the + beside an exercise
// adds just that one. Exercises already in the routine show a tick.
import { SPLITS, splitDayExercises } from '../lib/exercisesDB.ts'
import { Sheet, AddButton, Card, muted, faint, accentText, divider } from './ui.jsx'
import { t } from '../lib/i18n.js'

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)

export default function SplitsSheet({ added, onAdd, onClose }) {
  return (
    <Sheet title={t('Splits Suggestions')} variant="modal" z="z-50" closeLabel="Done" onClose={onClose}>
      {SPLITS.map((split) => (
        <Card key={split.id} className="space-y-4">
          <div>
            <h2 className="text-[17px] font-semibold">{t(split.name)}</h2>
            <p className={`text-xs ${muted}`}>{t(split.note)}</p>
          </div>
          {split.days.map((day) => {
            const list = splitDayExercises(day)
            const missing = list.filter((ex) => !added.includes(ex.id))
            return (
              <div key={day.name}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{t(day.name)}</h3>
                    <p className={`truncate text-xs ${faint}`}>{day.muscles.map((m) => t(m)).join(', ')}</p>
                  </div>
                  <button
                    onClick={() => onAdd(missing, day.name)} disabled={missing.length === 0}
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
                      {added.includes(ex.id) ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal text-on-accent" aria-label={t('Added')}>
                          <CheckIcon />
                        </span>
                      ) : (
                        <AddButton label={t('Add {name}', { name: ex.name })} onClick={() => onAdd([ex], null)} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </Card>
      ))}
    </Sheet>
  )
}
