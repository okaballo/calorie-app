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
//   Splits Suggestions         SplitsSheet: pick exercises for a new routine
//   Start / Continue Routine   WorkoutSessionSheet: log the sets
import { useEffect, useState } from 'react'
import { fmt0, parseDay } from '../lib/calc.js'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import {
  EMPTY_WORKOUT, byRecent, exerciseOf, isBodyweight, formatDuration, isLive, isLogged, newEntry, routineVolume, setText, startEntries, toRoutine,
  workoutStats,
} from '../lib/workouts.js'
import { splitDayExercises } from '../lib/exercisesDB.ts'
import {
  Card, SectionTitle, PageTitle, PrimaryButton, PencilIcon, ChevronIcon, Sheet, TrashIcon, EmptyState, ConfirmDialog, SheetPortal, muted, faint, accentText, buttonBg, divider,
} from '../components/ui.jsx'
import { LineChart } from '../components/Charts.jsx'
import OptionMenu from '../components/OptionMenu.jsx'
import WorkoutSessionSheet, { WorkoutStatsRow } from '../components/WorkoutSessionSheet.jsx'
import RoutineSheet from '../components/RoutineSheet.jsx'
import SplitsSheet from '../components/SplitsSheet.jsx'
import { t, locale } from '../lib/i18n.js'
import { StreakChip, WorkoutStreakSheet } from '../components/Streaks.jsx'

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
  routines, bodyWeight, onSaveRoutine, onDeleteRoutine, onBackToToday, streak, onStreakTarget,
}) {
  // Only the workout in progress lives in `workouts`; finished ones are in `history`.
  const workout = workouts[day] ?? EMPTY_WORKOUT
  const stats = workoutStats(workout)
  const isActive = day === activeDate
  const live = workout.exercises.length > 0

  const [session, setSession] = useState(false)              // the logging screen is open
  const [routineEditing, setRoutineEditing] = useState(null) // null | 'new' | routine being edited
  const [routineDraft, setRoutineDraft] = useState(null)     // what Splits Suggestions hands a new routine
  const [splitsOpen, setSplitsOpen] = useState(false)
  const [programOpen, setProgramOpen] = useState(null)       // null | id of the program whose page is open
  const [streakOpen, setStreakOpen] = useState(false)
  const [openId, setOpenId] = useState(null)                 // expanded history entry
  const [deleting, setDeleting] = useState(null)             // history entry awaiting confirmation

  // Starting a routine (or repeating a past workout) adds its exercises to
  // this day's workout, names it unless it already has a name, starts the timer
  // (a workout already in progress keeps its timer) and opens it.
  const start = (routine) => {
    onUpdate(day, (w) => ({
      name: w.name.trim() ? w.name : routine.name,
      exercises: [...w.exercises, ...startEntries(routine, bodyWeight)],
      startedAt: isLive(w) ? w.startedAt : Date.now(),
      // the routine Save (in the logging screen) writes back to
      routineId: isLive(w) && w.routineId ? w.routineId : routine.id,
    }))
    setSession(true)
  }

  const finished = [...history].sort(byRecent).slice(0, 50)

  // One routine row: its exercises, an edit pencil and Start. Used in the list and inside a program.
  const routineRow = (routine) => {
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
          className="shrink-0 rounded-full bg-royal px-4 py-1.5 text-[13px] font-semibold text-on-accent shadow-[0_6px_16px_-8px_rgba(120,81,169,0.8)] transition neu:shadow-(--neu-raised-sm) active:scale-95"
        >
          {t('Start')}
        </button>
      </li>
    )
  }
  const programRoutines = programOpen ? routines.filter((r) => r.program?.id === programOpen) : []

  // Volume chart: one routine at a time. The dropdown is the routines as they
  // are right now, so adding or deleting one updates it; if the remembered
  // routine is gone, the first one is shown.
  const [chartId, setChartId] = useLocalStorage('mt.volumeRoutine', null)
  const chartRoutine = routines.find((r) => r.id === chartId) ?? routines[0]
  const volume = chartRoutine ? routineVolume(history, chartRoutine, routines) : []
  const peak = Math.max(0, ...volume.map((p) => p.value))

  return (
    <>
      <PageTitle action={
        <StreakChip
          value={streak.current} lit={streak.thisWeek >= streak.target}
          extra={`${streak.thisWeek}/${streak.target}`}
          label={`${t('Workout streak')}: ${streak.current}`} onClick={() => setStreakOpen(true)}
        />
      }>{t('Workout')}</PageTitle>
      <SheetPortal>
        {streakOpen && (
          <WorkoutStreakSheet
            streak={streak} onTarget={onStreakTarget} onClose={() => setStreakOpen(false)}
            weekLabel={(start) => dayLabel(start, { day: 'numeric', month: 'short' })}
          />
        )}
      </SheetPortal>

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
            <WorkoutStatsRow stats={stats} />
            <div className="flex gap-3">
              {/* Quiet graphite, like the app's inputs: Continue is the main action. */}
              <button
                onClick={() => onFinish(day)}
                className={`flex-1 rounded-2xl py-3.5 font-semibold transition active:scale-[0.98] active:opacity-80 ${buttonBg}`}
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
          <EmptyState icon={<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />}>
            {t('No routines yet. Build one and start it with one tap whenever you train.')}
          </EmptyState>
        ) : (
          <ul className={`divide-y ${divider}`}>
            {/* A program (routines sharing `program.id`) is one row, at the place of its first routine. */}
            {routines.map((routine) => {
              if (!routine.program) return routineRow(routine)
              const members = routines.filter((r) => r.program?.id === routine.program.id)
              if (members[0] !== routine) return null
              return (
                <li key={`program-${routine.program.id}`}>
                  <button onClick={() => setProgramOpen(routine.program.id)} className="flex w-full items-center gap-2 py-2.5 text-start">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{routine.program.name}</p>
                      <p className={`truncate text-xs ${faint}`}>{members.map((r) => r.name).join(' · ')}</p>
                      <p className={`text-xs tabular-nums ${muted}`}>{t('{n} routines', { n: members.length })}</p>
                    </div>
                    <ChevronIcon className={`h-5 w-5 ${faint}`} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <PrimaryButton onClick={() => setRoutineEditing('new')}>+ {t('Add New Routine')}</PrimaryButton>
        <button
          onClick={() => setSplitsOpen(true)}
          className={`w-full rounded-2xl py-3 font-semibold transition active:scale-[0.98] ${buttonBg} ${accentText}`}
        >
          {t('Splits Suggestions')}
        </button>
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
            <EmptyState icon={<path d="M4 4v16h16M7.5 15l3.5-4 3 2.5L19 8" />}>
              {t('Finish a workout from this routine to see its volume trend.')}
            </EmptyState>
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
                          <span className={`tabular-nums ${muted}`}> · {e.sets.filter(isLogged).map((s) => setText(s, isBodyweight(exerciseOf(e)))).join(', ') || '–'}</span>
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

      <SheetPortal>
        {programRoutines.length > 0 && (
          <Sheet key="program" title={programRoutines[0].program.name} closeLabel="Close" onClose={() => setProgramOpen(null)}>
            <Card>
              <ul className={`divide-y ${divider}`}>{programRoutines.map(routineRow)}</ul>
            </Card>
          </Sheet>
        )}
        {session && (
          <WorkoutSessionSheet
            key="session"
            day={day} dayLabel={dayLabel(day)}
            workout={workout} history={history} routines={routines} bodyWeight={bodyWeight}
            onUpdate={onUpdate} onFinish={onFinish} onSaveRoutine={onSaveRoutine}
            onClose={() => setSession(false)}
          />
        )}
        {routineEditing && (
          <RoutineSheet
            key="routine"
            routine={routineEditing === 'new' ? null : routineEditing} draft={routineDraft} bodyWeight={bodyWeight}
            onSave={onSaveRoutine} onDelete={onDeleteRoutine}
            onClose={() => { setRoutineEditing(null); setRoutineDraft(null) }}
          />
        )}
        {splitsOpen && (
          <SplitsSheet
            key="splits"
            onNext={(exercises, dayName) => {
              setRoutineDraft({ name: dayName ? t(dayName) : '', exercises })
              setRoutineEditing('new')
              setSplitsOpen(false)
            }}
            // A whole program: one routine per day, tagged with the program so the list shows them as one row.
            // Saved last-to-first because a new routine goes to the top.
            onAddProgram={(split) => {
              const program = { id: crypto.randomUUID(), name: t(split.name) };
              [...split.days].reverse().forEach((day) => onSaveRoutine({
                ...toRoutine(t(day.name), splitDayExercises(day).map((ex) => newEntry(ex, [], bodyWeight))),
                program,
              }))
              setSplitsOpen(false)
            }}
            onClose={() => setSplitsOpen(false)}
          />
        )}
      </SheetPortal>
    </>
  )
}
