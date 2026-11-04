// Streak UI: the streak chips (Home and Workout), their bottom sheets, and the
// milestone toast. The numbers come from lib/streaks.js.
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Sheet, Stepper, muted, focusRing, buttonBg } from './ui.jsx'
import { t } from '../lib/i18n.js'

/** Double up-chevron ("rise"). Colour comes from the text colour, so a grey chip greys it. */
export const StreakIcon = ({ className = 'size-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none"
    stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
    <path d="m6 11 6-6 6 6M6 19l6-6 6 6" />
  </svg>
)

/** True when the number went up since the last render (not on first show). */
function useRose(value) {
  const prev = useRef(value)
  const rose = value > prev.current
  useEffect(() => { prev.current = value }, [value])
  return rose
}

/** Icon + number. `lit`: today's part is done (theme purple); otherwise grey. */
export function StreakChip({ value, lit, extra, label, onClick }) {
  const reduce = useReducedMotion()
  const rose = useRose(value)
  return (
    <button
      type="button" onClick={onClick} aria-label={label}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums transition active:scale-95 ${buttonBg} ${focusRing}`}
    >
      <motion.span
        key={value}
        initial={rose && !reduce ? { scale: 1.45 } : false} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        className={`flex items-center gap-1.5 ${lit ? 'text-streak' : 'text-zinc-400 dark:text-white/45'}`}
      >
        <StreakIcon />
        <span className={value > 0 ? 'text-zinc-900 dark:text-white' : muted}>{value}</span>
      </motion.span>
      {extra && <><span aria-hidden="true" className="h-4 w-px bg-black/12 dark:bg-white/15" /><span className={`text-xs font-medium ${muted}`}>{extra}</span></>}
    </button>
  )
}

const RING = {
  hit: 'bg-streak text-on-streak',
  miss: 'bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-white/50',
  cheat: 'bg-[#FF3547]/15 text-[#FF3547]',
  today: 'border-2 border-dashed border-streak text-streak',
  none: 'border-2 border-zinc-200 dark:border-white/10',
}
const GLYPH = { hit: '✓', miss: '✕', cheat: '❄' }

const Dot = ({ status, caption }) => (
  <span className="flex flex-col items-center gap-1.5">
    <span className={`text-xs ${muted}`}>{caption}</span>
    <span className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${RING[status]}`}>
      {status === 'today' ? <StreakIcon className="size-3.5" /> : GLYPH[status]}
    </span>
  </span>
)

const Hero = ({ value, unit, best, bestUnit }) => (
  <div className="flex flex-col items-center gap-1 text-center">
    <span className="flex size-16 items-center justify-center rounded-full bg-streak/15 text-streak"><StreakIcon className="size-8" /></span>
    <p className="mt-2 text-[40px] leading-none font-bold tabular-nums">{value}</p>
    <p className="text-[15px] font-medium">{t(unit)}</p>
    <p className={`text-sm ${muted}`}>{t('Best')}: {best} {t(bestUnit)}</p>
  </div>
)

export function CalorieStreakSheet({ streak, calories, dayLetter, hint, onOpenPlan, onClose }) {
  const { range, recent, today } = streak
  const limits = range && { min: range.min.toLocaleString(), max: range.max.toLocaleString() }
  const message = !range ? t('Set a calorie goal to start a streak.')
    : today === 'cheat' ? t('Cheat day: your streak is safe today.')
    : today === 'over' ? t('Over the limit today ({max} kcal). Closing the day now ends the streak.', limits)
    : today === 'ok' ? t('On track. Start a new day to lock it in.')
    : t('Stay between {min} and {max} kcal to keep it going.', limits)
  return (
    <Sheet variant="modal" title={t('Calorie Streak')} closeLabel="Close" onClose={onClose} z="z-[55]">
      <div className="flex flex-col gap-7 px-2 pt-6 pb-6">
        <Hero value={streak.current} unit={streak.current === 1 ? 'day streak' : 'days streak'} best={streak.best} bestUnit={streak.best === 1 ? 'day' : 'days'} />
        <div className="grid grid-cols-7">
          {recent.map(({ key, status }) => <Dot key={key} status={status} caption={dayLetter(key)} />)}
        </div>
        <p className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs ${muted}`}>
          <span>✓ {t('Hit')}</span><span>✕ {t('Missed')}</span><span>❄ {t('Cheat Day')}</span>
        </p>
        {range && (
          <p className="text-center text-[15px] font-semibold tabular-nums">
            {t('Today')}: {Math.round(calories).toLocaleString()} {t('kcal')}
          </p>
        )}
        <p className={`text-center text-sm text-balance ${today === 'over' ? 'text-[#FF3547]' : muted}`}>{message}</p>
        {range && hint && (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className={`text-xs text-balance ${muted}`}>{t('Add your age, height and weight in Plan & Goals for a more accurate range.')}</p>
            <button type="button" onClick={onOpenPlan} className={`min-h-10 rounded-lg px-3 text-[15px] font-semibold text-royal dark:text-lilac ${focusRing}`}>
              {t('Open Plan & Goals')}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

export function WorkoutStreakSheet({ streak, onTarget, weekLabel, onClose }) {
  const { target, thisWeek, weeks } = streak
  return (
    <Sheet variant="modal" title={t('Workout Streak')} closeLabel="Close" onClose={onClose} z="z-[55]">
      <div className="flex flex-col gap-7 px-2 pt-6 pb-6">
        <Hero value={streak.current} unit={streak.current === 1 ? 'week streak' : 'weeks streak'} best={streak.best} bestUnit={streak.best === 1 ? 'week' : 'weeks'} />
        <div className="flex flex-col items-center gap-2">
          <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${muted}`}>{t('This week')}</p>
          <div className="flex gap-2">
            {Array.from({ length: target }, (_, i) => (
              <span key={i} className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${i < thisWeek ? 'bg-streak text-on-streak' : 'border-2 border-dashed border-streak/60'}`}>
                {i < thisWeek ? '✓' : ''}
              </span>
            ))}
          </div>
          <p className={`text-sm tabular-nums ${muted}`}>{thisWeek} / {target}</p>
        </div>
        <div className="grid grid-cols-6">
          {weeks.map(({ start, status, count }) => (
            <Dot
              key={start} caption={weekLabel(start)}
              status={status === 'met' || (status === 'current' && count >= target) ? 'hit' : status === 'missed' ? 'miss' : status === 'current' ? 'today' : 'none'}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[15px] font-semibold">{t('Weekly target')}</p>
            <p className={`text-xs ${muted}`}>{t('Workout days per week. Changing it also changes past weeks.')}</p>
          </div>
          <Stepper
            value={t(target === 1 ? '{n} day' : '{n} days', { n: target })} label={t('Weekly target')}
            onMinus={() => target > 1 && onTarget(target - 1)} onPlus={() => target < 7 && onTarget(target + 1)}
          />
        </div>
      </div>
    </Sheet>
  )
}

/** One-time celebration at a milestone. `toast`: { id, text } or null. */
export function StreakToast({ toast, onDone }) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(onDone, 3800)
    return () => clearTimeout(id)
  }, [toast, onDone])
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id} role="status"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.92 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-[70] flex justify-center px-4"
        >
          <span className="flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-semibold text-white shadow-lg dark:bg-white dark:text-zinc-900">
            <StreakIcon className="size-5 text-lilac dark:text-royal" />{toast.text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
