// The maths and streak rules that decide what people see. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayKey, divideBatch, mealTotals, nextTrackingDay, num, parseDay, periodStats, startOfWeek, tdee } from '../src/lib/calc.js'
import { calorieRange, calorieStreak, goalTypeFor, milestoneFor, weekStart, workoutStreak } from '../src/lib/streaks.js'

// Weeks start on the device's first weekday: fix it to Monday, so results do not depend on this machine.
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-GB' }, configurable: true })

/** A meal worth `kcal` calories on tracking day `day`. */
const meal = (day, kcal) => ({ id: `${day}-${kcal}`, day, date: `${day}T12:00:00`, items: [{ calories: 100, protein: 0, carbs: 0, fat: 0, grams: kcal }] })
const workout = (day) => ({ id: day, day })

test('num accepts both decimal marks and treats nonsense as 0', () => {
  assert.equal(num('1,5'), 1.5)
  assert.equal(num('1.5'), 1.5)
  assert.equal(num('abc'), 0)
  assert.equal(num(null), 0)
})

test('mealTotals scales per-100 g values by the grams eaten', () => {
  const totals = mealTotals({ items: [{ calories: 200, protein: 10, carbs: 20, fat: 5, grams: 150 }] })
  assert.deepEqual(totals, { calories: 300, protein: 15, carbs: 30, fat: 7.5 })
})

test('a date key stays on the same calendar day in any time zone', () => {
  const d = parseDay('2026-06-05')
  assert.equal(d.getDate(), 5)
  assert.equal(dayKey(d), '2026-06-05')
})

test('the next tracking day is unique and never behind today', () => {
  assert.equal(nextTrackingDay('2026-06-17', new Date(2026, 5, 17, 22)), '2026-06-18') // finished early
  assert.equal(nextTrackingDay('2026-06-10', new Date(2026, 5, 17)), '2026-06-17')     // came back a week later
  assert.equal(nextTrackingDay('2026-06-30', new Date(2026, 5, 30)), '2026-07-01')     // month boundary
})

test('tdee follows Mifflin-St Jeor, the activity multiplier and the goal', () => {
  const stats = { sex: 'Male', weightKg: 80, heightCm: 180, age: 30, activity: 'Moderately active' }
  const result = tdee({ ...stats, goal: 'Cut' })
  assert.equal(result.bmr, 1780)
  assert.equal(result.maintenance, 1780 * 1.55)
  assert.equal(result.target, 1780 * 1.55 - 500)
  assert.equal(result.protein, 160)
  assert.equal(tdee({ ...stats, sex: 'Female', goal: 'Maintain' }).bmr, 1614)
})

test('tdee never targets below 1200 kcal', () => {
  assert.equal(tdee({ sex: 'Female', weightKg: 40, heightCm: 140, age: 70, activity: 'Sedentary', goal: 'Cut' }).target, 1200)
})

test('divideBatch splits a batch, and copes with no weight', () => {
  const totals = { calories: 1000, protein: 100, carbs: 50, fat: 20 }
  const result = divideBatch(totals, 500, 4)
  assert.equal(result.portionGrams, 125)
  assert.equal(result.perPortion.calories, 250)
  assert.equal(result.per100g.calories, 200)
  assert.equal(divideBatch(totals, 0, 4).per100g.calories, 0)
})

test('calories burned skips the day in progress and days with nothing logged', () => {
  const meals = [meal('2026-06-15', 1500), meal('2026-06-17', 500)] // the 16th is empty, the 17th is active
  const stats = periodStats(meals, '2026-06-17', 'Week', 2000)
  assert.equal(stats.burned, 500)
  assert.equal(stats.finished, 1)
  assert.equal(stats.maintenanceTotal, 2000)
  assert.equal(stats.total.calories, 2000)
  assert.equal(stats.bars.length, 7)
})

test('a week starts on the first weekday', () => {
  assert.equal(weekStart('2026-06-17'), '2026-06-15') // Wednesday -> Monday
  assert.equal(weekStart('2026-06-15'), '2026-06-15')
  assert.equal(weekStart('2026-06-14'), '2026-06-08') // Sunday belongs to the week before
  assert.equal(dayKey(startOfWeek(parseDay('2026-07-01'))), '2026-06-29')
})

test('the goal type comes from the goal against maintenance', () => {
  assert.equal(goalTypeFor(1500, 2000), 'Cut')
  assert.equal(goalTypeFor(2000, 2000), 'Maintain')
  assert.equal(goalTypeFor(2500, 2000), 'Bulk')
  assert.equal(goalTypeFor(2000, 0), 'Maintain')
})

