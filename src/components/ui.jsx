// Shared building blocks. Every colour is given for light mode first and for
// dark mode with a `dark:` variant, so the whole app follows the theme toggle.
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform, useVelocity,
} from 'framer-motion'
import { fmt0, fmt1 } from '../lib/calc.js'
import { t, isRTL } from '../lib/i18n.js'

// ---- Theme-aware class sets (used across screens) -------------------------

// Contrast on white / on the field fill: muted 7.7 / 7.0, faint 5.3 / 4.8
// (light); on the dark card / field: muted 7.3 / 6.3, faint 5.3 / 4.8.
export const muted = 'text-zinc-600 dark:text-white/60'
export const faint = 'text-subtle dark:text-white/50'
export const accentText = 'text-royal dark:text-lilac'
export const carbsText = 'text-carbs-deep dark:text-carbs'
export const fatText = 'text-fat-deep dark:text-fat'
export const fieldBg = 'bg-zinc-100 dark:bg-field'
export const divider = 'divide-black/5 dark:divide-white/10'
export const placeholder = 'placeholder:text-subtle dark:placeholder:text-white/50'

/** Keyboard focus ring for buttons and fields (outline-none alone hides focus). */
export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-royal/60 dark:focus-visible:ring-lilac/70'

/** Grows a small control's tap area to 44 px without changing how it looks.
 *  Needs no extra markup; the element must not clip its own overflow. */
export const hitSlop = "relative before:absolute before:-inset-1.5 before:content-['']"

/** Same, but only taller: for icon buttons in a row, where growing sideways
 *  would run the tap areas of neighbours into each other. */
export const hitSlopY = "relative before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-['']"

/** Focus ring for a field row, drawn on the row while its input has focus. */
export const focusWithin = 'focus-within:ring-2 focus-within:ring-royal/60 dark:focus-within:ring-lilac/70'

/** Liquid Glass edge: the rim highlights of LiquidButton
 *  (components/ui/liquid-glass-button.tsx), for any glass surface. Put it on
 *  an absolute inset layer so the surface keeps its own drop shadow. */
export const glassRim =
  'shadow-[inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)] ' +
  'dark:shadow-[inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]'

/**
 * Backdrop for a Liquid Glass surface: a plain blur layer (works everywhere)
 * and, above it, a layer that warps what is behind it with an SVG
 * displacement map (Chromium only; Safari and Firefox ignore it and keep the
 * blur). They are SIBLINGS on purpose: an element with backdrop-filter becomes
 * a backdrop root, so a filter nested inside another one would see nothing.
 * The parent must not have a backdrop-filter of its own.
 */
export const GlassBackdrop = ({ id, scale = 46, freq = '0.012 0.035', className = 'rounded-full' }) => {
  // One filter id per instance, so two backdrops never share (and clobber) one.
  const own = 'glass-' + useId().replace(/:/g, '')
  const filterId = id ?? own
  // `glass-fx` layers are hidden when the person asks for more contrast (index.css).
  return (
    <>
      <div aria-hidden="true" className={`glass-fx pointer-events-none absolute inset-0 -z-20 backdrop-blur-md backdrop-saturate-150 ${className}`} />
      <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden="true">
        <filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="2" seed="3" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale={scale} xChannelSelector="R" yChannelSelector="B" result="warped" />
          <feGaussianBlur in="warped" stdDeviation="1.2" />
        </filter>
      </svg>
      <div
        aria-hidden="true"
        className={`glass-fx pointer-events-none absolute inset-0 -z-10 ${className}`}
        style={{ backdropFilter: `url(#${filterId})` }}
      />
    </>
  )
}

// ---- Layout ----------------------------------------------------------------

/** Rounded card: a hairline border defines the edge instead of a lighter
 *  fill. Dark mode is a deep graphite gradient sitting on OLED black. */
