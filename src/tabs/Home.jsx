// Home tab: KiBase header, calorie ring (with the active day inside it),
// three macro rings, the meals of the ACTIVE tracking day, then the
// analytics section (passed in as `analytics`, see components/Analytics.jsx).
// The day only changes when the user confirms Start New Day.
import { useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { ZERO, add, mealTotals, mealGrams, mealDay, parseDay, dayKey, currentWeek, num, fmt0 } from '../lib/calc.js'
import {
  Card, SectionTitle, PrimaryButton, CalorieRing, MiniRing, MacroSummary, Avatar, PencilIcon,
  ConfirmDialog, NameDialog, muted, faint, accentText, divider,
} from '../components/ui.jsx'
import { t, locale, isRTL } from '../lib/i18n.js'

/**
 * The week of the viewed day, as a compact strip. Swipe it sideways to change
 * week. A day with meals gets a check; a cheat day has a red letter (the cheat
 * colour from Analytics); the current (active) tracking day has a bold accent
 * letter so it is easy to find again. Days after the current day are disabled.
 */
function WeekStrip({ viewDay, activeDate, meals, cheatDays, onViewDay }) {
  const week = currentWeek(meals, viewDay)
  const ref = useRef(null)
  const drag = useRef(null)     // { x, y, id, horizontal } while a finger is down
  const enter = useRef(0)       // direction the new week slides in from after a swipe
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-160, 0, 160], [0.35, 1, 0.35])
  const hasNext = dayKey(week[6].date) < activeDate // nothing after the current day's week

  const weekKey = (days) => {
    const d = parseDay(viewDay)
    d.setDate(d.getDate() + days)
    const key = dayKey(d)
    return key > activeDate ? activeDate : key
  }

  // The new week is already rendered when this runs, so start it off-screen on
  // the side the swipe came from and slide it in.
  useLayoutEffect(() => {
    if (!enter.current) return
    const w = ref.current?.clientWidth ?? 320
    x.set(enter.current * w)
    enter.current = 0
    animate(x, 0, { type: 'spring', stiffness: 120, damping: 38 })
  }, [viewDay, x])

  // The strip follows the finger, then either slides out and swaps the week
  // (swipe toward the next week is right-to-left in English, mirrored in
  // Arabic) or springs back. The pager ignores touches here (data-no-swipe).
  const onPointerDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null } }
  const onPointerMove = (e) => {
    const s = drag.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (s.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      s.horizontal = Math.abs(dx) > Math.abs(dy) * 1.5
      if (s.horizontal) {
        animate(x, x.get(), { duration: 0 }) // grab it if a spring is still running
        e.currentTarget.setPointerCapture?.(s.id) // after this a lift is not a tap on a day
      }
    }
    if (!s.horizontal) return
    const forward = isRTL() ? dx > 0 : dx < 0
    x.set(forward && !hasNext ? dx * 0.25 : dx) // resistance where there is no next week
  }
  const onPointerUp = (e) => {
    const s = drag.current
    drag.current = null
    if (!s?.horizontal) return
    const dx = e.clientX - s.x
    const forward = isRTL() ? dx > 0 : dx < 0
    const w = ref.current?.clientWidth ?? 320
    if (Math.abs(dx) < 40 || (forward && !hasNext)) {
      animate(x, 0, { type: 'spring', stiffness: 420, damping: 38 })
      return
    }
    const out = dx < 0 ? -w : w
    animate(x, out, { duration: 0.1, ease: 'easeIn' }).then(() => {
      enter.current = -Math.sign(out)
      onViewDay(weekKey(forward ? 7 : -7))
    })
  }
  const cancel = () => {
    drag.current = null
    animate(x, 0, { type: 'spring', stiffness: 420, damping: 38 })
  }

  return (
    <motion.section
      ref={ref}
      aria-label={t('Viewing')}
      data-no-swipe
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancel}
      className="grid select-none grid-cols-7"
      style={{ touchAction: 'pan-y', x, opacity }}
    >
      {week.map(({ date, totals }) => {
        const key = dayKey(date)
        const future = key > activeDate
        const selected = key === viewDay
        const current = key === activeDate
        const logged = totals.calories > 0
        const cheat = cheatDays.includes(key)
        const letter = cheat ? 'text-[#FF3547]' : current ? accentText : selected ? '' : muted
        return (
          <button
            key={key}
            disabled={future}
            onClick={() => onViewDay(key)}
            aria-pressed={selected}
            aria-label={`${date.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' })}${cheat ? `, ${t('Cheat Day')}` : ''}`}
            className={`flex flex-col items-center gap-1.5 rounded-xl py-1 transition active:scale-95 disabled:opacity-30 ${selected ? 'bg-black/5 dark:bg-white/8' : ''}`}
          >
            <span className={`text-xs ${current || selected || cheat ? 'font-bold' : 'font-medium'} ${letter}`}>
              {date.toLocaleDateString(locale(), { weekday: 'narrow' })}
            </span>
            <span className={`flex size-6 items-center justify-center rounded-full ${
              logged
                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                : `border-2 ${selected ? 'border-zinc-500 dark:border-zinc-400' : 'border-zinc-300 dark:border-zinc-600'}`
            }`}>
              {logged && (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              )}
            </span>
          </button>
        )
      })}
    </motion.section>
  )
}