test('the calorie range depends on the goal type', () => {
  assert.deepEqual(calorieRange(2000, 'Maintain'), { min: 1800, max: 2200 })
  assert.deepEqual(calorieRange(2000, 'Cut'), { min: 1200, max: 2200 })
  assert.equal(calorieRange(0, 'Maintain'), null)
})

test('closed days inside the range build the streak; the day in progress never breaks it', () => {
  const closed = [meal('2026-06-15', 2000), meal('2026-06-16', 2000)]
  const low = calorieStreak(closed, '2026-06-17', [], 2000, 'Maintain')
  assert.equal(low.confirmed, 2)
  assert.equal(low.current, 2)
  assert.equal(low.today, 'low')

  const ok = calorieStreak([...closed, meal('2026-06-17', 2000)], '2026-06-17', [], 2000, 'Maintain')
  assert.equal(ok.confirmed, 2)
  assert.equal(ok.current, 3)

  const over = calorieStreak([...closed, meal('2026-06-17', 3000)], '2026-06-17', [], 2000, 'Maintain')
  assert.equal(over.today, 'over')
  assert.equal(over.current, 2)
})

test('a miss or a skipped date breaks the calorie streak, and best remembers it', () => {
  const missed = [meal('2026-06-14', 2000), meal('2026-06-15', 2000), meal('2026-06-16', 3000)]
  const a = calorieStreak(missed, '2026-06-17', [], 2000, 'Maintain')
  assert.equal(a.confirmed, 0)
  assert.equal(a.best, 2)

  const skipped = [meal('2026-06-14', 2000), meal('2026-06-16', 2000)] // nothing on the 15th
  assert.equal(calorieStreak(skipped, '2026-06-17', [], 2000, 'Maintain').confirmed, 1)
})

test('a cheat day neither breaks the calorie streak nor adds to it', () => {
  const meals = [meal('2026-06-14', 2000), meal('2026-06-15', 5000), meal('2026-06-16', 2000)]
  const streak = calorieStreak(meals, '2026-06-17', ['2026-06-15'], 2000, 'Maintain')
  assert.equal(streak.confirmed, 2)
  assert.equal(streak.hitDays.has('2026-06-15'), false)
})

test('a recent empty day can be revived with a cheat day, a logged miss cannot', () => {
  const skipped = [meal('2026-06-14', 2000), meal('2026-06-16', 2000)] // nothing on the 15th
  const a = calorieStreak(skipped, '2026-06-17', [], 2000, 'Maintain')
  assert.equal(a.revivable, '2026-06-15')
  const b = calorieStreak(skipped, '2026-06-17', ['2026-06-15'], 2000, 'Maintain')
  assert.equal(b.revivable, null)
  assert.equal(b.confirmed, 2)
  const over = calorieStreak([meal('2026-06-14', 2000), meal('2026-06-15', 5000)], '2026-06-17', [], 2000, 'Maintain')
  assert.equal(over.revivable, '2026-06-16') // the 16th is empty; the over-limit 15th has meals
  assert.equal(calorieStreak([meal('2026-06-14', 5000)], '2026-06-15', [], 2000, 'Maintain').revivable, null)
})

test('no calorie goal means no streak', () => {
  const streak = calorieStreak([meal('2026-06-16', 2000)], '2026-06-17', [], 0, 'Maintain')
  assert.equal(streak.range, null)
  assert.equal(streak.current, 0)
})

test('workout weeks count days, not workouts; the week in progress only adds', () => {
  const history = [workout('2026-06-01'), workout('2026-06-08'), workout('2026-06-10'), workout('2026-06-15')]
  const running = workoutStreak(history, '2026-06-17', 2)
  assert.equal(running.confirmed, 1) // the week of the 1st missed, the week of the 8th met
  assert.equal(running.thisWeek, 1)
  assert.equal(running.current, 1)
  assert.equal(workoutStreak([...history, workout('2026-06-16')], '2026-06-17', 2).current, 2)

  const sameDay = [{ id: 'a', day: '2026-06-08' }, { id: 'b', day: '2026-06-08' }]
  assert.equal(workoutStreak(sameDay, '2026-06-17', 2).confirmed, 0)
})

test('a week with too few workouts breaks the workout streak', () => {
  const history = [workout('2026-06-01'), workout('2026-06-15')] // nothing in the week of the 8th
  assert.equal(workoutStreak(history, '2026-06-22', 1).confirmed, 1)
  assert.equal(workoutStreak(history, '2026-06-22', 1).best, 1)
})

test('milestoneFor picks the biggest one reached', () => {
  assert.equal(milestoneFor(6, [7, 14]), 0)
  assert.equal(milestoneFor(14, [7, 14, 30]), 14)
})
