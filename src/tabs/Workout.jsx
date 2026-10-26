// Workout tab: your routines, a card for the workout in progress, and the
// history of finished workouts, plus a volume chart per routine (picked from a
// dropdown that always lists the routines you have now).
//
// The top card is blank until a routine is started. Start begins a timer on
// the tracking day Home is showing (the active day unless a past date is
// picked there); the card then shows it with Finish Routine and Continue
// Routine (reopens the logging screen). Finish moves the workout into the
// history (mt.workoutHistory) and the card goes blank again, so you can do
// several workouts in a day. Each history entry can be repeated or deleted.
//
// The tab is deliberately short. Everything detailed opens as its own screen:
//   Add New Routine / pencil   RoutineSheet: build or edit a routine
//   Start / Continue Routine   WorkoutSessionSheet: log the sets
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { fmt0, parseDay } from '../lib/calc.js'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import {
  EMPTY_WORKOUT, byRecent, exerciseOf, formatDuration, isLive, isLogged, routineVolume, setText, startEntries, toRoutine,
  workoutStats,
} from '../lib/workouts.js'
import {
  Card, SectionTitle, PageTitle, PrimaryButton, PencilIcon, TrashIcon, ConfirmDialog, muted, faint, accentText, fieldBg, divider,
} from '../components/ui.jsx'
import { LineChart } from '../components/Charts.jsx'
import OptionMenu from '../components/OptionMenu.jsx'
import WorkoutSessionSheet from '../components/WorkoutSessionSheet.jsx'
import RoutineSheet from '../components/RoutineSheet.jsx'
import { t, locale } from '../lib/i18n.js'

const dayLabel = (key, opts = { weekday: 'long', day: 'numeric', month: 'short' }) =>
  parseDay(key).toLocaleDateString(locale(), opts)

/** Running time of the workout in progress; ticks every second. */
function Elapsed({ startedAt, className = '' }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span role="timer" className={`tabular-nums ${className}`}>{formatDuration(now - startedAt)}</span>
}