export default function Home({
  profile, avatar, meals, activeDay, viewDay, onViewDay, cheatDays = [],
  onAddMeal, onEditMeal, onDeleteMeal, onStartNewDay, onSaveTemplate, onOpenProfile, analytics,
}) {
  const [confirming, setConfirming] = useState(false)
  const [savingMeal, setSavingMeal] = useState(null) // meal being saved as a template
  const [savedId, setSavedId] = useState(null)       // briefly highlights the save icon

  // Only the viewed day's meals count and are listed (the active day unless
  // another date is picked), so the dashboard AND the meal list always match it.
  const isActive = viewDay === activeDay.date
  const dayMeals = meals.filter((m) => mealDay(m) === viewDay) // newest first
  const dayLabel = parseDay(viewDay).toLocaleDateString(locale(), {
    weekday: 'long', day: 'numeric', month: 'short',
  })
  const totals = dayMeals.reduce((sum, m) => add(sum, mealTotals(m)), ZERO)

  const goal = num(profile.calorieGoal)
  const progress = goal > 0 ? Math.min(totals.calories / goal, 1) : 0

  // Copies the meal's components (per-100 g values + grams) into a template.
  const saveTemplate = (name) => {
    onSaveTemplate({ id: crypto.randomUUID(), name, items: savingMeal.items.map((item) => ({ ...item })) })
    setSavedId(savingMeal.id)
    setTimeout(() => setSavedId(null), 2000)
    setSavingMeal(null)
  }

  return (
    <>
      {/* ---- Brand header ---- */}
      <header className="flex items-center justify-between pt-2">
        <h1 dir="ltr" className="text-[30px] font-extrabold leading-none tracking-tight">
          <span className="bg-linear-to-br from-lilac to-royal bg-clip-text text-transparent">Ki</span>Base
        </h1>
        <button onClick={onOpenProfile} aria-label={t('Open profile')} className="rounded-full transition active:scale-95">
          <Avatar src={avatar} name={profile.name} size={40} />
        </button>
      </header>

      <WeekStrip viewDay={viewDay} activeDate={activeDay.date} meals={meals} cheatDays={cheatDays} onViewDay={onViewDay} />

      {/* ---- Calories (viewed day shown inside the card) ---- */}
      <Card>
        <div className="flex items-baseline justify-between">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${isActive ? muted : accentText}`}>
            {t(isActive ? 'Current Day' : 'Viewing')}
          </p>
          <p className="text-sm font-semibold">{dayLabel}</p>
        </div>
        {/* Hero: a wide, heavily diffused Royal Purple bloom sits behind the
            ring only, lifting it off the card without tinting anything else. */}
        <div className="relative mt-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 size-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(120,81,169,0.22),rgba(120,81,169,0.08)_55%,transparent)] blur-2xl dark:bg-[radial-gradient(closest-side,rgba(120,81,169,0.45),rgba(120,81,169,0.14)_55%,transparent)]"
          />
          <div className="relative">
            <CalorieRing progress={progress} remaining={goal - totals.calories} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 divide-x divide-black/6 text-center dark:divide-white/8">
          <div>
            <p className="text-xl font-semibold tabular-nums">{fmt0(totals.calories)}</p>
            <p className={`text-xs ${muted}`}>{t('Eaten')}</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums">{fmt0(goal)}</p>
            <p className={`text-xs ${muted}`}>{t('Goal')}</p>
          </div>
        </div>
      </Card>

      {/* ---- Macros as three small rings ---- */}
      <Card>
        <SectionTitle>{t('Macros')}</SectionTitle>
        <div className="mt-4 grid grid-cols-3">
          <MiniRing label={t('Protein')} value={totals.protein} goal={num(profile.proteinGoal)} color="#9b6fe0" />
          <MiniRing label={t('Carbs')} value={totals.carbs} goal={num(profile.carbsGoal)} color="#8c9eff" />
          <MiniRing label={t('Fats')} value={totals.fat} goal={num(profile.fatGoal)} color="#ed85d9" />
        </div>
      </Card>

      {/* ---- Meals of the active day ---- */}
      <Card>
        <SectionTitle>{t('Recent Meals')}</SectionTitle>
        {dayMeals.length === 0 ? (
          <div className="mt-3 space-y-3 text-center">
            <p className={muted}>{t('No meals logged for this day yet.')}</p>
            <PrimaryButton onClick={onAddMeal}>{t('Log a meal')}</PrimaryButton>
          </div>
        ) : (
          <ul className={`mt-1 divide-y ${divider}`}>
            {dayMeals.map((meal) => {
              const mt = mealTotals(meal)
              const when = new Date(meal.date).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' })
              const saved = savedId === meal.id
              return (
                <li key={meal.id} className="flex items-start gap-2 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="line-clamp-2 text-sm font-semibold">{meal.name}</p>
                    <p className={`text-xs ${muted}`}>{when} · {fmt0(mealGrams(meal))} {t('g')}</p>
                    <MacroSummary macros={mt} glow />
                  </div>
                  <div className="text-end">
                    <p className="font-semibold tabular-nums">{fmt0(mt.calories)}</p>
                    <p className={`text-[11px] ${muted}`}>{t('kcal')}</p>
                  </div>
                  <button
                    onClick={() => onEditMeal(meal)}
                    aria-label={t('Edit {name}', { name: meal.name })}
                    className={`p-1 transition active:scale-90 ${faint}`}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => setSavingMeal(meal)}
                    aria-label={t('Save {name} as a template', { name: meal.name })}
                    className={`p-1 transition ${saved ? `glow-text ${accentText}` : faint}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={saved ? 'currentColor' : 'none'}
                      stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDeleteMeal(meal.id)}
                    aria-label={t('Delete {name}', { name: meal.name })}
                    className={`px-1 text-xl leading-none ${faint}`}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {analytics}

      {/* Quiet hairline button at the very bottom, so it is hard to hit by
          accident. Neutral on purpose: purple is kept for active elements. */}
      {isActive ? (
        <>
          <button
            onClick={() => setConfirming(true)}
            className="w-full rounded-2xl border-[0.5px] border-black/10 bg-white py-3.5 font-semibold transition active:scale-[0.98] active:bg-black/5 dark:border-white/12 dark:bg-white/4 dark:active:bg-white/8"
          >
            {t('Start New Day')}
          </button>
          <p className={`-mt-2 text-center text-xs ${faint}`}>
            {t('Meals keep counting towards {day} until you start a new day.', { day: dayLabel })}
          </p>
        </>
      ) : (
        <>
          <PrimaryButton onClick={() => onViewDay(activeDay.date)}>{t('Back to current day')}</PrimaryButton>
          <p className={`-mt-2 text-center text-xs ${faint}`}>
            {t('Editing a past day. Changes update your Analytics.')}
          </p>
        </>
      )}

      {savingMeal && (
        <NameDialog
          title={t('Save as meal template')}
          message={t(
            savingMeal.items.length === 1
              ? '1 item. Find it under My Items when you log a meal.'
              : '{n} items. Find it under My Items when you log a meal.',
            { n: savingMeal.items.length },
          )}
          initial={savingMeal.name}
          confirmLabel={t('Save')}
          onCancel={() => setSavingMeal(null)}
          onConfirm={saveTemplate}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={t('Start a new day?')}
          message={t(
            dayMeals.length === 1
              ? "This finishes {day} ({kcal} kcal, 1 meal) and clears the dashboard and meal list. It can't be undone."
              : "This finishes {day} ({kcal} kcal, {n} meals) and clears the dashboard and meal list. It can't be undone.",
            { day: dayLabel, kcal: fmt0(totals.calories), n: dayMeals.length },
          )}
          confirmLabel={t('Start New Day')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            onStartNewDay()
            setConfirming(false)
          }}
        />
      )}
    </>
  )
}
