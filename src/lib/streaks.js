// Streaks, worked out from data the app already keeps (nothing extra is stored):
//   calories  consecutive tracking days that ended inside the calorie range
//   workouts  consecutive weeks with at least `target` workout days
//
// Calorie day: hit when calories are between LOW[goal type] x goal and goal + 10%.
// The 10% above the goal forgives an accidental overshoot; the lower bound stops a
// day with (almost) nothing logged from counting. Tracking days are labels that
// only change when the user taps Start New Day, so the streak continues only when
// each label is the very next calendar date; a skipped date breaks it.
// A cheat day neither breaks the streak nor adds to it (a freeze).
// The day in progress never breaks the streak: it only adds one while its total
// is inside the range, and counts for good once the day is closed.
//
// Workout week: starts on the device's first weekday (same as the week strip). The
// week in progress never breaks the streak and adds one once the target is reached.
// Several workouts on one day count once.
import { dayTotals, dayKey, parseDay, firstWeekday } from './calc.js'

export const OVER = 1.1
export const LOW = { Cut: 0.6, Maintain: 0.9, Bulk: 0.95 }
export const DAY_MILESTONES = [7, 14, 30, 60, 100, 200, 365]
export const WEEK_MILESTONES = [4, 8, 12, 26, 52]

const addDays = (key, n) => {
  const d = parseDay(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** The kcal range that keeps a day alive: { min, max } (rounded), or null with no goal. */
/** Cut, Maintain or Bulk from a calorie goal and the maintenance calories: more than 5% under or over maintenance. */
export const goalTypeFor = (goal, maintenance) => {
  if (!(maintenance > 0)) return 'Maintain'
  const ratio = goal / maintenance
  return ratio < 0.95 ? 'Cut' : ratio > 1.05 ? 'Bulk' : 'Maintain'
}

export const calorieRange = (goal, goalType) => {
  if (!(goal > 0)) return null
  return { min: Math.round(goal * (LOW[goalType] ?? LOW.Maintain)), max: Math.round(goal * OVER) }
}

/** The biggest milestone not above `value`, or 0. */
export const milestoneFor = (value, list) => list.reduce((best, m) => (value >= m ? m : best), 0)

/**
 * @returns {{
 *   range: {min:number,max:number}|null,
 *   confirmed: number,   streak over closed days (what milestones use)
 *   current: number,     confirmed + 1 while today is inside the range
 *   best: number,
 *   today: 'ok'|'low'|'over'|'cheat',
 *   hitDays: Set<string>, closed days that were hits
 *   recent: {key:string,status:'hit'|'miss'|'cheat'|'today'|'none'}[]  last 7 days up to today
 * }}
 */
export const calorieStreak = (meals, activeDate, cheatDays, goal, goalType) => {
  const range = calorieRange(goal, goalType)
  const hitDays = new Set()
  const out = { range, confirmed: 0, current: 0, best: 0, today: 'low', hitDays, recent: [] }
  if (!range) return out

  const byDay = dayTotals(meals)
  const statusOf = (key) => {
    if (cheatDays.includes(key)) return 'cheat'
    const kcal = byDay[key]?.calories ?? 0
    return kcal >= range.min && kcal <= range.max ? 'hit' : 'miss'
  }

  let first = null
  for (const key of Object.keys(byDay)) if (key < activeDate && (!first || key < first)) first = key

  let run = 0
  if (first) {
    for (let key = first; key < activeDate; key = addDays(key, 1)) {
      const s = statusOf(key)
      if (s === 'hit') { run += 1; hitDays.add(key); out.best = Math.max(out.best, run) }
      else if (s === 'miss') run = 0
    }
  }
  out.confirmed = run

  const kcal = byDay[activeDate]?.calories ?? 0
  out.todayKcal = kcal
  out.today = cheatDays.includes(activeDate) ? 'cheat' : kcal > range.max ? 'over' : kcal >= range.min ? 'ok' : 'low'
  out.current = run + (out.today === 'ok' ? 1 : 0)
  out.best = Math.max(out.best, out.current)

  for (let i = 6; i >= 0; i -= 1) {
    const key = addDays(activeDate, -i)
    out.recent.push({
      key,
      status: key === activeDate ? 'today'
        : key < (first ?? activeDate) ? 'none'
        : statusOf(key),
    })
  }
  return out
}

/** Key of the first day of the week containing `key`. */
export const weekStart = (key) => {
  const d = parseDay(key)
  d.setDate(d.getDate() - ((d.getDay() - firstWeekday() + 7) % 7))
  return dayKey(d)
}

/**
 * @returns {{
 *   target:number, thisWeek:number,  workout days so far in the week in progress
 *   confirmed:number, current:number, best:number,
 *   weeks: {start:string,count:number,status:'met'|'missed'|'current'|'none'}[]  last 6 weeks, oldest first
 * }}
 */
export const workoutStreak = (history, activeDate, target) => {
  const goal = Math.min(7, Math.max(1, Math.round(Number(target)) || 3))
  const daysByWeek = new Map()
  for (const w of history) {
    const day = w.day ?? (w.finishedAt ? dayKey(w.finishedAt) : null)
    if (!day) continue
    const start = weekStart(day)
    if (!daysByWeek.has(start)) daysByWeek.set(start, new Set())
    daysByWeek.get(start).add(day)
  }
  const countOf = (start) => daysByWeek.get(start)?.size ?? 0

  const thisStart = weekStart(activeDate)
  let first = null
  for (const start of daysByWeek.keys()) if (start < thisStart && (!first || start < first)) first = start

  let run = 0
  let best = 0
  if (first) {
    for (let start = first; start < thisStart; start = addDays(start, 7)) {
      if (countOf(start) >= goal) { run += 1; best = Math.max(best, run) } else run = 0
    }
  }
  const thisWeek = countOf(thisStart)
  const current = run + (thisWeek >= goal ? 1 : 0)

  const weeks = []
  for (let i = 5; i >= 0; i -= 1) {
    const start = addDays(thisStart, -7 * i)
    const count = countOf(start)
    weeks.push({
      start, count,
      status: i === 0 ? 'current' : first && start >= first ? (count >= goal ? 'met' : 'missed') : 'none',
    })
  }
  return { target: goal, thisWeek, confirmed: run, current, best: Math.max(best, current), weeks }
}

