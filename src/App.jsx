// Root component: owns all saved data, the theme, and the tab layout.
//
// Saved in localStorage (see useLocalStorage):
//   mt.profile      name, body stats and daily goals
//   mt.avatar       profile picture as a base64 JPEG data URL (or null)
//   mt.theme        'system' | 'dark' | 'light' | 'neumorphism' | 'neumorphism-dark' (the last two English only for now)
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
//   mt.customExercises   the user's own exercises (lib/exercisesDB.ts)
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion,
} from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import { SPRING } from './components/ui.jsx'
import TabBar, { TAB_ORDER } from './components/TabBar.jsx'
import { useLocalStorage } from './lib/useLocalStorage.js'
import { clamp, dayKey, nextTrackingDay, mealDay, parseDay, previousDay, num, tdee } from './lib/calc.js'
import { setLanguage, t } from './lib/i18n.js'
import { EMPTY_WORKOUT, isEmptyWorkout, isLive } from './lib/workouts.js'
import { setCustomExercises } from './lib/exercisesDB.ts'
import { applyTheme } from './lib/theme.js'
import { calorieStreak, workoutStreak, goalTypeFor, milestoneFor, DAY_MILESTONES, WEEK_MILESTONES } from './lib/streaks.js'
import { StreakToast } from './components/Streaks.jsx'
import { CustomExercisesContext } from './lib/customExercisesContext.js'
import Home from './tabs/Home.jsx'
import Analytics from './components/Analytics.jsx'
import Workout from './tabs/Workout.jsx'
import Weight from './tabs/Weight.jsx'
import Profile from './tabs/Profile.jsx'
import AddMealSheet from './components/AddMealSheet.jsx'
import CustomFoodSheet from './components/CustomFoodSheet.jsx'
import TemplateEditSheet from './components/TemplateEditSheet.jsx'
import PlanSheet from './components/PlanSheet.jsx'

// Testing placeholders: 2,100 kcal = 140 g protein + 250 g carbs + 60 g fat.
const DEFAULT_PROFILE = {
  name: '', sex: 'Male', age: 25, heightCm: 175, weightKg: 70,
  activity: 'Lightly active', goal: 'Maintain',
  calorieGoal: 2100, proteinGoal: 140, carbsGoal: 250, fatGoal: 60,
  weeklyWorkoutGoal: 3,  // workout days per week, for the workout streak
}

/** Inserts a new item or replaces the one with the same id. */
const upsert = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

/** Same, but a new item goes first. */
const upsertFirst = (list, item) =>
  list.some((x) => x.id === item.id) ? upsert(list, item) : [item, ...list]