export const Card = ({ children, className = '' }) => (
  <section
    className={`rounded-[28px] border-[0.5px] border-black/7 bg-white p-[18px] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_32px_-16px_rgba(0,0,0,0.12)] transition-colors duration-300 dark:border-white/9 dark:bg-card dark:from-[#141418] dark:to-card dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
  >
    {children}
  </section>
)

export const SectionTitle = ({ children }) => <h2 className="text-[17px] font-semibold">{children}</h2>

export const PageTitle = ({ children, action }) => (
  <header className="flex items-center justify-between pt-2">
    <h1 className="text-3xl font-bold tracking-tight">{children}</h1>
    {action}
  </header>
)

/** Empty list or chart: a soft icon tile, a line of text and, optionally, the
 *  one action that fills it. `icon` is the inside of a 24 x 24 stroke icon. */
export const EmptyState = ({ icon, children, action }) => (
  <div className="flex flex-col items-center gap-3 px-2 py-5 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-royal/10 dark:bg-royal/20">
      <svg viewBox="0 0 24 24" className={`h-6 w-6 ${accentText}`} fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon}
      </svg>
    </span>
    <p className={`max-w-[18rem] text-sm text-balance ${muted}`}>{children}</p>
    {action && <div className="w-full pt-1">{action}</div>}
  </div>
)

// ---- Inputs ----------------------------------------------------------------

export const PrimaryButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`w-full rounded-2xl bg-linear-to-b from-[#8a63bd] to-royal py-3.5 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_-10px_rgba(120,81,169,0.7)] transition active:scale-[0.98] active:opacity-90 disabled:opacity-35 disabled:shadow-none ${focusRing} ${className}`}
  >
    {children}
  </button>
)

export const TextInput = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full rounded-xl px-3.5 py-2.5 transition-colors ${focusRing} ${fieldBg} ${placeholder} ${className}`}
  />
)

/** Labelled input row: "Protein ........ [ 0 ] g". The row shows the focus ring. */
export const FieldRow = ({ label, unit, ...input }) => (
  <label className={`flex items-center rounded-xl px-3.5 py-2.5 transition-colors ${focusWithin} ${fieldBg}`}>
    <span className="flex-1">{label}</span>
    <input
      inputMode="decimal"
      autoComplete="off"
      {...input}
      className={`w-24 bg-transparent text-end tabular-nums outline-none ${placeholder}`}
    />
    <span className={`w-10 ps-2 ${muted}`}>{unit}</span>
  </label>
)

/** iOS-style segmented control. Options are English keys, shown translated. */
export const Segmented = ({ options, value, onChange }) => (
  <div role="group" className={`flex rounded-xl p-1 ${fieldBg}`}>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        aria-pressed={value === option}
        onClick={() => onChange(option)}
        className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${focusRing} ${
          value === option ? 'bg-royal text-white shadow-sm' : muted
        }`}
      >
        {t(option)}
      </button>
    ))}
  </div>
)

export const SunIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" fill="currentColor" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

