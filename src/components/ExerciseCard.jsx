// One exercise with its sets, used while logging a workout and while editing a
// routine.
//
//   logging   (default) # | Previous | kg | reps | done tick | remove. "Previous"
//             is what was lifted last time, with "Best" (the heaviest weight
//             ever lifted in that set) under it; a routine's planned numbers
//             (`entry.plan`) take priority as the input hints, and ticking an
//             empty set fills the hint in. Only typed or ticked values count.
//   planning  # | kg | reps | remove: the numbers ARE the routine, so there is
//             no history and nothing to tick.
import { num, fmt0, fmt1 } from '../lib/calc.js'
import { exerciseOf, setText } from '../lib/workouts.js'
import { Card, muted, faint, accentText, fieldBg, focusRing, placeholder } from './ui.jsx'
import { t } from '../lib/i18n.js'

const CheckIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)

const SwapIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </svg>
)

// Set table columns
const LOG_GRID = 'grid grid-cols-[1.5rem_minmax(0,1fr)_3.75rem_3.25rem_2rem_1.25rem] items-center gap-2'
const PLAN_GRID = 'grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_1.25rem] items-center gap-2'

export default function ExerciseCard({
  entry, previous = [], best = [], planning = false, onSwap, onRemove, onSet, onAddSet, onRemoveSet,
}) {
  const ex = exerciseOf(entry)
  const grid = planning ? PLAN_GRID : LOG_GRID
  const input = `w-full rounded-lg px-1.5 py-1.5 text-center tabular-nums transition-colors ${focusRing} ${fieldBg} ${placeholder}`

  // Hint for set i: the routine's plan, else the same set last time, else the
  // last set done then.
  const planned = (i) => (num(entry.plan?.[i]?.reps) > 0 ? entry.plan[i] : null)
  const hint = (i) => planned(i) ?? previous[i] ?? previous[previous.length - 1]

  const toggleDone = (set, i) => {
    const h = hint(i)
    const fill = !set.done && h ? { kg: set.kg || (num(h.kg) > 0 ? String(h.kg) : ''), reps: set.reps || String(num(h.reps)) } : {}
    onSet(set.id, { ...fill, done: !set.done })
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{ex.name}</p>
          {ex.muscle && (
            <p className={`truncate text-xs ${muted}`}>
              <span className={accentText}>{t(ex.muscle)}</span> · {t(ex.equipment)}
            </p>
          )}
        </div>
        {ex.muscle && (
          <button onClick={onSwap} aria-label={t('Swap {name}', { name: ex.name })} className={`p-1 transition active:scale-90 ${faint}`}>
            <SwapIcon />
          </button>
        )}
        <button onClick={onRemove} aria-label={t('Remove {name}', { name: ex.name })} className={`px-1 text-xl leading-none ${faint}`}>
          ×
        </button>
      </div>

      <div className="space-y-1.5">
        <div className={`${grid} text-[11px] font-semibold uppercase tracking-wide ${faint}`}>
          <span className="text-center">{t('Set')}</span>
          {!planning && <span>{t('Previous')}</span>}
          <span className="text-center">{t('kg')}</span>
          <span className="text-center">{t('Reps')}</span>
          {!planning && <span />}
          <span />
        </div>
        {entry.sets.map((set, i) => {
          const h = planning ? null : hint(i)
          return (
            <div key={set.id} className={`${grid} -mx-1.5 rounded-xl px-1.5 py-1 transition-colors ${set.done ? 'bg-royal/8 dark:bg-royal/20' : ''}`}>
              <span className={`text-center text-sm font-semibold tabular-nums ${set.done ? accentText : muted}`}>{i + 1}</span>
              {!planning && (
                <div className="flex min-w-0 flex-col items-start leading-tight">
                  {previous[i] ? (
                    // Tap the previous set to copy it into this one.
                    <button
                      onClick={() => onSet(set.id, { kg: num(previous[i].kg) > 0 ? String(previous[i].kg) : '', reps: String(previous[i].reps) })}
                      className={`max-w-full truncate text-start text-xs tabular-nums ${faint}`}
                    >
                      {setText(previous[i])}
                    </button>
                  ) : (
                    <span className={`text-xs ${faint}`}>–</span>
                  )}
                  {/* Smaller than the previous value: the heaviest weight ever lifted in this set. */}
                  {best[i] > 0 && (
                    <span className={`max-w-full truncate text-[11px] tabular-nums ${accentText}`}>
                      {t('Best')} {fmt1(best[i])}
                    </span>
                  )}
                </div>
              )}
              <input
                inputMode="decimal" value={set.kg} placeholder={h && num(h.kg) > 0 ? fmt1(num(h.kg)) : '0'}
                onChange={(e) => onSet(set.id, { kg: e.target.value })}
                aria-label={t('Set {n} weight', { n: i + 1 })} className={input}
              />
              <input
                inputMode="numeric" value={set.reps} placeholder={h ? fmt0(num(h.reps)) : '0'}
                onChange={(e) => onSet(set.id, { reps: e.target.value })}
                aria-label={t('Set {n} reps', { n: i + 1 })} className={input}
              />
              {!planning && (
                <button
                  onClick={() => toggleDone(set, i)}
                  aria-pressed={set.done}
                  aria-label={t('Set {n} done', { n: i + 1 })}
                  className={`mx-auto flex size-7 items-center justify-center rounded-full transition active:scale-90 ${
                    set.done ? 'bg-royal text-white shadow-[0_0_12px_-2px_rgba(120,81,169,0.7)]' : 'border-2 border-zinc-300 text-transparent dark:border-zinc-600'
                  }`}
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => onRemoveSet(set.id)}
                aria-label={t('Remove set {n}', { n: i + 1 })}
                className={`text-lg leading-none ${faint}`}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      <button
        onClick={onAddSet}
        className={`w-full rounded-xl py-2 text-sm font-semibold transition active:scale-[0.98] ${fieldBg} ${accentText}`}
      >
        + {t('Add Set')}
      </button>
    </Card>
  )
}
