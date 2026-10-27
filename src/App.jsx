// Root component: owns all saved data, the theme, and the tab layout.
//
// Saved in localStorage (see useLocalStorage):
//   mt.profile      name, body stats and daily goals
//   mt.avatar       profile picture as a base64 JPEG data URL (or null)
//   mt.theme        'system' | 'dark' | 'light'
//   mt.lang         'en' | 'ar' (Arabic switches the layout to right-to-left)
//   mt.meals        logged meals, newest first, each tagged with its tracking day
//   mt.customFoods  the user's own items (per 100 g)
//   mt.templates    saved meal templates
//   mt.weights      weight entries, oldest first
//   mt.activeDay    the tracking day in progress
//   mt.dailyWorkouts     the workout in progress, by tracking day (shapes in lib/workouts.js)
//   mt.workoutHistory    finished workouts
//   mt.workoutTemplates  saved workout routines (key kept from before the rename)
//   mt.gymEquipment      equipment filter of the exercise picker
import { memo, startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion,
  useTransform, useVelocity,
} from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import { SPRING, glassRim, GlassBackdrop } from './components/ui.jsx'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { useLocalStorage } from './lib/useLocalStorage.js'
import { SEED_FOODS } from './lib/foods.js'
import { dayKey, nextTrackingDay, mealDay, parseDay, previousDay } from './lib/calc.js'
import { isRTL, setLanguage, t } from './lib/i18n.js'
import { EMPTY_WORKOUT, isEmptyWorkout, isLive } from './lib/workouts.js'
import Home from './tabs/Home.jsx'
import Analytics from './components/Analytics.jsx'
import Workout from './tabs/Workout.jsx'
import Weight from './tabs/Weight.jsx'
import Profile from './tabs/Profile.jsx'
import AddMealSheet from './components/AddMealSheet.jsx'
import CustomFoodSheet from './components/CustomFoodSheet.jsx'
import TemplateEditSheet from './components/TemplateEditSheet.jsx'
import PlanSheet from './components/PlanSheet.jsx'
import MealDividerSheet from './components/MealDividerSheet.jsx'

// Testing placeholders: 2,100 kcal = 140 g protein + 250 g carbs + 60 g fat.
const DEFAULT_PROFILE = {
  name: '', sex: 'Male', age: 25, heightCm: 175, weightKg: 70,
  activity: 'Lightly active', goal: 'Maintain',
  calorieGoal: 2100, proteinGoal: 140, carbsGoal: 250, fatGoal: 60,
}

// Tab icons: one outlined shape each. The active tab only changes colour; the
// icons are never filled.
const ICONS = {
  Home: 'M3.5 10.2 12 3l8.5 7.2V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z',
  // Dumbbell: outer plate, inner plate, bar, inner plate, outer plate.
  Workout: 'M2 9.5A1.5 1.5 0 0 1 3.5 8H5v8H3.5A1.5 1.5 0 0 1 2 14.5zM5 6.5A1.5 1.5 0 0 1 6.5 5h1A1.5 1.5 0 0 1 9 6.5v11A1.5 1.5 0 0 1 7.5 19h-1A1.5 1.5 0 0 1 5 17.5zM9 10.75h6v2.5H9zM15 6.5A1.5 1.5 0 0 1 16.5 5h1A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5zM19 8h1.5A1.5 1.5 0 0 1 22 9.5v5a1.5 1.5 0 0 1-1.5 1.5H19z',
  Weight: 'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm2 8.5a4 4 0 0 1 8 0z',
  Profile: 'M12 3a4.25 4.25 0 1 1 0 8.5A4.25 4.25 0 0 1 12 3zM4 21a8 8 0 0 1 16 0z',
}

/** Order of the bottom tabs, also the order for swiping between them. */
const TAB_ORDER = ['Home', 'Workout', 'Weight', 'Profile']
const TABS = TAB_ORDER.length

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

/** Inserts a new item or replaces the one with the same id. */
const upsert = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

// Tab bar springs. The lens is slightly under-damped so it lands with a
// small jelly settle, like iOS 26; FOLLOW keeps it glued to a dragging finger.
const LENS_SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 1 }
const FOLLOW_SPRING = { type: 'spring', stiffness: 900, damping: 60 }
const PRESS_SPRING = { type: 'spring', stiffness: 500, damping: 30 }

/** Tab icon: always an outline; the lit row just has a different colour. */
const TabIcon = ({ name }) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true"
    fill="none" fillRule="evenodd"
    stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d={ICONS[name]} />
  </svg>
)