export const MoonIcon = ({ className = 'h-6 w-6' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" />
  </svg>
)

// GlassSwitch geometry (px): track width / height, knob width / height, gap.
const SW = { T: 84, H: 28, KW: 36, KH: 34, P: 3 }
const SW_TRAVEL = SW.T - SW.KW - 2 * SW.P
const SW_SPRING = { type: 'spring', stiffness: 380, damping: 28, mass: 1 }

/**
 * Two-way switch with a Liquid Glass knob. The knob is slightly taller than
 * the track and shows the icon of the active side; the other side's icon
 * stays on the track, faint. Tap anywhere, or drag the knob.
 *   press     the knob swells and goes clearer
 *   move      it springs across, stretching with its speed; icons cross-fade (and turn) as it passes the middle
 *   release   it settles with a small bounce
 *
 * `left` / `right`: { icon }, `value`: 0 (knob left) or 1 (knob right),
 * `onChange(0 | 1)`. The switch is always left-to-right, even in Arabic, so
 * "Light | Dark" keeps its physical sides.
 */
export function GlassSwitch({ value, onChange, left, right, label }) {
  const reduce = useReducedMotion()
  const pos = useMotionValue(value)    // 0 knob left .. 1 knob right
  const press = useMotionValue(0)
  const drag = useRef(null)            // { x0, p0, moved } while a finger is down

  // Follow the value (also when the language / theme is changed elsewhere).
  useEffect(() => {
    if (drag.current) return
    if (reduce) pos.set(value)
    else animate(pos, value, SW_SPRING)
  }, [value, pos, reduce])

  const lift = (to) => (reduce ? press.set(to) : animate(press, to, { type: 'spring', stiffness: 500, damping: 30 }))

  const x = useTransform(pos, (p) => SW.P + p * SW_TRAVEL)
  const velocity = useVelocity(pos)
  const stretch = useTransform(velocity, (v) => Math.min(Math.abs(v) * SW_TRAVEL / 3000, 0.28))
  const scaleX = useTransform([press, stretch], ([p, s]) => 1 + 0.1 * p + s)
  const scaleY = useTransform([press, stretch], ([p, s]) => 1 + 0.08 * p - 0.35 * s)
  const knobTint = useTransform(press, [0, 1], [1, 0.55])   // knob fill gets clearer while held

  const fadeOut = useTransform(pos, [0, 0.5], [1, 0])        // things for the left state
  const fadeIn = useTransform(pos, [0.5, 1], [0, 1])         // things for the right state
  const dimIn = useTransform(fadeIn, (v) => v * 0.35)        // the idle side's icon stays faint
  const dimOut = useTransform(fadeOut, (v) => v * 0.35)
  const turnOut = useTransform(pos, [0, 1], [0, 90])
  const turnIn = useTransform(pos, [0, 1], [-90, 0])
  const growOut = useTransform(pos, [0, 0.5], [1, 0.4])
  const growIn = useTransform(pos, [0.5, 1], [0.4, 1])

  const onPointerDown = (e) => {
    if (e.button > 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x0: e.clientX, p0: pos.get(), moved: false }
    lift(1)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x0
    if (!d.moved && Math.abs(dx) < 5) return
    d.moved = true
    pos.set(Math.min(Math.max(d.p0 + dx / SW_TRAVEL, 0), 1))
  }
  const finish = (target) => {
    drag.current = null
    lift(0)
    if (target !== value) onChange(target)
    else if (reduce) pos.set(value)
    else animate(pos, value, SW_SPRING)
  }
  const onPointerUp = () => {
    const d = drag.current
    if (d) finish(d.moved ? (pos.get() > 0.5 ? 1 : 0) : 1 - value)
  }
  const onPointerCancel = () => { if (drag.current) finish(value) }

  const slot = 'pointer-events-none absolute top-0 flex h-full items-center justify-center text-[13px] font-bold text-zinc-900 dark:text-white'

  return (
    <button
      type="button"
      role="switch"
      dir="ltr"
      aria-checked={value === 1}
      aria-label={label}
      onClick={(e) => { if (e.detail === 0) onChange(1 - value) }}   // keyboard only; pointers are handled below
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`relative isolate my-1 shrink-0 touch-none select-none rounded-full before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] ${focusRing}`}
      style={{ width: SW.T, height: SW.H }}
      data-no-swipe
    >
      {/* Track: a recessed pill. */}
      <div className="absolute inset-0 rounded-full bg-black/6 shadow-[inset_0_2px_5px_rgba(0,0,0,0.12),inset_0_-1px_0_rgba(255,255,255,0.6)] dark:bg-black/55 dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.7),inset_0_-1px_0_rgba(255,255,255,0.06)]" />

      {/* The side the knob has left: its icon, faint. */}
      <motion.span className={slot} style={{ opacity: dimIn, left: SW.P, width: SW.KW }}>
        {left.icon}
      </motion.span>
      <motion.span className={slot} style={{ opacity: dimOut, left: SW.T - SW.P - SW.KW, width: SW.KW }}>
        {right.icon}
      </motion.span>

      {/* Glass knob. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 isolate rounded-[14px]"
        style={{ x, scaleX, scaleY, width: SW.KW, height: SW.KH, top: (SW.H - SW.KH) / 2 }}
      >
        <motion.div
          className="absolute inset-0 -z-20 rounded-[14px] bg-white/70 shadow-[0_4px_9px_-3px_rgba(0,0,0,0.3)] backdrop-blur-[3px] dark:bg-white/12 dark:shadow-[0_4px_9px_-2px_rgba(0,0,0,0.8)]"
          style={{ opacity: knobTint }}
        />
        <div className={`absolute inset-0 rounded-[14px] ${glassRim}`} />
        <div className="absolute inset-0 rounded-[14px] shadow-[inset_2px_0_3px_-1px_rgba(120,170,255,0.4),inset_-2px_0_3px_-1px_rgba(237,133,217,0.35)]" />
        <div className="absolute inset-0 flex items-center justify-center text-zinc-900 drop-shadow-[0_0_6px_rgba(255,255,255,0.7)] dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.65)]">
          <motion.span className="absolute flex items-center justify-center text-[13px] font-bold" style={{ opacity: fadeOut, rotate: turnOut, scale: growOut }}>
            {left.icon}
          </motion.span>
          <motion.span className="absolute flex items-center justify-center text-[13px] font-bold" style={{ opacity: fadeIn, rotate: turnIn, scale: growIn }}>
            {right.icon}
          </motion.span>
        </div>
      </motion.div>
    </button>
  )
}

/** Round "+" used to add an item to a meal. */
export const AddButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`${hitSlop} flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-royal text-lg leading-none text-white transition active:scale-90 ${focusRing}`}
  >
    +
  </button>
)

/** "−  value  +" counter that replaces the AddButton once an item is picked. */
export const Stepper = ({ value, onMinus, onPlus, label }) => (
  <div className="flex shrink-0 items-center rounded-full bg-royal/10 dark:bg-royal/25">
    <button
      type="button"
      onClick={onMinus}
      aria-label={t('Less {name}', { name: label })}
      className={`${hitSlop} flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none transition active:scale-90 ${focusRing} ${accentText}`}
    >
      −
    </button>
    <span className="min-w-12 text-center text-xs font-semibold tabular-nums">{value}</span>
    <button
      type="button"
      onClick={onPlus}
      aria-label={t('More {name}', { name: label })}
      className={`${hitSlop} flex h-8 w-8 items-center justify-center rounded-full bg-royal text-lg leading-none text-white transition active:scale-90 ${focusRing}`}
    >
      +
    </button>
  </div>
)

/** ">" arrow; points the other way in right-to-left. */
export const ChevronIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" className={`rtl:-scale-x-100 ${className}`} fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const PencilIcon = ({ className = 'h-[18px] w-[18px]' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
)

