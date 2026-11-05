// All the maths and formatting lives here, so components only display results.
import { locale } from './i18n.js'

export const ZERO = { calories: 0, protein: 0, carbs: 0, fat: 0 }

export const add = (a, b) => ({
  calories: a.calories + b.calories,
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fat: a.fat + b.fat,
})

/** The dynamic macro calculator: per-100 g values scaled to any weight. */
export const scale = (per100, grams) => {
  const f = Math.max(grams, 0) / 100
  return {
    calories: per100.calories * f,
    protein: per100.protein * f,
    carbs: per100.carbs * f,
    fat: per100.fat * f,
  }
}

export const mealTotals = (meal) =>
  meal.items.reduce((t, item) => add(t, scale(item, item.grams)), ZERO)

export const mealGrams = (meal) => meal.items.reduce((g, item) => g + item.grams, 0)

/** Parses typed numbers, accepting "." or "," decimals. Invalid input is 0. */
export const num = (value) => {
  const n = parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
export const round1 = (n) => Math.round(n * 10) / 10

export const fmt0 = (n) => Math.round(n).toLocaleString()
export const fmt1 = (n) => round1(n).toLocaleString()

/** Local calendar day as "YYYY-MM-DD". */
export const dayKey = (date = new Date()) => {
  const d = new Date(date)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// ---- Manual tracking days ---------------------------------------------------
// A "tracking day" is a label ("YYYY-MM-DD") that only changes when the user
// taps Start New Day. The clock never changes it.

/** "YYYY-MM-DD" -> local Date (avoids the UTC shift of new Date(string)). */
export const parseDay = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The tracking day a meal belongs to. Meals logged before this feature
 *  existed have no `day`, so they fall back to their calendar date. */
export const mealDay = (meal) => meal.day ?? dayKey(meal.date)

/**
 * Label for the day that starts when the user taps Start New Day:
 * today's calendar date, or the day after the current one if that is later.
 * This keeps every tracking day unique, e.g. finishing Saturday at 1 AM on
 * Sunday starts "Sunday"; finishing Saturday early at 10 PM also starts "Sunday".
 */
export const nextTrackingDay = (activeDate, now = new Date()) => {
  const next = parseDay(activeDate)
  next.setDate(next.getDate() + 1)
  const dayAfter = dayKey(next)
  const today = dayKey(now)
  return dayAfter > today ? dayAfter : today
}

/** The latest tracking day before `key` that has meals, or null. Deleting
 *  the active day returns to this day, undoing an accidental Start New Day. */
export const previousDay = (meals, key) =>
  meals.reduce((best, meal) => {
    const d = mealDay(meal)
    return d < key && (!best || d > best) ? d : best
  }, null)

// ---- TDEE ----------------------------------------------------------------

export const ACTIVITY = [
  ['Sedentary', 1.2],
  ['Lightly active', 1.375],
  ['Moderately active', 1.55],
  ['Very active', 1.725],
  ['Athlete', 1.9],
]

export const GOALS = { Cut: -500, Maintain: 0, Bulk: 300 }

/**
 * Mifflin-St Jeor BMR x activity multiplier, adjusted for the goal.
 * Macro split: protein 2 g per kg, fat 25% of calories, carbs the rest.
 */
export const tdee = (profile) => {
  const weight = num(profile.weightKg)
  const base = 10 * weight + 6.25 * num(profile.heightCm) - 5 * num(profile.age)
  const bmr = profile.sex === 'Female' ? base - 161 : base + 5
  const multiplier = (ACTIVITY.find(([name]) => name === profile.activity) || ACTIVITY[1])[1]
  const maintenance = bmr * multiplier
  const target = Math.max(maintenance + (GOALS[profile.goal] ?? 0), 1200)
  const protein = weight * 2
  const fat = (target * 0.25) / 9
  const carbs = Math.max((target - protein * 4 - fat * 9) / 4, 0)
  return { bmr, maintenance, target, protein, carbs, fat }
}

// ---- Weekly analytics ----------------------------------------------------

/** First day of the week for the device's region (0 = Sunday), Monday if unknown. */
export const firstWeekday = () => {
  try {
    const locale = new Intl.Locale(navigator.language)
    const info = locale.getWeekInfo?.() ?? locale.weekInfo
    return info ? info.firstDay % 7 : 1
  } catch {
    return 1
  }
}

/** The first day of the week containing `date`, as a new Date. */
export const startOfWeek = (date) => {
  const d = new Date(date)
  d.setDate(d.getDate() - ((d.getDay() - firstWeekday() + 7) % 7))
  return d
}

/**
 * Seven { date, label, totals } entries for the week containing the active
 * tracking day. Meals are grouped by their tracking day, not by the clock.
 */
export const currentWeek = (meals, activeDate = dayKey(), byDay = dayTotals(meals)) => {
  const start = startOfWeek(parseDay(activeDate))

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return {
      date,
      label: dateFormat(locale(), { weekday: 'short' }).format(date),
      totals: byDay[dayKey(date)] || ZERO,
    }
  })
}

/** Macro totals of every tracking day: { 'YYYY-MM-DD': totals }. One pass over all meals,
 *  so callers that need several weeks compute it once and pass it to currentWeek. */