export default function Workout({
  day, activeDate, workouts, history, onUpdate, onFinish, onDeleteWorkout,
  routines, onSaveRoutine, onDeleteRoutine, onBackToToday,
}) {
  // Only the workout in progress lives in `workouts`; finished ones are in `history`.
  const workout = workouts[day] ?? EMPTY_WORKOUT
  const stats = workoutStats(workout)
  const isActive = day === activeDate
  const live = workout.exercises.length > 0

  const [session, setSession] = useState(false)              // the logging screen is open
  const [routineEditing, setRoutineEditing] = useState(null) // null | 'new' | routine being edited
  const [openId, setOpenId] = useState(null)                 // expanded history entry
  const [deleting, setDeleting] = useState(null)             // history entry awaiting confirmation

  // Starting a routine (or repeating a past workout) adds its exercises to
  // this day's workout, names it unless it already has a name, starts the timer
  // (a workout already in progress keeps its timer) and opens it.
  const start = (routine) => {
    onUpdate(day, (w) => ({
      name: w.name.trim() ? w.name : routine.name,
      exercises: [...w.exercises, ...startEntries(routine)],
      startedAt: isLive(w) ? w.startedAt : Date.now(),
      // the routine Save (in the logging screen) writes back to
      routineId: isLive(w) && w.routineId ? w.routineId : routine.id,
    }))
    setSession(true)
  }

  const finished = [...history].sort(byRecent).slice(0, 50)

  // Volume chart: one routine at a time. The dropdown is the routines as they
  // are right now, so adding or deleting one updates it; if the remembered
  // routine is gone, the first one is shown.
  const [chartId, setChartId] = useLocalStorage('mt.volumeRoutine', null)
  const chartRoutine = routines.find((r) => r.id === chartId) ?? routines[0]
  const volume = chartRoutine ? routineVolume(history, chartRoutine, routines) : []
  const peak = Math.max(0, ...volume.map((p) => p.value))

  return (
    <>
      <PageTitle>{t('Workout')}</PageTitle>

      {/* ---- The workout in progress: blank until a routine is started ---- */}
      <Card className="space-y-3.5">
        <div className="flex items-baseline justify-between">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${live || !isActive ? accentText : muted}`}>
            {t(live ? 'In Progress' : isActive ? 'Current Day' : 'Viewing')}
          </p>
          <p className="text-sm font-semibold">{dayLabel(day)}</p>
        </div>
        {live ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <p className="min-w-0 truncate text-[17px] font-semibold">{workout.name.trim() || t('Workout')}</p>
              {workout.startedAt && <Elapsed startedAt={workout.startedAt} className={`shrink-0 text-3xl font-bold leading-none ${accentText}`} />}
            </div>
            <div className="grid grid-cols-3 divide-x divide-black/6 text-center dark:divide-white/8">
              <div>
                <p className="text-xl font-semibold tabular-nums">{stats.exercises}</p>
                <p className={`text-xs ${muted}`}>{t('Exercises')}</p>
              </div>
              <div>
                <p className="text-xl font-semibold tabular-nums">
                  {stats.done}<span className={`text-sm font-normal ${muted}`}>/{stats.sets}</span>
                </p>
                <p className={`text-xs ${muted}`}>{t('Sets done')}</p>
              </div>
              <div>
                <p className={`text-xl font-semibold tabular-nums ${stats.volume > 0 ? accentText : ''}`}>{fmt0(stats.volume)}</p>
                <p className={`text-xs ${muted}`}>{t('Volume (kg)')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {/* Quiet graphite, like the app's inputs: Continue is the main action. */}
              <button
                onClick={() => onFinish(day)}
                className={`flex-1 rounded-2xl py-3.5 font-semibold transition active:scale-[0.98] active:opacity-80 ${fieldBg}`}
              >
                {t('Finish Routine')}
              </button>
              <PrimaryButton onClick={() => setSession(true)} className="flex-1">{t('Continue Routine')}</PrimaryButton>
            </div>
          </>
        ) : (
          <p className={`py-1 text-center text-sm ${faint}`}>{t('No workout in progress. Start a routine below.')}</p>
        )}
      </Card>

      {!isActive && (
        <>
          <PrimaryButton onClick={onBackToToday}>{t('Back to current day')}</PrimaryButton>
          <p className={`-mt-2 text-center text-xs ${faint}`}>{t('Editing a past day. Pick another date on the Home tab.')}</p>
        </>
      )}

      {/* ---- Routines ---- */}
      <Card className="space-y-3">
        <SectionTitle>{t('Routines')}</SectionTitle>
        {routines.length === 0 ? (
          <p className={`text-sm ${muted}`}>{t('No routines yet. Build one and start it with one tap whenever you train.')}</p>
        ) : (
          <ul className={`divide-y ${divider}`}>
            {routines.map((routine) => {
              const sets = routine.exercises.reduce((n, e) => n + e.sets.length, 0)
              return (
                <li key={routine.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{routine.name}</p>
                    <p className={`truncate text-xs ${faint}`}>{routine.exercises.map((e) => exerciseOf(e).name).join(' · ')}</p>
                    <p className={`text-xs tabular-nums ${muted}`}>
                      {t(routine.exercises.length === 1 ? '1 exercise' : '{n} exercises', { n: routine.exercises.length })} · {t(sets === 1 ? '1 set' : '{n} sets', { n: sets })}
                    </p>
                  </div>
                  <button
                    onClick={() => setRoutineEditing(routine)}
                    aria-label={t('Edit {name}', { name: routine.name })}
                    className={`p-1.5 transition active:scale-90 ${accentText}`}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => start(routine)}
                    className="shrink-0 rounded-full bg-royal px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(120,81,169,0.8)] transition active:scale-95"
                  >
                    {t('Start')}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <PrimaryButton onClick={() => setRoutineEditing('new')}>+ {t('Add New Routine')}</PrimaryButton>
      </Card>

      {/* ---- Volume of one routine over time ---- */}
      {/* No card: the chart sits straight on the page background. */}
      {chartRoutine && (
        <section className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SectionTitle>{t('Volume')}</SectionTitle>
              <p className={`text-xs ${muted}`}>{t('Total kg lifted per workout')}</p>
            </div>
            <OptionMenu
              value={chartRoutine.id} onChange={setChartId} label={t('Routine')}
              options={routines.map((r) => ({ value: r.id, label: r.name }))}
            />
          </div>
          {volume.length === 0 ? (
            <p className={`py-10 text-center text-sm ${muted}`}>{t('Finish a workout from this routine to see its volume trend.')}</p>
          ) : (
            <div className="mt-5">
              <LineChart points={volume} pad={Math.max(peak * 0.1, 5)} format={fmt0} label={t('Volume trend')} />
            </div>
          )}
        </section>
      )}

      {/* ---- History of finished workouts ---- */}
      {finished.length > 0 && (
        <Card className="space-y-2">
          <SectionTitle>{t('Workout History')}</SectionTitle>
          <ul className={`divide-y ${divider}`}>
            {finished.map((h) => {
              const s = workoutStats(h)
              const open = openId === h.id
              const title = h.name.trim() || dayLabel(h.day)
              return (
                <li key={h.id} className="py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setOpenId(open ? null : h.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{title}</p>
                        <p className={`text-xs tabular-nums ${muted}`}>
                          {dayLabel(h.day, { weekday: 'short', day: 'numeric', month: 'short' })} · {t(s.exercises === 1 ? '1 exercise' : '{n} exercises', { n: s.exercises })} · {fmt0(s.volume)} {t('kg')}
                          {h.startedAt && h.finishedAt && <> · {formatDuration(h.finishedAt - h.startedAt)}</>}
                        </p>
                      </div>
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${faint}`}
                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleting(h)}
                      aria-label={t('Delete {name}', { name: title })}
                      className={`p-1.5 transition active:scale-90 ${faint}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  {open && (
                    <div className="mt-2 space-y-1.5">
                      {h.exercises.map((e) => (
                        <p key={e.id} className="text-xs">
                          <span className="font-medium">{exerciseOf(e).name}</span>
                          <span className={`tabular-nums ${muted}`}> · {e.sets.filter(isLogged).map(setText).join(', ') || '–'}</span>
                        </p>
                      ))}
                      <button
                        onClick={() => start(toRoutine(title, h.exercises))}
                        className={`mt-1 text-xs font-semibold ${accentText}`}
                      >
                        {t('Repeat this workout')}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {deleting && (
        <ConfirmDialog
          title={t('Delete {name}?', { name: deleting.name.trim() || dayLabel(deleting.day) })}
          message={t("This removes the workout from your history. It can't be undone.")}
          confirmLabel={t('Delete')}
          onCancel={() => setDeleting(null)}
          onConfirm={() => { onDeleteWorkout(deleting.id); setDeleting(null) }}
        />
      )}

      {/* Portal: the tab pages sit on a transformed track (see ui.jsx
          DialogShell). React events still bubble to the pager, so
          data-no-swipe keeps drags inside the sheets from switching tabs. */}
      {createPortal(
        <div data-no-swipe>
          <AnimatePresence>
            {session && (
              <WorkoutSessionSheet
                key="session"
                day={day} dayLabel={dayLabel(day)}
                workout={workout} history={history} routines={routines}
                onUpdate={onUpdate} onFinish={onFinish} onSaveRoutine={onSaveRoutine}
                onClose={() => setSession(false)}
              />
            )}
            {routineEditing && (
              <RoutineSheet
                key="routine"
                routine={routineEditing === 'new' ? null : routineEditing}
                onSave={onSaveRoutine} onDelete={onDeleteRoutine}
                onClose={() => setRoutineEditing(null)}
              />
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  )
}