export const TrashIcon = ({ className = 'h-[18px] w-[18px]' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.2a1 1 0 0 0 1 .8h7.4a1 1 0 0 0 1-.8L17.5 7M10 11v5M14 11v5" />
  </svg>
)

// ---- Avatar ----------------------------------------------------------------

/** Circular profile picture; falls back to initials, then a person glyph. */
export function Avatar({ src, name = '', size = 40 }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : initials ? (
        <span className={`font-semibold ${accentText}`} style={{ fontSize: size * 0.38 }}>{initials}</span>
      ) : (
        <svg viewBox="0 0 24 24" className={accentText} style={{ width: size * 0.55 }} fill="currentColor" aria-hidden="true">
          <path d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4 21a8 8 0 0 1 16 0z" />
        </svg>
      )}
    </span>
  )
}

// ---- Rings & bars ----------------------------------------------------------

/** Soft neon halo: a blurred, part-transparent copy drawn behind the shape.
 *  userSpaceOnUse keeps the halo from being clipped at the ring's edge. */
const GlowFilter = ({ id, extent, blur = 5 }) => (
  <filter id={id} filterUnits="userSpaceOnUse" x={-20} y={-20} width={extent + 40} height={extent + 40}>
    <feGaussianBlur stdDeviation={blur} result="blur" />
    <feComponentTransfer in="blur" result="halo"><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
    <feMerge><feMergeNode in="halo" /><feMergeNode in="SourceGraphic" /></feMerge>
  </filter>
)

/** Main calorie ring. `progress` is 0..1. */
export function CalorieRing({ progress, remaining }) {
  const r = 82
  const c = 2 * Math.PI * r
  return (
    <div className="relative mx-auto h-[190px] w-[190px]">
      <svg viewBox="0 0 190 190" className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b58ff2" />
            <stop offset="1" stopColor="#7851a9" />
          </linearGradient>
          <GlowFilter id="ring-glow" extent={190} />
        </defs>
        <circle cx="95" cy="95" r={r} fill="none" stroke="#7851a9" strokeOpacity=".18" strokeWidth="16" />
        <circle
          className="ring-anim"
          filter="url(#ring-glow)"
          cx="95" cy="95" r={r} fill="none" stroke="url(#ring)" strokeWidth="16" strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight tabular-nums">{fmt0(Math.abs(remaining))}</span>
        <span className={`text-sm ${remaining >= 0 ? muted : fatText}`}>
          {t(remaining >= 0 ? 'kcal left' : 'kcal over')}
        </span>
      </div>
    </div>
  )
}