export const dayTotals = (meals) => {
  const byDay = {}
  for (const meal of meals) {
    const key = mealDay(meal)
    byDay[key] = add(byDay[key] || ZERO, mealTotals(meal))
  }
  return byDay
}

// Intl.DateTimeFormat is slow to create (toLocaleDateString makes a new one on every call), so keep them.
const formats = new Map()
/** A cached Intl.DateTimeFormat; `options` is the whole option bag, e.g. { weekday: 'long', day: 'numeric' }. */
export const dateFormat = (loc, options) => {
  const key = `${loc}|${JSON.stringify(options)}`
  if (!formats.has(key)) formats.set(key, new Intl.DateTimeFormat(loc, options))
  return formats.get(key)
}

// ---- Batch meal divider --------------------------------------------------

/**
 * Splits a batch into portions.
 *   totals    macros of all ingredients together
 *   rawGrams  sum of the ingredient weights
 *   portions  how many portions the batch is divided into
 */
export const divideBatch = (totals, rawGrams, portions) => {
  const n = Math.max(portions, 1)
  return {
    weight: rawGrams,
    portionGrams: rawGrams / n,
    perPortion: scale(totals, 100 / n),                            // totals ÷ n
    per100g: rawGrams > 0 ? scale(totals, 10000 / rawGrams) : ZERO, // totals × 100 / weight
  }
}

// ---- Analytics periods ---------------------------------------------------

export const INTERVALS = ['Week', 'Month', '6 Months', 'Year']

/**
 * Chart data for the period around the active tracking day.
 *   Week      7 daily bars (the week containing the active day)
 *   Month     one bar per day of the active day's month
 *   6 Months  6 monthly bars ending with the active month
 *   Year      12 monthly bars ending with the active month
 * A monthly bar is the AVERAGE calories per logged day in that month, so it
 * reads against the same daily goal line as the daily bars.
 *
 * Returns { bars: [{ label, value }], total, logged, elapsed, range, monthly,
 *           burned, maintenanceTotal, finished }
 *   total    summed macros over the whole period
 *   logged   days in the period with at least one meal
 *   elapsed  days in the period up to and including the active day
 *
 * Calories burned (deficit), per day: maintenance - eaten (negative when you
 * ate above maintenance). Summed over FINISHED days that have meals logged:
 *   - the active day is left out until you start a new day, otherwise its
 *     whole maintenance would count as "burned" before you've eaten dinner
 *   - days with nothing logged are left out, because an unlogged day is
 *     missing data, not a day of eating 0 kcal
 *   maintenanceTotal  maintenance x those same days, the baseline to compare
 */
export const periodStats = (meals, activeDate, interval, maintenance = 0) => {
  const byDay = dayTotals(meals)

  const anchor = parseDay(activeDate)
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  let start
  let end
  if (interval === 'Week') {
    start = startOfWeek(anchor)
    end = new Date(start)
    end.setDate(start.getDate() + 6)
  } else if (interval === 'Month') {
    start = new Date(y, m, 1)
    end = new Date(y, m + 1, 0)
  } else {
    const months = interval === 'Year' ? 12 : 6
    start = new Date(y, m - (months - 1), 1)
    end = new Date(y, m + 1, 0)
  }

  // Every day in the range with its totals.
  const days = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d)
    days.push({ date: new Date(d), key, totals: byDay[key] || ZERO })
  }

  const total = days.reduce((t, d) => add(t, d.totals), ZERO)
  const logged = days.filter((d) => d.totals.calories > 0).length
  const elapsed = days.filter((d) => d.key <= activeDate).length
  const monthly = interval === '6 Months' || interval === 'Year'

  const finishedDays = days.filter((d) => d.key < activeDate && d.totals.calories > 0)
  const burned = finishedDays.reduce((sum, d) => sum + (maintenance - d.totals.calories), 0)
  const maintenanceTotal = maintenance * finishedDays.length

  let bars
  if (!monthly) {
    bars = days.map((d) => ({
      key: d.key, // daily bars can be selected (and the day deleted) in Analytics
      label: interval === 'Week'
        ? d.date.toLocaleDateString(locale(), { weekday: 'short' })
        : String(d.date.getDate()),
      value: d.totals.calories,
    }))
  } else {
    const groups = new Map() // "YYYY-MM" -> { date, sum, logged }
    for (const d of days) {
      const k = d.key.slice(0, 7)
      const g = groups.get(k) || { date: d.date, sum: 0, logged: 0 }
      g.sum += d.totals.calories
      if (d.totals.calories > 0) g.logged += 1
      groups.set(k, g)
    }
    bars = [...groups.values()].map((g) => ({
      label: g.date.toLocaleDateString(locale(), { month: 'short' }),
      value: g.logged ? g.sum / g.logged : 0,
    }))
  }

  const fmt = (d, opts) => d.toLocaleDateString(locale(), opts)
  const range = interval === 'Week'
    ? `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(end, { day: 'numeric', month: 'short' })}`
    : interval === 'Month'
      ? fmt(start, { month: 'long', year: 'numeric' })
      : `${fmt(start, { month: 'short', year: 'numeric' })} – ${fmt(end, { month: 'short', year: 'numeric' })}`

  return { bars, total, logged, elapsed, range, monthly, burned, maintenanceTotal, finished: finishedDays.length }
}
