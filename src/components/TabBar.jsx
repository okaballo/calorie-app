// The floating tab bar: its glass lens, the swipe along it, and the "+" that logs a meal.
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, useVelocity,
} from 'framer-motion'
import { glassRim, GlassBackdrop } from './ui.jsx'
import { clamp } from '../lib/calc.js'
import { isRTL, t } from '../lib/i18n.js'

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
export const TAB_ORDER = ['Home', 'Workout', 'Weight', 'Profile']
const TABS = TAB_ORDER.length

// Tab bar springs. The lens is slightly under-damped so it lands with a
// small jelly settle, like iOS 26; FOLLOW keeps it glued to a dragging finger.
const LENS_SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 2 }
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
export default memo(function TabBar({ navIndex, onTab, onAdd, lang }) {
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
  const relax = () => (reduce ? edge.set(0) : animate(edge, 0, { type: 'spring', stiffness: 820, damping: 18 }))
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
        className="glass-surface pointer-events-auto relative isolate h-[62px] min-w-0 flex-1 touch-none select-none rounded-full bg-white/20 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] dark:bg-white/[0.06] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.9)] neu:border neu:border-(--neu-edge) neu:bg-canvas neu:shadow-(--neu-raised)"
      >
        <GlassBackdrop />
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 rounded-full neu:hidden ${glassRim}`} />

        <div ref={rowRef} className="absolute inset-1">
          {/* Resting pill, behind the icons. */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-black/6 dark:bg-black/45 neu:bg-canvas neu:shadow-(--neu-inset)"
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
            <div className={`absolute inset-0 rounded-full bg-white/5 neu:bg-transparent neu:shadow-(--neu-inset) ${glassRim}`} />
            <div className="absolute inset-0 rounded-full shadow-[inset_2px_0_3px_-1px_rgba(120,170,255,0.55),inset_-2px_0_3px_-1px_rgba(237,133,217,0.5)] neu:hidden" />
          </motion.div>
        </div>
      </motion.div>

      {/* ---- Log a meal: liquid glass ---- */}
      <button
        type="button"
        onClick={onAdd}
        aria-label={t('Log a meal')}
        className="glass-surface pointer-events-auto relative isolate inline-flex size-[62px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/55 text-royal shadow-[0_0_22px_-2px_rgba(120,81,169,0.5),0_8px_24px_-10px_rgba(120,81,169,0.55)] outline-none backdrop-blur-2xl backdrop-saturate-180 transition duration-300 hover:scale-105 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-90 dark:bg-transparent dark:bg-linear-to-b dark:from-lilac/30 dark:to-royal/30 dark:text-white neu:border neu:border-(--neu-edge) neu:bg-canvas neu:bg-none neu:shadow-(--neu-raised) neu:backdrop-blur-none neu:active:shadow-(--neu-inset)"
      >
        {/* No warp on this one: at 56 px it only roughens the circle. The glass
            look comes from the blur, the rim and a fuller tint; the warp stays on the bar. */}
        <div className="absolute top-0 left-0 z-0 h-full w-full rounded-full shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)] transition-shadow dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)] neu:hidden" />
        <svg viewBox="0 0 24 24" className="pointer-events-none size-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </nav>
  )
})