/** Small macro ring: grams eaten in the middle, goal underneath. */
export function MiniRing({ label, value, goal, color }) {
  const size = 84
  const r = 34
  const c = 2 * Math.PI * r
  const progress = goal > 0 ? Math.min(Math.max(value / goal, 0), 1) : 0
  const id = 'mini-glow-' + useId().replace(/:/g, '') // unique per ring; translated labels make poor ids
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 overflow-visible">
          <defs><GlowFilter id={id} extent={size} blur={3.5} /></defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity=".18" strokeWidth="8" />
          <circle
            className="ring-anim"
            filter={`url(#${id})`}
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
          <span className="text-base font-bold tabular-nums">{fmt0(value)}</span>
          <span className={`text-[11px] tabular-nums ${muted}`}>/ {fmt0(goal)}&nbsp;{t('g')}</span>
        </div>
      </div>
      <span className={`mt-2 text-xs font-medium ${muted}`}>{label}</span>
    </div>
  )
}

export const StatTile = ({ title, value, unit, sub }) => (
  <Card className="flex-1">
    <p className={`text-xs ${muted}`}>{title}</p>
    <p className="mt-1.5 text-2xl font-bold tabular-nums">
      {value} <span className={`text-xs font-normal ${muted}`}>{unit}</span>
    </p>
    {sub && <p className={`mt-0.5 text-sm tabular-nums ${faint}`}>{sub}</p>}
  </Card>
)

/** Compact "P 24  C 3  F 18" line. `glow` makes each value a neon chip. */
export const MacroSummary = ({ macros, glow = false }) => {
  const chip = glow ? 'glow-text font-medium' : ''
  return (
    <span className={`flex gap-2.5 text-xs tabular-nums ${glow ? '' : muted}`}>
      <span className={glow ? `${chip} ${accentText}` : ''}><b className={accentText}>{t('P')}</b> {fmt1(macros.protein)}</span>
      <span className={glow ? `${chip} ${carbsText}` : ''}><b className={carbsText}>{t('C')}</b> {fmt1(macros.carbs)}</span>
      <span className={glow ? `${chip} ${fatText}` : ''}><b className={fatText}>{t('F')}</b> {fmt1(macros.fat)}</span>
    </span>
  )
}

// ---- Sheets & dialogs ------------------------------------------------------

// One spring for every slide in the app: critically damped (no wobble) and
// fast to settle, close to iOS page and sheet motion. restDelta/restSpeed end
// it as soon as the remaining movement is invisible, instead of crawling.
export const SPRING = { type: 'spring', stiffness: 520, damping: 48, mass: 1, restDelta: 0.5, restSpeed: 10 }

/** Where a flick would come to rest: current + (v / 1000) * rate / (1 - rate),
 *  the same exponential-decay projection scroll views use. `v` is in px/s. */
export const project = (v, rate = 0.99) => ((v / 1000) * rate) / (1 - rate)

/**
 * Motion props for a list row (`motion.li`) inside
 * `<AnimatePresence initial={false} mode="popLayout">`: a new row eases in, a
 * deleted row fades out and the rows below close the gap with a spring. Under
 * Reduce Motion rows only fade. (SPRING's restDelta is in pixels, so opacity
 * and scale get their own transitions.)
 */
export function useRowMotion() {
  const reduce = useReducedMotion()
  if (reduce) return { exit: { opacity: 0 }, transition: { duration: 0.15 } }
  return {
    layout: 'position',
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { layout: SPRING, default: { type: 'spring', stiffness: 520, damping: 48 }, opacity: { duration: 0.18 } },
  }
}

/**
 * Layers (sheets and dialogs) that are open, topmost last. Only the topmost
 * reacts to Escape and keeps Tab inside itself, so a dialog opened over a
 * sheet is closed first.
 */
const layers = []
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keyboard and screen-reader behaviour of a modal layer: Escape calls
 * `onClose`, Tab stays inside `ref`, focus moves in when it opens (to the
 * first field or button) and goes back to what had it when it closes.
 */
function useModalLayer(ref, onClose) {
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const opener = document.activeElement
    const layer = {}
    layers.push(layer)

    const focusables = () => [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)
    ;(focusables()[0] ?? root).focus({ preventScroll: true })

    const onKey = (e) => {
      if (layers[layers.length - 1] !== layer) return
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current?.()
      } else if (e.key === 'Tab') {
        const list = focusables()
        if (list.length === 0) { e.preventDefault(); return }
        const first = list[0]
        const last = list[list.length - 1]
        if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus() }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      layers.splice(layers.indexOf(layer), 1)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [ref])
}

