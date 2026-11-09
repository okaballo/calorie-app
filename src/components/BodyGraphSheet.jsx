// Body graph (Workout tab, from the Workout History card): a front and back
// figure of the muscles trained on the picked day, or in the picked week.
//   Day   main muscles of an exercise are full blue, secondary-only ones lighter.
//   Week  three shades by sets in the week (1-4, 5-9, 10+), and every muscle is
//         listed against WEEK_TARGET sets so the neglected ones show.
// Around the figures: a summary (exercises, sets, volume), a legend and the muscle
// list. Tapping a muscle (figure or list) shows its exercises with their sets and
// how long ago it was last trained. Days come from Home's week strip.
// The figure's polygons are MIT-licensed open source (see lib/bodyMap.js).
import { memo, useCallback, useMemo, useState } from 'react'
import { Sheet, Card, Segmented, muted, faint, divider } from './ui.jsx'
import { WeekStrip } from '../tabs/Home.jsx'
import { WorkoutStatsRow } from './WorkoutSessionSheet.jsx'
import { musclesOn, workoutStats } from '../lib/workouts.js'
import { MUSCLES } from '../lib/exercisesDB.ts'
import { FRONT, BACK } from '../lib/bodyMap.js'
import { dayKey, parseDay } from '../lib/calc.js'
import { weekStart } from '../lib/streaks.js'
import { t } from '../lib/i18n.js'

const WEEK_TARGET = 10 // sets per muscle per week: the usual lower end for growth
const RECOVERY_DAYS = 2

// Shades of a muscle: 0 not trained, 1 light, 2 medium, 3 full.
const SHADE = [
  'fill-zinc-300 dark:fill-zinc-700',
  'fill-carbs-deep/35 dark:fill-carbs/35',
  'fill-carbs-deep/65 dark:fill-carbs/65',
  'fill-carbs-deep dark:fill-carbs',
]
const BAR = ['', 'bg-carbs-deep/35 dark:bg-carbs/35', 'bg-carbs-deep/65 dark:bg-carbs/65', 'bg-carbs-deep dark:bg-carbs']
const levelOf = (s, week) => (!s ? 0 : week ? (s.sets >= WEEK_TARGET ? 3 : s.sets >= 5 ? 2 : 1) : s.primary ? 3 : 1)
const LEGEND = {
  Day: [[3, 'Main muscle'], [1, 'Secondary'], [0, 'Not trained']],
  Week: [[1, '1–4 sets'], [2, '5–9 sets'], [3, '10+ sets']],
}

const countText = (s) =>
  `${t(s.exercises === 1 ? '1 exercise' : '{n} exercises', { n: s.exercises })} · ${t(s.sets === 1 ? '1 set' : '{n} sets', { n: s.sets })}`

/** One figure; memoised so it only repaints when the colours or the selection change. */
const Figure = memo(function Figure({ view, levels, selected, onPick, label }) {
  return (
    <svg viewBox="-2 -2 104 224" className="h-auto w-full" role="img" aria-label={label}>
      <g className="fill-zinc-200 dark:fill-zinc-800">
        {view.base.map((points, i) => <polygon key={i} points={points} />)}
      </g>
      <g strokeLinejoin="round" strokeWidth="0.8">
        {view.parts.map(([muscle, points], i) => (
          <polygon
            key={i} points={points}
            className={`${SHADE[levels[muscle] ?? 0]} cursor-pointer transition-[fill] duration-200 ${selected === muscle ? 'stroke-zinc-900 dark:stroke-white' : 'stroke-transparent'}`}
            onClick={() => onPick(muscle)}
          />
        ))}
      </g>
    </svg>
  )
})

const EMPTY = []