/**
 * Floating Liquid Glass tab bar (iOS 26 style) plus a separate glass "+".
 * Memoised and fed by a motion value, so moving the highlight re-renders only
 * this bar. Pages scroll underneath it; App pads them so nothing is hidden.
 *
 * The selection is a pill (`lensX`) that turns into a glass lens while a
 * finger is down (`press` 0 -> 1), copying the recording:
 *   press      bar swells slightly, pill grows past the bar into a clear lens
 *   drag/tap   lens springs to the tab under the finger, stretching with speed
 *   release    lens lands on the tab and shrinks back into the resting pill
 * The tab row is drawn twice: a muted row with the lens area masked out, and
 * an accent row clipped to the lens and magnified, so icons change colour
 * exactly where the lens covers them.
 */
// `lang` is only passed so the memoised bar re-renders with new labels.
// eslint-disable-next-line no-unused-vars
const TabBar = memo(function TabBar({ navIndex, onTab, onAdd, lang }) {
  const [active, setActive] = useState(navIndex.get())
  useMotionValueEvent(navIndex, 'change', (i) => setActive(i))
  const rtl = isRTL()
  const reduce = useReducedMotion()

  const rowRef = useRef(null)
  const [tabW, setTabW] = useState(0)    // width of one tab slot (state: re-runs the effect below)
  const slotW = useMotionValue(0)        // same width, readable inside motion transforms
  const lensX = useMotionValue(0)        // lens left edge, px from the row's physical left
  const press = useMotionValue(0)        // 0 resting pill .. 1 glass lens
  const edge = useMotionValue(0)         // px the lens is stretched past the first / last tab (signed)
  const drag = useRef(null)              // { x0, moved } while a finger is down

  useLayoutEffect(() => {
    const el = rowRef.current
    const fit = () => {
      const w = el.clientWidth / TABS
      slotW.set(w)
      setTabW(w)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [slotW])

  // Tabs run right-to-left in Arabic, so slot positions are mirrored.
  const slotX = (i) => (rtl ? TABS - 1 - i : i) * tabW
  const moveLens = (target, spring = LENS_SPRING) => (reduce ? lensX.set(target) : animate(lensX, target, spring))
  // Lets go of the stretch with a little elastic wobble.
  const relax = () => (reduce ? edge.set(0) : animate(edge, 0, { type: 'spring', stiffness: 420, damping: 18 }))
  const lift = (to, delay = 0) => (reduce ? press.set(to) : animate(press, to, { ...PRESS_SPRING, delay }))

  // Follow the active tab (taps, page swipes, far jumps), except mid-drag.
  const placed = useRef(false)
  useEffect(() => {
    if (!tabW || drag.current) return
    if (placed.current) moveLens(slotX(active))
    else lensX.set(slotX(active))     // first measure: no slide in from 0
    placed.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tabW, rtl])

  // ---- Lens shape ----------------------------------------------------------
  const velocity = useVelocity(lensX)
  const stretch = useTransform(velocity, (v) => Math.min(Math.abs(v) / 3000, 0.25))
  const lensScaleX = useTransform([press, stretch], ([p, s]) => 1 + 0.16 * p + s)
  const lensScaleY = useTransform([press, stretch], ([p, s]) => 1 + 0.24 * p - 0.4 * s)
  // Dragging past either end: the lens stays on the end tab but stretches
  // toward the finger (its inner edge stays put, the outer edge follows) and
  // squashes a little, like it is being pulled.
  const lensCenterX = useTransform([lensX, edge], ([x, e]) => x + e / 2)
  const lensStretchX = useTransform([lensScaleX, edge, slotW], ([sx, e, w]) => sx + (w ? Math.abs(e) / w : 0))
  const lensSquashY = useTransform([lensScaleY, edge, slotW], ([sy, e, w]) => sy * (1 - 0.12 * Math.min(w ? Math.abs(e) / w : 0, 1)))
  const pillOpacity = useTransform(press, (p) => 1 - p)
  const barScale = useTransform(press, [0, 1], [1, 1.03])
  const zoom = useTransform(press, [0, 1], [1, 1.12])   // magnification under the lens

  // On-screen lens span in row coordinates: centre +- half its scaled width.
  const muteMask = useTransform([lensCenterX, lensStretchX, slotW], ([x, sx, w]) => {
    const l = x + (w / 2) * (1 - sx)
    const r = x + (w / 2) * (1 + sx)
    return `linear-gradient(to right, #000 ${l}px, transparent ${l}px, transparent ${r}px, #000 ${r}px)`
  })
  // The lit row is scaled by `zoom` around the lens centre, so its clip is
  // divided by `zoom` to land on the same on-screen span.
  const litClip = useTransform([lensCenterX, lensStretchX, zoom, slotW], ([x, sx, z, w]) => {
    const c = x + w / 2
    const h = ((w / 2) * sx) / z
    return `inset(0px ${w * TABS - c - h}px 0px ${c - h}px)`
  })
  const litOrigin = useTransform([lensCenterX, slotW], ([x, w]) => (w ? (x + w / 2) / (w * TABS) : 0.5))

  // ---- Gestures ------------------------------------------------------------
  // Pointer x as unscaled px from the row's left (the bar itself scales on press).
  const rowPx = (clientX) => {
    const r = rowRef.current.getBoundingClientRect()
    return ((clientX - r.left) / r.width) * tabW * TABS
  }
  const tabAt = (px) => {
    const slot = clamp(Math.floor(px / tabW), 0, TABS - 1)
    return rtl ? TABS - 1 - slot : slot
  }

  const onPointerDown = (e) => {
    if (!tabW || e.button > 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x0: e.clientX, moved: false }
    lift(1)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || (!d.moved && Math.abs(e.clientX - d.x0) < 6)) return
    d.moved = true
    const want = rowPx(e.clientX) - tabW / 2
    const max = tabW * (TABS - 1)
    const clamped = clamp(want, 0, max)
    moveLens(clamped, FOLLOW_SPRING)
    // Past either end: rubber-band the overshoot into a stretch (never more
    // than ~0.9 of a tab, however far the finger goes).
    const over = want - clamped
    const dim = tabW * 0.3
    if (reduce) edge.set(0)
    else edge.set(Math.sign(over) * (1 - 1 / ((Math.abs(over) * 0.55) / dim + 1)) * dim)
  }
  const onPointerUp = (e) => {
    const d = drag.current
    if (!d) return
    drag.current = null
    const i = tabAt(rowPx(e.clientX))
    moveLens(slotX(i))
    relax()
    // After a tap, stay a lens while it travels so the slide reads as glass.
    lift(0, d.moved ? 0 : 0.16)
    // A drag that ends back on the open tab is not a "tap active tab = scroll to top".
    if (!d.moved || i !== active) onTab(TAB_ORDER[i])
  }
  const onPointerCancel = () => {
    if (!drag.current) return
    drag.current = null
    moveLens(slotX(active))
    relax()
    lift(0)
  }

  const tabRow = (lit) => TAB_ORDER.map((name) => {
    const body = (
      <>
        <TabIcon name={name} />
        <span className="max-w-full truncate px-0.5">{t(name)}</span>
      </>
    )
    const layout = 'flex min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] font-medium'
    return lit ? (
      <div key={name} className={`${layout} text-royal dark:text-lilac`}>{body}</div>
    ) : (
      <button
        key={name}
        type="button"
        // Touch and mouse go through the capsule's pointer handlers above;
        // this only handles keyboard activation (detail 0).
        onClick={(e) => { if (e.detail === 0) onTab(name) }}
        aria-current={TAB_ORDER[active] === name ? 'page' : undefined}
        className={`${layout} rounded-full text-zinc-500 outline-none focus-visible:ring-2 focus-visible:ring-royal/60 dark:text-white/55`}
      >
        {body}
      </button>
    )
  })

  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 px-4 pb-[max(calc(env(safe-area-inset-bottom)-10px),14px)]">
      {/* ---- Glass capsule ---- */}
      <motion.div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        style={{ scale: barScale }}
        className="glass-surface pointer-events-auto relative isolate h-[62px] min-w-0 flex-1 touch-none select-none rounded-full bg-white/20 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] dark:bg-white/[0.06] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.9)]"
      >
        <GlassBackdrop />
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 rounded-full ${glassRim}`} />

        <div ref={rowRef} className="absolute inset-1">
          {/* Resting pill, behind the icons. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-black/6 dark:bg-black/45"
            style={{ width: slotW, x: lensCenterX, scaleX: lensStretchX, scaleY: lensSquashY, opacity: pillOpacity }}
          />

          <motion.div className="relative grid h-full grid-cols-4" style={{ maskImage: muteMask, WebkitMaskImage: muteMask }}>
            {tabRow(false)}
          </motion.div>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid grid-cols-4"
            style={{ clipPath: litClip, WebkitClipPath: litClip, scale: zoom, originX: litOrigin }}
          >
            {tabRow(true)}
          </motion.div>

          {/* Glass lens over the icons: rim highlights plus a faint
              blue / pink fringe, like light bending at the edge. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full"
            style={{ width: slotW, x: lensCenterX, scaleX: lensStretchX, scaleY: lensSquashY, opacity: press }}
          >
            <div className={`absolute inset-0 rounded-full bg-white/5 ${glassRim}`} />
            <div className="absolute inset-0 rounded-full shadow-[inset_2px_0_3px_-1px_rgba(120,170,255,0.55),inset_-2px_0_3px_-1px_rgba(237,133,217,0.5)]" />
          </motion.div>
        </div>
      </motion.div>

      {/* ---- Log a meal: liquid glass ---- */}
      <LiquidButton
        onClick={onAdd}
        aria-label={t('Log a meal')}
        size="icon"
        className="glass-surface pointer-events-auto isolate size-[62px] shrink-0 rounded-full bg-white/55 text-royal shadow-[0_0_22px_-2px_rgba(120,81,169,0.5),0_8px_24px_-10px_rgba(120,81,169,0.55)] backdrop-blur-2xl backdrop-saturate-180 active:scale-90 dark:bg-transparent dark:bg-linear-to-b dark:from-lilac/30 dark:to-royal/30 dark:text-white [&>div]:rounded-full [&>div:nth-of-type(2)]:hidden"
      >
        {/* No warp on this one: at 56 px it only roughens the circle, so
            LiquidButton's warp layer is hidden above. Its rim highlights are
            kept as they are. The glass look comes from the blur, the rim and
            a fuller tint; the warp stays on the bar. */}
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </LiquidButton>
    </nav>
  )
})

export default function App() {
  const [storedProfile, setProfile] = useLocalStorage('mt.profile', DEFAULT_PROFILE)
  const [avatar, setAvatar] = useLocalStorage('mt.avatar', null)
  const [theme, setTheme] = useLocalStorage('mt.theme', 'system')
  const [lang, setLang] = useLocalStorage('mt.lang', 'en')
  // Set before any child renders, so every t() call below uses this language.
  setLanguage(lang)
  const rtl = lang === 'ar'
  const [meals, setMeals] = useLocalStorage('mt.meals', [])
  const [customFoods, setCustomFoods] = useLocalStorage('mt.customFoods', [])
  const [templates, setTemplates] = useLocalStorage('mt.templates', [])
  const [weights, setWeights] = useLocalStorage('mt.weights', [])
  const [cheatDays, setCheatDays] = useLocalStorage('mt.cheatDays', []) // 'YYYY-MM-DD' keys
  const [dailyWorkouts, setDailyWorkouts] = useLocalStorage('mt.dailyWorkouts', {}) // tracking day -> workout
  const [workoutTemplates, setWorkoutTemplates] = useLocalStorage('mt.workoutTemplates', [])
  const [workoutHistory, setWorkoutHistory] = useLocalStorage('mt.workoutHistory', [])

  // Finishing moves the day's workout into the history, freeing the day.
  const finishWorkout = (day) => {
    const w = dailyWorkouts[day]
    if (!w) return
    setWorkoutHistory((list) => [{ id: crypto.randomUUID(), day, ...w, finishedAt: Date.now() }, ...list])
    setDailyWorkouts(({ [day]: _done, ...rest }) => rest)
  }

  // One-time tidy-up of saves from before the history existed: anything in
  // dailyWorkouts that is not in progress is a finished workout. The id is
  // derived from the day, so running this twice (dev double-render) is harmless.
  useEffect(() => {
    const stale = Object.entries(dailyWorkouts).filter(([, w]) => !isLive(w))
    if (stale.length === 0) return
    setWorkoutHistory((list) => [
      ...stale.map(([day, w]) => ({ id: `legacy-${day}`, day, ...w })).filter((w) => !list.some((x) => x.id === w.id)),
      ...list,
    ])
    setDailyWorkouts((all) => Object.fromEntries(Object.entries(all).filter(([, w]) => isLive(w))))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Applies `fn` to one day's workout. A day left with no exercises and no
  // name is dropped, so empty days don't pile up in storage or History.
  const updateWorkout = (day, fn) => setDailyWorkouts((all) => {
    const { [day]: current = EMPTY_WORKOUT, ...rest } = all
    const next = fn(current)
    return isEmptyWorkout(next) ? rest : { ...rest, [day]: next }
  })

  // Older saves have no `name`, so fill any missing fields from the defaults.
  const profile = useMemo(() => ({ ...DEFAULT_PROFILE, ...storedProfile }), [storedProfile])
  // The latest weigh-in drives every calculation that needs body weight
  // (Plan & Goals, maintenance in Analytics). Entries are sorted oldest first.
  // Before the first weigh-in, the weight saved in the profile is used.
  const weighIn = weights[weights.length - 1]
  const planProfile = useMemo(
    () => (weighIn ? { ...profile, weightKg: weighIn.kg } : profile),
    [profile, weighIn],
  )
  const updateProfile = (patch) => setProfile((p) => ({ ...p, ...patch }))

  // The tracking day in progress. Only startNewDay() changes it; the clock never does.
  const [activeDay, setActiveDay] = useLocalStorage('mt.activeDay', {
    date: dayKey(),
    startedAt: new Date().toISOString(),
  })
  const startNewDay = () => {
    setViewDay(null)
    setActiveDay((current) => ({ date: nextTrackingDay(current.date), startedAt: new Date().toISOString() }))
  }

  // The day Home is showing: null = the active day. Picking another date lets
  // you review, add, edit and remove meals on it; everything is stored by
  // tracking-day key, so Analytics recomputes from `meals` like any other edit.
  const [viewDay, setViewDay] = useState(null)
  const shownDay = viewDay && viewDay <= activeDay.date ? viewDay : activeDay.date

  // Deletes a tracking day: all of its meals. Deleting the day in progress
  // also goes back to the previous day that has meals, so an accidental
  // Start New Day can be undone and logging continues on that day.
  const deleteDay = (key) => {
    if (key === activeDay.date) {
      const prev = previousDay(meals, key)
      if (prev) setActiveDay({ date: prev, startedAt: new Date().toISOString() })
    }
    setViewDay((v) => (v === key ? null : v))
    setMeals((list) => list.filter((m) => mealDay(m) !== key))
    setCheatDays((list) => list.filter((d) => d !== key))
  }
  const toggleCheatDay = (key) =>
    setCheatDays((list) => (list.includes(key) ? list.filter((d) => d !== key) : [...list, key]))

  // Theme: toggling the `dark` class on <html> switches every `dark:` variant.
  // 'system' follows the device and changes with it, even while the app is open.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme !== 'light' && query.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f7f7f8')
    }
    apply()
    if (theme !== 'system') return undefined
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [theme])

  // Language: Arabic flips the whole layout to right-to-left.
  useLayoutEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
  }, [lang, rtl])

  // Screens and sheets
  const [tab, setTab] = useState('Home')
  const [mealOpen, setMealOpen] = useState(false)
  const [mealEditing, setMealEditing] = useState(null)         // null | logged meal being edited
  const [customEditing, setCustomEditing] = useState(null)     // null | 'new' | food being edited
  const [templateEditing, setTemplateEditing] = useState(null) // null | template being edited
  const [planOpen, setPlanOpen] = useState(false)
  const [dividerOpen, setDividerOpen] = useState(false)

  // ---- Tab pager ----------------------------------------------------------
  // All tabs sit side by side on one track; `x` (a framer-motion value)
  // is the track's position. What happens on a swipe:
  //   finger down/move  use-gesture -> x.set(): pure transform, NO React render
  //   release           a spring takes over from x at the finger's speed
  //   spring finished   only now does React state (`tab`) change
  // The tab-bar highlight is its own tiny component fed by `navIndex`, so it
  // can switch instantly without re-rendering any page. Nothing is mounted,
  // unmounted, repainted or re-rendered while the track is moving; that work
  // landing mid-swipe is what caused the stall-then-jump in your recording.
  const reduce = useReducedMotion()
  const viewportRef = useRef(null)
  const paneRefs = useRef([])
  const width = useRef(390)
  const x = useMotionValue(0)            // logical position: 0, -w, -2w ... in both directions
  // In right-to-left the tabs are laid out from the right, so the track moves
  // the other way. trackX mirrors x and is what is actually drawn.
  const trackX = useMotionValue(0)
  const rtlRef = useRef(rtl)
  useMotionValueEvent(x, 'change', (v) => trackX.set(rtlRef.current ? -v : v))
  useLayoutEffect(() => {
    rtlRef.current = rtl
    trackX.set(rtl ? -x.get() : x.get())
  }, [rtl, x, trackX])
  const fade = useMotionValue(1)         // only for far jumps (Home -> Profile)
  const navIndex = useMotionValue(0)     // drives the tab bar highlight
  const index = useRef(0)                // settled tab as a number
  const anim = useRef(null)
  const g = useRef({ lock: null, active: false, start: 0, from: 0, shift: 0, pane: null, scroll0: 0 }) // gesture in progress
  const LAST = TAB_ORDER.length - 1

  // Only pane i takes input; the others are inert so taps and focus can't land
  // on an off-screen page. Set on the DOM the moment a target is picked: tying
  // it to `tab` left the incoming page inert (unscrollable) until the spring
  // had fully settled and React had committed, which on quick navigation is
  // exactly when you try to scroll it.
  const activate = (i) => paneRefs.current.forEach((el, j) => { if (el) el.inert = j !== i })

  useLayoutEffect(() => {
    const el = viewportRef.current
    const fit = () => {
      width.current = el.clientWidth
      // A stopped animation never resolves, so commit here or the
      // spring's pending commit would be lost.
      anim.current?.stop()
      x.set(-index.current * width.current)
      startTransition(() => setTab(TAB_ORDER[index.current]))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [x])

  // Spring the track to tab i, then commit React state once it has stopped.
  const settleTo = (i, velocity = 0) => {
    index.current = i
    navIndex.set(i)
    activate(i)
    anim.current?.stop()
    const target = -i * width.current
    // Skipped if a new swipe grabbed the track before the spring finished.
    const commit = () => { if (index.current === i && !g.current.active) startTransition(() => setTab(TAB_ORDER[i])) }
    if (reduce) { x.set(target); return commit() }
    anim.current = animate(x, target, { ...SPRING, velocity })
    anim.current.then(commit)
  }

  const goTo = (name) => {
    const i = TAB_ORDER.indexOf(name)
    if (i === index.current) return paneRefs.current[i]?.scrollTo({ top: 0, behavior: 'smooth' }) // tap active tab = scroll to top
    if (Math.abs(i - index.current) === 1 || reduce) return settleTo(i)
    // Far jump: switch instantly with a short fade instead of racing past tabs.
    index.current = i
    navIndex.set(i)
    activate(i)
    anim.current?.stop()
    x.set(-i * width.current)
    animate(fade, [0.4, 1], { duration: 0.22, ease: 'easeOut' })
    startTransition(() => setTab(name))
  }

  // iOS-style rubber band past the first / last tab.
  const rubber = (d) => (1 - 1 / ((d * 0.55) / width.current + 1)) * width.current

  // While a horizontal swipe is locked, stop the page from also scrolling
  // vertically under the finger (needs a non-passive listener to be allowed
  // to call preventDefault; React's touch listeners are passive).
  useEffect(() => {
    const el = viewportRef.current
    const block = (e) => { if (g.current.lock === true && e.cancelable) e.preventDefault() }
    const reset = () => { g.current.lock = null } // every touch starts undecided
    el.addEventListener('touchstart', reset, { passive: true })
    el.addEventListener('touchmove', block, { passive: false })
    return () => {
      el.removeEventListener('touchstart', reset)
      el.removeEventListener('touchmove', block)
    }
  }, [])

  const bind = useDrag(
    ({ first, last, movement: [rawMx, my], velocity: [vx], direction: [rawDx], event, cancel }) => {
      // Work in logical direction: in right-to-left, dragging right moves forward.
      const mx = rtl ? -rawMx : rawMx
      const dx = rtl ? -rawDx : rawDx
      const s = g.current
      if (first) {
        s.lock = null
        if (event.target.closest?.('input, textarea, select, [data-no-swipe]')) { s.lock = false; return cancel() }
        s.pane = paneRefs.current[index.current]
        s.scroll0 = s.pane?.scrollTop ?? 0
      }
      if (s.lock === false) return

      // ---- Direction lock: a vertical scroll must NEVER turn into a tab swipe.
      if (s.lock === null) {
        // 1. Never decide on the release event. If iOS was busy scrolling and
        //    held back the move events, the first thing we'd see is the lift
        //    with a big total movement: that is a scroll, not a swipe.
        if (last) return
        // 2. If the page has scrolled at all since the finger went down, the
        //    browser has already claimed this touch as a scroll.
        const scrolled = Math.abs((s.pane?.scrollTop ?? 0) - s.scroll0) > 1
        const ax = Math.abs(mx)
        const ay = Math.abs(my)
        if (!scrolled && ax < 10 && ay < 10) return
        // 3. Horizontal only if clearly sideways: within ~27 degrees of flat
        //    (|dx| > 2 x |dy|). A thumb scrolling up the screen moves in an
        //    arc, which a looser 1.2 x ratio was mistaking for a swipe.
        if (scrolled || ax <= ay * 2) { s.lock = false; return cancel() }
        s.lock = true
        s.active = true
        s.shift = mx                     // measure from here: no 10 px jump
        anim.current?.stop()             // grab the track mid-spring if it is still moving
        s.from = index.current
        s.start = x.get()
      }

      const w = width.current
      let pos = s.start + (mx - s.shift)
      const min = -LAST * w
      if (pos > 0) pos = rubber(pos)
      else if (pos < min) pos = min - rubber(min - pos)

      if (!last) {
        x.set(pos)
        // Highlight follows the page that is more than half in view (cheap: tab bar only).
        navIndex.set(clamp(Math.round(-pos / w), 0, LAST))
        return
      }

      // Release. use-gesture gives speed in px/ms (+ sign in `direction`);
      // springs want px/s. Capped so a twitchy last sample can't fling it.
      s.active = false
      s.lock = null
      const v = clamp(dx * vx * 1000, -4000, 4000)
      const moved = pos + s.from * w     // < 0 = dragged left
      const step = moved < -w * 0.25 || v < -450 ? 1 : moved > w * 0.25 || v > 450 ? -1 : 0
      settleTo(clamp(s.from + step, 0, LAST), v)
    },
    { filterTaps: true, pointer: { touch: true } },
  )

  const byName = (a, b) => a.name.localeCompare(b.name)
  const foods = [...SEED_FOODS].sort(byName)    // built-in database
  const myFoods = [...customFoods].sort(byName) // user's own items

  // Page content, memoised: opening a sheet or switching tabs re-renders App,
  // but the pages only re-render when their own data changes.
  const pages = useMemo(() => ({
    Home: (
      <Home
        profile={profile} avatar={avatar} meals={meals} activeDay={activeDay}
        viewDay={shownDay} onViewDay={(key) => setViewDay(key === activeDay.date ? null : key)} cheatDays={cheatDays}
        onAddMeal={() => setMealOpen(true)}
        onEditMeal={(meal) => setMealEditing(meal)}
        onStartNewDay={startNewDay}
        onOpenProfile={() => goTo('Profile')}
        onSaveTemplate={(template) => setTemplates((list) => [template, ...list])}
        onDeleteMeal={(id) => setMeals((list) => list.filter((m) => m.id !== id))}
        analytics={
          <Analytics profile={planProfile} meals={meals} activeDay={activeDay} onDeleteDay={deleteDay}
            cheatDays={cheatDays} onToggleCheatDay={toggleCheatDay} />
        }
      />
    ),
    // Logs to the same day Home is showing, so a forgotten workout can be
    // added by picking its date on Home first.
    Workout: (
      <Workout
        day={shownDay} activeDate={activeDay.date}
        workouts={dailyWorkouts} history={workoutHistory} onUpdate={updateWorkout}
        onFinish={finishWorkout}
        onDeleteWorkout={(id) => setWorkoutHistory((list) => list.filter((x) => x.id !== id))}
        routines={workoutTemplates}
        // A saved routine replaces the one with its id (editing); a new one goes first.
        onSaveRoutine={(routine) => setWorkoutTemplates((list) => (
          list.some((x) => x.id === routine.id) ? list.map((x) => (x.id === routine.id ? routine : x)) : [routine, ...list]
        ))}
        onDeleteRoutine={(id) => setWorkoutTemplates((list) => list.filter((x) => x.id !== id))}
        onBackToToday={() => setViewDay(null)}
      />
    ),
    Weight: (
      <Weight
        entries={weights}
        onAdd={(entry) => setWeights((list) => [...list, entry].sort((a, b) => a.date.localeCompare(b.date)))}
        onDelete={(id) => setWeights((list) => list.filter((e) => e.id !== id))}
      />
    ),
    Profile: (
      <Profile
        profile={profile} onChange={updateProfile}
        avatar={avatar} onAvatar={setAvatar}
        theme={theme} onTheme={setTheme}
        lang={lang} onLang={setLang}
        onOpenPlan={() => setPlanOpen(true)}
      />
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [profile, planProfile, avatar, meals, activeDay, shownDay, weights, cheatDays, dailyWorkouts, workoutHistory, workoutTemplates, theme, lang])

  return (
    // fixed + inset-0 pins the app to the real screen edges. A height of 100%
    // can come out shorter than the screen in an installed iOS web app, which
    // leaves a strip under the tab bar. Pure OLED black in dark mode.
    <div className="fixed inset-0 mx-auto flex max-w-md flex-col overflow-hidden bg-canvas text-zinc-900 antialiased transition-colors duration-300 dark:bg-black dark:text-white">
      <div aria-hidden="true" className="app-glow pointer-events-none absolute inset-0" />
      {/* Pager viewport: clips the track and receives the drag. */}
      <div ref={viewportRef} {...bind()} className="relative min-h-0 flex-1 overflow-hidden" style={{ touchAction: 'pan-y' }}>
        <motion.div className="flex h-full" style={{ x: trackX, opacity: fade, willChange: 'transform' }}>
          {TAB_ORDER.map((name, i) => (
            // Each tab scrolls on its own and stays mounted (mounting mid-swipe
            // caused hitches). touch-action MUST be on the scroll container
            // itself: the browser only reads it from the touched element up to
            // the nearest scroller, so on the viewport above it was ignored and
            // iOS kept claiming horizontal moves for itself.
            // The tab bar floats over the pages, so the bottom padding clears
            // it (62 px bar + its offset) and content scrolls behind the glass.
            <section
              key={name}
              // inert is managed by activate(), not by React (see above).
              ref={(el) => { paneRefs.current[i] = el; if (el) el.inert = i !== index.current }}
              className="h-full w-full flex-none space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain px-4"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
                paddingBottom: 'calc(max(env(safe-area-inset-bottom) - 10px, 14px) + 62px + 28px)',
                touchAction: 'pan-y',
              }}
            >
              {pages[name]}
            </section>
          ))}
        </motion.div>
      </div>

      {/* Scroll edge: content fades out where it meets the floating tab bar, so
          a coloured card never shows as a smear between the glass shapes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[calc(env(safe-area-inset-bottom)+112px)] bg-linear-to-t from-canvas/85 via-canvas/45 to-transparent dark:from-black/85 dark:via-black/45"
      />

      <TabBar navIndex={navIndex} onTab={goTo} onAdd={() => setMealOpen(true)} lang={lang} />

      {/* ---- Sheets (later ones stack on top). AnimatePresence keeps a sheet
          mounted until its slide-out spring has finished. ---- */}
      <AnimatePresence>
        {mealOpen && (
          <AddMealSheet
            key="meal"
            foods={foods} customFoods={myFoods} templates={templates}
            // Tag the meal with the day Home is showing (the active day unless
            // you picked another), whatever the clock says. On a past day the
            // time of day is kept but the date moves there, so the list shows
            // a sensible date if the meal is ever read by its timestamp.
            onSave={(meal) => setMeals((list) => {
              const at = parseDay(shownDay)
              const now = new Date(meal.date)
              at.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
              return [{ ...meal, day: shownDay, date: shownDay === dayKey(now) ? meal.date : at.toISOString() }, ...list]
            })}
            onClose={() => setMealOpen(false)}
            onCreateCustom={() => setCustomEditing('new')}
            onEditCustom={(food) => setCustomEditing(food)}
            onEditTemplate={(template) => setTemplateEditing(template)}
            onOpenDivider={() => setDividerOpen(true)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mealEditing && (
          // Same sheet as Log Meal, in edit mode. Saving replaces the meal in
          // place (same id / date / tracking day), so the Home ring, macros
          // and Analytics recompute from `meals` immediately.
          <AddMealSheet
            key="edit"
            meal={mealEditing}
            foods={foods} customFoods={myFoods} templates={templates}
            onSave={(updated) => setMeals((list) => list.map((m) => (m.id === updated.id ? updated : m)))}
            onClose={() => setMealEditing(null)}
            onCreateCustom={() => setCustomEditing('new')}
            onEditCustom={(food) => setCustomEditing(food)}
            onEditTemplate={(template) => setTemplateEditing(template)}
            onOpenDivider={() => setDividerOpen(true)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {customEditing && (
          <CustomFoodSheet
            key="custom"
            food={customEditing === 'new' ? null : customEditing}
            onSave={(food) => setCustomFoods((list) => upsert(list, food))}
            onDelete={(id) => setCustomFoods((list) => list.filter((f) => f.id !== id))}
            onClose={() => setCustomEditing(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {templateEditing && (
          <TemplateEditSheet
            key="template"
            foods={foods} customFoods={myFoods} templates={templates}
            template={templateEditing}
            onSave={(template) => setTemplates((list) => upsert(list, template))}
            onDelete={(id) => setTemplates((list) => list.filter((t) => t.id !== id))}
            onClose={() => setTemplateEditing(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {dividerOpen && (
          <MealDividerSheet
            key="divider"
            foods={foods} customFoods={myFoods} templates={templates}
            onSave={(food) => setCustomFoods((list) => [...list, food])}
            onClose={() => setDividerOpen(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {planOpen && (
          <PlanSheet key="plan" profile={planProfile} weighIn={weighIn} onChange={updateProfile} onClose={() => setPlanOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