/**
 * Full-screen sheet driven by framer-motion springs. Two variants:
 *
 *  'push'   (default) a pushed page. Springs in from the right; drag from the
 *           left edge to go back. Mirrored in right-to-left (Arabic).
 *  'modal'  a bottom sheet (Log Meal). Springs up from the bottom over a dimmed
 *           backdrop; drag the header down to dismiss, tap the backdrop to close.
 *
 * Mount it inside <AnimatePresence>: `exit` plays the slide-out when the
 * parent stops rendering it. The position is ONE motion value (`pos`), and the
 * backdrop opacity is derived from it, so the dim follows the sheet with no
 * React renders while dragging.
 *
 * `dirty`: the sheet holds unsaved edits. Closing it by swipe, Escape or a tap
 * on the backdrop then asks "Discard Changes?" first; the Cancel button always
 * closes straight away.
 */
export function Sheet({ title, onClose, action, children, z = 'z-40', closeLabel = 'Cancel', variant = 'push', dirty = false }) {
  const modal = variant === 'modal'
  const side = isRTL() ? -1 : 1                         // push pages come from the left in right-to-left
  const reduce = useReducedMotion()
  const controls = useDragControls()
  const root = useRef(null)
  const [discarding, setDiscarding] = useState(false)
  const [{ W, H }, setSize] = useState(() => ({ W: window.innerWidth, H: window.innerHeight }))
  useEffect(() => {                                     // keep the slide distances right after a rotation
    const onResize = () => setSize({ W: window.innerWidth, H: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const off = modal ? H : W * side
  const pos = useMotionValue(off)                       // starts off-screen, animates to 0
  const scrim = useTransform(pos, (p) => 1 - Math.min(Math.max(p / off, 0), 1)) // dim fades as the sheet leaves
  const transition = reduce ? { duration: 0 } : SPRING

  const requestClose = () => (dirty ? setDiscarding(true) : onClose())
  useModalLayer(root, requestClose)

  const release = (_, info) => {
    const d = modal ? info.offset.y : info.offset.x * side
    const v = modal ? info.velocity.y : info.velocity.x * side // px/s, towards closing
    // Judge by where the flick is heading, not only where the finger let go.
    if (d + project(v) > Math.abs(off) * (modal ? 0.25 : 0.33) || v > 600) requestClose()
  }

  return (
    <div ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`fixed inset-0 outline-none ${z}`}>
      <motion.div
        className="absolute inset-0 bg-black/45"
        style={{ opacity: scrim }}
        onClick={modal ? requestClose : undefined}
        aria-hidden="true"
      />
      <motion.div
        className={`absolute flex flex-col overflow-hidden text-zinc-900 will-change-transform dark:text-white ${
          modal
            // Frosted: the page behind shows only as a tint. A 24 px blur (not 40)
            // keeps the slide-in cheap: this layer re-blurs everything under it
            // on every frame it moves.
            ? 'glass-surface inset-x-0 bottom-0 rounded-t-[28px] bg-canvas/85 shadow-[0_-10px_40px_rgba(0,0,0,0.35)] ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 dark:bg-black/60 dark:ring-white/10'
            : `bg-canvas dark:bg-black inset-0 ${side > 0 ? 'shadow-[-12px_0_32px_rgba(0,0,0,0.25)]' : 'shadow-[12px_0_32px_rgba(0,0,0,0.25)]'}`
        }`}
        // A bottom sheet stops short of the top so the page behind peeks out.
        style={modal ? { y: pos, top: 'calc(env(safe-area-inset-top) + 10px)' } : { x: pos }}
        animate={modal ? { y: 0 } : { x: 0 }}
        exit={modal ? { y: H } : { x: W * side }}
        transition={transition}
        drag={modal ? 'y' : 'x'}
        dragControls={controls}
        dragListener={false}                 // drags start only from the handle / edge strip below
        dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
        dragElastic={modal ? { top: 0.05, bottom: 1 } : side > 0 ? { left: 0, right: 1 } : { left: 1, right: 0 }}
        dragMomentum={false}                 // we decide on release; a miss springs back
        dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
        onDragEnd={release}
      >
        <header
          className="border-b border-black/5 dark:border-white/10"
          style={{
            paddingTop: modal ? 0 : 'calc(env(safe-area-inset-top) + 12px)',
            touchAction: modal ? 'none' : undefined,
          }}
          onPointerDown={modal ? (e) => { if (!e.target.closest('button')) controls.start(e) } : undefined}
        >
          {modal && <div className="mx-auto mt-2 mb-1 h-1 w-9 rounded-full bg-black/15 dark:bg-white/25" />}
          <div className={`flex items-center justify-between px-4 pb-3 ${modal ? 'pt-1.5' : ''}`}>
            <button type="button" onClick={onClose} className={`min-h-11 w-16 rounded-lg text-start ${focusRing} ${accentText}`}>{t(closeLabel)}</button>
            <h2 className="font-semibold">{title}</h2>
            <div className="w-16 text-end">{action}</div>
          </div>
        </header>

        {/* Left-edge strip (right edge in right-to-left): drag from here to go
            back (push pages only). It starts below the header so it never
            covers the Cancel button. */}
        {!modal && (
          <div
            className="absolute bottom-0 start-0 z-10 w-5"
            style={{ top: 'calc(env(safe-area-inset-top) + 72px)', touchAction: 'none' }}
            onPointerDown={(e) => controls.start(e)}
          />
        )}

        <div
          className="mx-auto w-full max-w-md flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          {children}
        </div>
      </motion.div>

      {discarding && (
        <ConfirmDialog
          destructive
          title={t('Discard Changes?')}
          message={t('Your changes will be lost.')}
          confirmLabel={t('Discard')}
          cancelLabel={t('Keep Editing')}
          onCancel={() => setDiscarding(false)}
          onConfirm={onClose}
        />
      )}
    </div>
  )
}

// Rendered into <body> with a portal: the tab pages sit on a transformed
// (sliding) track, and `position: fixed` inside a transform is positioned
// against that track instead of the screen, so a dialog opened from any tab
// but the first would land off-screen. React events still bubble from the
// portal to the tab pager, so data-no-swipe keeps drags in a dialog from
// switching tabs.
const DialogShell = ({ title, onCancel, children, as: Tag = 'div', ...rest }) => {
  const root = useRef(null)
  useModalLayer(root, onCancel)
  return createPortal(
    <div
      ref={root}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-6 outline-none backdrop-blur-sm dark:bg-black/70"
      role="dialog" aria-modal="true" aria-label={title}
      data-no-swipe
      onClick={onCancel}
    >
      <Tag
        {...rest}
        className="w-full max-w-xs rounded-3xl border border-black/5 bg-white p-5 text-center text-zinc-900 dark:border-white/10 dark:bg-card dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </Tag>
    </div>,
    document.body,
  )
}

/**
 * Centered confirmation dialog. Cancel is the safe choice and takes focus first.
 * `destructive` paints the confirm button red, for an action that throws data
 * away in a way the person may not expect (a restore, discarding edits).
 */
export function ConfirmDialog({ title, message, confirmLabel, cancelLabel, destructive = false, onConfirm, onCancel }) {
  return (
    <DialogShell title={title} onCancel={onCancel}>
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <p className={`mt-2 text-sm ${muted}`}>{message}</p>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onCancel} className={`flex-1 rounded-2xl py-3 font-medium ${focusRing} ${fieldBg}`}>{cancelLabel ?? t('Cancel')}</button>
        <button
          type="button" onClick={onConfirm}
          className={`flex-1 rounded-2xl py-3 font-semibold text-white ${focusRing} ${destructive ? 'bg-danger' : 'bg-royal'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}

/** Dialog that asks for a name (used when saving a meal as a template). */
export function NameDialog({ title, message, initial = '', confirmLabel, placeholder, onConfirm, onCancel }) {
  const [name, setName] = useState(initial)
  const trimmed = name.trim()
  return (
    <DialogShell
      as="form" title={title} onCancel={onCancel}
      onSubmit={(e) => { e.preventDefault(); if (trimmed) onConfirm(trimmed) }}
    >
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {message && <p className={`mt-2 text-sm ${muted}`}>{message}</p>}
      <TextInput
        value={name} onChange={(e) => setName(e.target.value)} autoComplete="off"
        placeholder={placeholder ?? t('Template name')} aria-label={placeholder ?? t('Template name')} className="mt-4"
      />
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={onCancel} className={`flex-1 rounded-2xl py-3 font-medium ${focusRing} ${fieldBg}`}>{t('Cancel')}</button>
        <button type="submit" disabled={!trimmed} className={`flex-1 rounded-2xl bg-royal py-3 font-semibold text-white disabled:opacity-35 ${focusRing}`}>
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  )
}