export default function App() {
  // The built-in food database (about a thousand foods) is its own chunk,
  // loaded right after the first screen so it does not slow the first paint.
  // Until it arrives (a moment) the Database list is empty.
  const [seedFoods, setSeedFoods] = useState([])
  useEffect(() => {
    let live = true
    import('./lib/foods.js').then((m) => { if (live) setSeedFoods(m.SEED_FOODS) })
    return () => { live = false }
  }, [])

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
  // The exercise database reads the user's own exercises from here, so register them before any screen renders.
  const [customExercises, setCustomList] = useLocalStorage('mt.customExercises', [])
  setCustomExercises(customExercises)

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

  // Streaks (lib/streaks.js) are worked out from the meals and finished workouts, never stored.
  // The calorie range depends on whether the goal is a cut, maintenance or bulk. With real body stats that is
  // read from the goal itself (against maintenance), so a goal typed by hand works as well as a calculated one.
  // Stats count as entered when any differs from the defaults, or there is a weigh-in; until then the
  // Cut / Maintain / Bulk selector is used, rather than guessing from made-up numbers.
  const statsEntered = weights.length > 0 || ['sex', 'age', 'heightCm', 'weightKg', 'activity'].some((k) => profile[k] !== DEFAULT_PROFILE[k])
  const maintenance = tdee(planProfile).maintenance
  const calGoal = num(profile.calorieGoal)
  const calGoalType = statsEntered ? goalTypeFor(calGoal, maintenance) : profile.goal
  const calStreak = useMemo(
    () => calorieStreak(meals, activeDay.date, cheatDays, calGoal, calGoalType),
    [meals, activeDay.date, cheatDays, calGoal, calGoalType],
  )
  const wkStreak = useMemo(
    () => workoutStreak(workoutHistory, activeDay.date, profile.weeklyWorkoutGoal),
    [workoutHistory, activeDay.date, profile.weeklyWorkoutGoal],
  )

  // A toast the first time a streak reaches a milestone. The last milestone shown is kept per streak
  // (this device only); the first run just records it, so an existing streak does not celebrate on update.
  // A broken streak lowers the record, so reaching the milestone again celebrates again.
  // Calories count closed days; a workout week counts the moment its target is reached.
  const [streakToast, setStreakToast] = useState(null)
  const hideStreakToast = useCallback(() => setStreakToast(null), [])
  const calMilestone = milestoneFor(calStreak.confirmed, DAY_MILESTONES)
  const wkMilestone = milestoneFor(wkStreak.current, WEEK_MILESTONES)
  useEffect(() => {
    let seen = {}
    try { seen = JSON.parse(localStorage.getItem('kibase.streakSeen')) || {} } catch { /* unreadable: start over */ }
    const fresh = []
    if (seen.cal !== undefined && calMilestone > seen.cal) fresh.push(t('{n}-day calorie streak!', { n: calMilestone }))
    if (seen.wk !== undefined && wkMilestone > seen.wk) fresh.push(t('{n}-week workout streak!', { n: wkMilestone }))
    if (seen.cal !== calMilestone || seen.wk !== wkMilestone) {
      try { localStorage.setItem('kibase.streakSeen', JSON.stringify({ cal: calMilestone, wk: wkMilestone })) } catch { /* storage blocked */ }
    }
    if (fresh.length) setStreakToast({ id: Date.now(), text: fresh[0] })
  }, [calMilestone, wkMilestone])

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

  // Theme (lib/theme.js). 'system' follows the device and changes with it, even
  // while the app is open. A layout effect, so a theme picked in Profile is on
  // the page by the time revealTheme's flushSync returns.
  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyTheme(theme, rtl)
    apply()
    if (theme !== 'system') return undefined
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [theme, rtl])

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
  const [templateEditing, setTemplateEditing] = useState(null) // null | 'new' | saved meal being edited
  const [planOpen, setPlanOpen] = useState(false)

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

  // "Add to My Items" (press and hold a Database food): a copy of the food,
  // kept with the ones you made. `from` is the Database id, so a food is never
  // added twice and the picker can tell it is already there.
  const addToMyItems = (food) => setCustomFoods((list) => (
    list.some((c) => c.from === food.id) ? list : [...list, {
      id: crypto.randomUUID(), from: food.id, name: food.name, custom: true,
      calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat,
      ...(food.servingGrams > 0 && { servingGrams: food.servingGrams }),
    }]
  ))

  const byName = (a, b) => a.name.localeCompare(b.name)
  const foods = seedFoods                       // built-in database (the picker sorts it)
  const myFoods = [...customFoods].sort(byName) // user's own items
  const mealSheetProps = {
    foods, customFoods: myFoods, templates, onAddToMyItems: addToMyItems,
    onCreateCustom: () => setCustomEditing('new'),
    onEditCustom: (food) => setCustomEditing(food),
    onCreateMeal: () => setTemplateEditing('new'),
    onEditTemplate: (template) => setTemplateEditing(template),
  }

  // Page content, memoised one page at a time: opening a sheet or switching tabs re-renders App,
  // but a page re-renders only when its OWN data changes. (One memo for all four used to rebuild
  // every page whenever any of them changed: ticking a set re-rendered Home, Weight and Profile too.)
  // Every page lists `lang`, as language changes re-translate all of them.
  const homePage = useMemo(() => (
      <Home
        profile={profile} avatar={avatar} meals={meals} activeDay={activeDay}
        viewDay={shownDay} onViewDay={(key) => setViewDay(key === activeDay.date ? null : key)} cheatDays={cheatDays}
        streak={calStreak} statsEntered={statsEntered} onOpenPlan={() => setPlanOpen(true)}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [profile, avatar, meals, activeDay, shownDay, cheatDays, planProfile, calStreak, statsEntered, lang])

  // Logs to the same day Home is showing, so a forgotten workout can be
  // added by picking its date on Home first.
  const workoutPage = useMemo(() => (
      <CustomExercisesContext.Provider value={{ list: customExercises, setList: setCustomList }}>
      <Workout
        day={shownDay} activeDate={activeDay.date}
        workouts={dailyWorkouts} history={workoutHistory} onUpdate={updateWorkout}
        onFinish={finishWorkout}
        onDeleteWorkout={(id) => setWorkoutHistory((list) => list.filter((x) => x.id !== id))}
        routines={workoutTemplates} bodyWeight={planProfile.weightKg}
        // A saved routine replaces the one with its id (editing); a new one goes first.
        onSaveRoutine={(routine) => setWorkoutTemplates((list) => upsertFirst(list, routine))}
        onDeleteRoutine={(id) => setWorkoutTemplates((list) => list.filter((x) => x.id !== id))}
        onBackToToday={() => setViewDay(null)}
        streak={wkStreak} onStreakTarget={(n) => updateProfile({ weeklyWorkoutGoal: n })}
      />
      </CustomExercisesContext.Provider>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [shownDay, activeDay, dailyWorkouts, workoutHistory, workoutTemplates, customExercises, planProfile.weightKg, wkStreak, lang])

  const weightPage = useMemo(() => (
      <Weight
        entries={weights}
        onAdd={(entry) => setWeights((list) => [...list, entry].sort((a, b) => a.date.localeCompare(b.date)))}
        onDelete={(id) => setWeights((list) => list.filter((e) => e.id !== id))}
      />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [weights, lang])

  const profilePage = useMemo(() => (
      <Profile
        profile={profile} onChange={updateProfile}
        avatar={avatar} onAvatar={setAvatar}
        theme={theme} onTheme={setTheme}
        lang={lang} onLang={setLang}
        onOpenPlan={() => setPlanOpen(true)}
      />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [profile, avatar, theme, lang])

  const pages = { Home: homePage, Workout: workoutPage, Weight: weightPage, Profile: profilePage }

  return (
    // fixed + inset-0 pins the app to the real screen edges. A height of 100%
    // can come out shorter than the screen in an installed iOS web app, which
    // leaves a strip under the tab bar. Pure OLED black in dark mode.
    <div className="fixed inset-0 mx-auto flex max-w-md flex-col overflow-hidden bg-canvas text-zinc-900 antialiased transition-colors duration-300 dark:bg-black dark:text-white neu:bg-canvas">
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
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[calc(env(safe-area-inset-bottom)+112px)] bg-linear-to-t from-canvas/85 via-canvas/45 to-transparent dark:from-black/85 dark:via-black/45 neu:from-canvas/85 neu:via-canvas/45"
      />

      <StreakToast toast={streakToast} onDone={hideStreakToast} />

      <TabBar navIndex={navIndex} onTab={goTo} onAdd={() => setMealOpen(true)} lang={lang} />

      {/* ---- Sheets (later ones stack on top). AnimatePresence keeps a sheet
          mounted until its slide-out spring has finished. ---- */}
      <AnimatePresence>
        {mealOpen && (
          <AddMealSheet
            key="meal"
            {...mealSheetProps}
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
            {...mealSheetProps}
            onSave={(updated) => setMeals((list) => list.map((m) => (m.id === updated.id ? updated : m)))}
            onClose={() => setMealEditing(null)}
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
            template={templateEditing === 'new' ? null : templateEditing}
            onAddToMyItems={addToMyItems}
            // A new meal goes to the top of My Items > Saved Meals, like one saved from Home.
            onSave={(template) => setTemplates((list) => upsertFirst(list, template))}
            onDelete={(id) => setTemplates((list) => list.filter((t) => t.id !== id))}
            onClose={() => setTemplateEditing(null)}
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