export default function BodyGraphSheet({ history, day, activeDate, onClose }) {
  const [viewDay, setViewDay] = useState(day)
  const [mode, setMode] = useState('Day')
  const [picked, setPicked] = useState(null) // muscle name
  const week = mode === 'Week'

  const trainedDays = useMemo(() => new Set(history.map((w) => w.day)), [history])
  const lastTrained = useMemo(() => musclesOn(history), [history]) // all workouts; only `last` is read
  // The range is the picked day, or the strip's week that holds it.
  const { workouts, muscles, stats } = useMemo(() => {
    const from = week ? weekStart(viewDay) : viewDay
    const end = parseDay(from)
    end.setDate(end.getDate() + 6)
    const to = week ? dayKey(end) : viewDay
    const workouts = history.filter((w) => w.day >= from && w.day <= to)
    const stats = workoutStats({ exercises: workouts.flatMap((w) => w.exercises) })
    // Finished sets count by their reps (as everywhere on this page), not the tick box.
    return { workouts, muscles: musclesOn(workouts), stats: { ...stats, done: stats.logged } }
  }, [history, viewDay, week])
  const levels = useMemo(
    () => Object.fromEntries(Object.entries(muscles).map(([m, s]) => [m, levelOf(s, week)])),
    [muscles, week],
  )
  // Day: the trained muscles. Week: every muscle, so the ones under target show too. Most sets first.
  const rows = useMemo(
    () => (week ? [...MUSCLES] : Object.keys(muscles)).sort((a, b) => (muscles[b]?.sets ?? 0) - (muscles[a]?.sets ?? 0)),
    [muscles, week],
  )
  const maxSets = Math.max(week ? WEEK_TARGET : 1, ...Object.values(muscles).map((s) => s.sets))

  // Tapping the same muscle again hides its details.
  const pick = useCallback((m) => setPicked((cur) => (cur === m ? null : m)), [])
  const info = picked && muscles[picked]
  const last = picked && lastTrained[picked]?.last
  const ago = last ? Math.round((parseDay(activeDate) - parseDay(last)) / 864e5) : null

  return (
    <Sheet title={t('Body Graph')} closeLabel="Close" onClose={onClose}>
      <Segmented options={['Day', 'Week']} value={mode} onChange={setMode} />
      <Card className="space-y-4">
        <WeekStrip viewDay={viewDay} activeDate={activeDate} meals={EMPTY} cheatDays={EMPTY} marked={trainedDays} onViewDay={setViewDay} />
        {workouts.length > 0 && (
          <div className="space-y-2">
            <p className={`text-center text-xs ${muted}`}>{t(workouts.length === 1 ? '1 workout' : '{n} workouts', { n: workouts.length })}</p>
            <WorkoutStatsRow stats={stats} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 px-2">
          <Figure view={FRONT} levels={levels} selected={picked} onPick={pick} label={t('Front')} />
          <Figure view={BACK} levels={levels} selected={picked} onPick={pick} label={t('Back view')} />
        </div>
        <ul className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs ${muted}`} aria-label={t('Legend')}>
          {LEGEND[mode].map(([level, label]) => (
            <li key={label} className="flex items-center gap-1.5">
              <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden="true"><circle cx="5" cy="5" r="5" className={SHADE[level]} /></svg>
              {t(label)}
            </li>
          ))}
        </ul>
        <div className="min-h-12 text-center" aria-live="polite">
          {picked ? (
            <>
              <p className="font-semibold">{t(picked)}</p>
              <p className={`text-sm tabular-nums ${muted}`}>{info ? countText(info) : t(week ? 'Not trained this week' : 'Not trained on this day')}</p>
              {ago !== null && (
                <p className={`text-xs ${faint}`}>
                  {ago === 0 ? t('Last trained today') : ago === 1 ? t('Last trained yesterday') : t('Last trained {n} days ago', { n: ago })}
                  {ago < RECOVERY_DAYS && ` · ${t('Recovering')}`}
                </p>
              )}
              {info && (
                <ul className="mt-3 space-y-1 text-start">
                  {info.items.map((item) => (
                    <li key={item.id} className="text-xs">
                      <span className="font-medium">{item.name}</span>
                      <span className={`tabular-nums ${muted}`}> · {item.text || '–'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className={`text-sm ${faint}`}>
              {t(workouts.length ? 'Tap a muscle to see its sets.' : week ? 'No finished workout this week.' : 'No finished workout on this day.')}
            </p>
          )}
        </div>
      </Card>

      {rows.length > 0 && (
        <Card>
          <ul className={`divide-y ${divider}`}>
            {rows.map((m) => {
              const s = muscles[m]
              const sets = s?.sets ?? 0
              return (
                <li key={m}>
                  <button
                    onClick={() => pick(m)}
                    aria-pressed={picked === m}
                    className={`-mx-2 block w-[calc(100%+1rem)] rounded-xl px-2 py-2.5 text-start transition ${picked === m ? 'bg-black/5 dark:bg-white/8' : ''}`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold">{t(m)}</span>
                      <span className={`text-xs tabular-nums ${muted}`}>
                        {week && sets < WEEK_TARGET && <span className="me-1.5 font-semibold text-fat-deep dark:text-fat">{t('Needs work')}</span>}
                        {week ? `${sets}/${WEEK_TARGET} ${t('sets')}` : countText(s)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div className={`h-full rounded-full ${BAR[levels[m] ?? 0]}`} style={{ width: `${Math.min(100, (sets / maxSets) * 100)}%` }} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </Sheet>
  )
}
