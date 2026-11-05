// One exercise with its sets, used while logging a workout and while editing a
// routine. The three-line handle at the top right drags it to a new place: while
// the handle is held the card follows the finger, and each time it passes its
// neighbour's middle the two swap (`ops.move`). Done by hand, with no
// layout animation, which would squash the card whenever its height changes.
//
// The three-dot menu at the top right holds everything that is not about a set:
// swap, add a superset exercise (picked from the exercise list) or leave the
// superset, drop set on / off, remove.
//
//   logging   (default) # | Previous | kg | reps | done tick | remove. "Previous"
//             is what was lifted last time, with "Best" (the heaviest weight
//             ever lifted in that set) under it; a routine's planned numbers
//             (`entry.plan`) take priority as the input hints, and ticking an
//             empty set fills the hint in. Only typed or ticked values count.
//   planning  # | kg | reps | remove: the numbers ARE the routine, so there is
//             no history and nothing to tick.
//
// Bodyweight exercises count your body weight (saved on the entry when it was
// added), so their kg column is only the EXTRA weight and is headed "+kg".
// In a drop-set exercise every set can have drops: lighter rounds shown as
// indented rows under the set, done straight after it.
import { memo, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { animate, motion, useMotionValue } from 'framer-motion'
import { num, fmt0, fmt1 } from '../lib/calc.js'
import { exerciseOf, isBodyweight, setText } from '../lib/workouts.js'
import { Card, CheckIcon, muted, faint, accentText, fieldBg, buttonBg, focusRing, placeholder } from './ui.jsx'
import { t } from '../lib/i18n.js'

const DotsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" />
  </svg>
)

const GripIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" /></svg>
)

const NONE = [] // a stable empty list, so a default prop does not defeat memo

// Set table columns
const LOG_GRID = 'grid grid-cols-[1.5rem_minmax(0,1fr)_3.75rem_3.25rem_2rem_1.25rem] items-center gap-2'
const PLAN_GRID = 'grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_1.25rem] items-center gap-2'

/** The three-dot popover. `items` are { label, onClick, danger? } (falsy ones are skipped). */
function CardMenu({ items, label }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }
    document.addEventListener('pointerdown', away)
    // Capture phase: the sheet's own Escape listener is also on document and was added first.
    document.addEventListener('keydown', esc, true)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc, true)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={label}
        className={`rounded-lg p-1.5 transition active:scale-90 ${open ? accentText : faint}`}
      >
        <DotsIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-20 mt-1 w-max min-w-48 max-w-64 overflow-hidden rounded-2xl border-[0.5px] border-black/8 bg-white p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] dark:border-white/12 dark:bg-zinc-900 neu:border-(--neu-edge) neu:bg-canvas neu:shadow-(--neu-raised)"
        >
          {items.filter(Boolean).map((item) => (
            <button
              key={item.label} type="button" role="menuitem"
              onClick={() => { setOpen(false); item.onClick() }}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-[14px] outline-none transition active:scale-[0.97] focus-visible:bg-black/5 dark:focus-visible:bg-white/10 ${
                item.danger ? 'text-fat-deep dark:text-fat' : ''
              }`}
            >
              <span>{item.label}</span>
              {item.on && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// `ops` (lib/useEntryOps.js) never changes, so the card re-renders only when its own entry, its
// history (`previous`, `best`) or its superset position changes.
function ExerciseCard({ entry, previous = NONE, best = NONE, planning = false, tag = null, ops }) {
  const id = entry.id
  const ex = exerciseOf(entry)
  const bodyweight = isBodyweight(ex)
  const grid = planning ? PLAN_GRID : LOG_GRID
  const input = `w-full rounded-lg px-1.5 py-1.5 text-center tabular-nums transition-colors ${focusRing} ${fieldBg} ${placeholder}`
  const ref = useRef(null)
  const y = useMotionValue(0)
  const [dragging, setDragging] = useState(false)

  // Drag by the handle. y follows the pointer; passing a neighbour's middle swaps the two (the
  // card keeps its place under the finger because y is corrected by the distance it moved).
  const startDrag = (e) => {
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture?.(e.pointerId)
    let startY = e.clientY
    const scroller = ref.current?.closest('.overflow-y-auto')
    setDragging(true)

    const move = (ev) => {
      const el = ref.current
      if (!el) return
      if (scroller) { // near the top / bottom edge of the screen: scroll the sheet
        const r = scroller.getBoundingClientRect()
        const step = ev.clientY < r.top + 70 ? -12 : ev.clientY > r.bottom - 70 ? 12 : 0
        if (step) {
          const before = scroller.scrollTop
          scroller.scrollTop += step
          startY -= scroller.scrollTop - before
        }
      }
      let dy = ev.clientY - startY
      const sib = dy > 0 ? el.nextElementSibling : el.previousElementSibling
      if (sib && dy !== 0) {
        const dir = dy > 0 ? 1 : -1
        const gap = dir > 0 ? sib.offsetTop - (el.offsetTop + el.offsetHeight) : el.offsetTop - (sib.offsetTop + sib.offsetHeight)
        // swap once the card's leading edge is past the neighbour's middle
        if (Math.abs(dy) > sib.offsetHeight / 2 + gap) {
          flushSync(() => ops.move(id, dir))
          startY += dir * (sib.offsetHeight + gap)
          dy = ev.clientY - startY
        }
      }
      y.set(dy)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      setDragging(false)
      animate(y, 0, { type: 'spring', stiffness: 500, damping: 40 })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  // Hint for set i: the routine's plan, else the same set last time, else the
  // last set done then.
  const planned = (i) => (num(entry.plan?.[i]?.reps) > 0 ? entry.plan[i] : null)
  const hint = (i) => planned(i) ?? previous[i] ?? previous[previous.length - 1]
  const dropHint = (i, j) => (num(entry.plan?.[i]?.drops?.[j]?.reps) > 0 ? entry.plan[i].drops[j] : null)

  const toggleDone = (set, i) => {
    const h = hint(i)
    const fill = !set.done && h ? { kg: set.kg || (num(h.kg) > 0 ? String(h.kg) : ''), reps: set.reps || String(num(h.reps)) } : {}
    ops.setSet(id, set.id, { ...fill, done: !set.done })
    // Ticking a set also fills its planned drops.
    if (!set.done) {
      (set.drops ?? []).forEach((d, j) => {
        const dh = dropHint(i, j)
        if (dh && !d.reps) ops.patchDrop(id, set.id, d.id, { kg: d.kg || (num(dh.kg) > 0 ? String(dh.kg) : ''), reps: String(num(dh.reps)) })
      })
    }
  }

  const menu = [
    ex.muscle && { label: t('Swap exercise'), onClick: () => ops.swap(entry) },
    { label: t(tag ? 'Add to superset' : 'Add superset exercise'), onClick: () => ops.addPartner(entry) },
    tag && { label: t('Remove from superset'), onClick: () => ops.unlink(id) },
    { label: t('Drop set'), onClick: () => ops.toggleDropSet(id), on: Boolean(entry.dropSet) },
    { label: t('Remove exercise'), onClick: () => ops.remove(id), danger: true },
  ]

  return (
    <motion.div ref={ref} style={{ y, position: 'relative', zIndex: dragging ? 40 : undefined }}>
      <Card className={`space-y-3 transition-transform ${dragging ? 'scale-[1.02] shadow-2xl' : ''} ${tag ? 'ring-2 ring-royal/35' : ''}`}>
        <div className="flex items-start gap-0.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{ex.name}</p>
            {ex.muscle && (
              <p className={`truncate text-xs ${muted}`}>
                <span className={accentText}>{t(ex.muscle)}</span> · {t(ex.equipment)}
              </p>
            )}
            {(tag || entry.dropSet) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {tag && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold bg-royal/10 dark:bg-royal/25 ${accentText}`}>
                    {t('Superset')} {tag.n}/{tag.of}
                  </span>
                )}
                {entry.dropSet && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold bg-royal/10 dark:bg-royal/25 ${accentText}`}>
                    {t('Drop set')}
                  </span>
                )}
              </div>
            )}
          </div>
          <CardMenu items={menu} label={t('Options for {name}', { name: ex.name })} />
          <button
            type="button" onPointerDown={startDrag}
            aria-label={t('Drag to reorder {name}', { name: ex.name })}
            className={`touch-none cursor-grab rounded-lg p-1.5 active:cursor-grabbing ${faint}`}
          >
            <GripIcon />
          </button>
        </div>

        {bodyweight && (
          <p className={`rounded-xl px-3 py-2 text-xs ${muted} bg-royal/6 dark:bg-royal/15`}>
            {entry.bw
              ? t('Your body weight ({kg} kg) is counted. Enter extra weight only, if you add any.', { kg: fmt1(entry.bw) })
              : planning
                ? t('Your body weight is counted when you train. Enter extra weight only, if you add any.')
                : t('Log your weight in the Weight tab to count it. Enter extra weight only.')}
          </p>
        )}

        <div className="space-y-1.5">
          <div className={`${grid} text-[11px] font-semibold uppercase tracking-wide ${faint}`}>
            <span className="text-center">{t('Set')}</span>
            {!planning && <span>{t('Previous')}</span>}
            <span className="text-center">{t(bodyweight ? '+kg' : 'kg')}</span>
            <span className="text-center">{t('Reps')}</span>
            {!planning && <span />}
            <span />
          </div>
          {entry.sets.map((set, i) => {
            const h = planning ? null : hint(i)
            return (
              <div key={set.id} className={`-mx-1.5 rounded-xl px-1.5 py-1 transition-colors ${set.done ? 'bg-royal/8 dark:bg-royal/20' : ''}`}>
                <div className={grid}>
                  <span className={`text-center text-sm font-semibold tabular-nums ${set.done ? accentText : muted}`}>{i + 1}</span>
                  {!planning && (
                    <div className="flex min-w-0 flex-col items-start leading-tight">
                      {previous[i] ? (
                        // Tap the previous set to copy it into this one.
                        <button
                          onClick={() => ops.setSet(id, set.id, { kg: num(previous[i].kg) > 0 ? String(previous[i].kg) : '', reps: String(previous[i].reps) })}
                          className={`max-w-full truncate text-start text-xs tabular-nums ${faint}`}
                        >
                          {setText(previous[i], bodyweight)}
                        </button>
                      ) : (
                        <span className={`text-xs ${faint}`}>–</span>
                      )}
                      {/* Smaller than the previous value: the heaviest weight ever lifted in this set. */}
                      {best[i] > 0 && (
                        <span className={`max-w-full truncate text-[11px] tabular-nums ${accentText}`}>
                          {t('Best')} {fmt1(best[i])}
                        </span>
                      )}
                    </div>
                  )}
                  <input
                    inputMode="decimal" value={set.kg} placeholder={h && num(h.kg) > 0 ? fmt1(num(h.kg)) : '0'}
                    onChange={(e) => ops.setSet(id, set.id, { kg: e.target.value })}
                    aria-label={t(bodyweight ? 'Set {n} extra weight' : 'Set {n} weight', { n: i + 1 })} className={input}
                  />
                  <input
                    inputMode="numeric" value={set.reps} placeholder={h ? fmt0(num(h.reps)) : '0'}
                    onChange={(e) => ops.setSet(id, set.id, { reps: e.target.value })}
                    aria-label={t('Set {n} reps', { n: i + 1 })} className={input}
                  />
                  {!planning && (
                    <button
                      onClick={() => toggleDone(set, i)}
                      aria-pressed={set.done}
                      aria-label={t('Set {n} done', { n: i + 1 })}
                      className={`mx-auto flex size-7 items-center justify-center rounded-full transition active:scale-90 ${
                        set.done ? 'bg-royal text-on-accent shadow-[0_0_12px_-2px_rgba(120,81,169,0.7)] neu:shadow-(--neu-raised-sm)' : 'border-2 border-zinc-300 text-transparent dark:border-zinc-600'
                      }`}
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => ops.removeSet(id, set.id)}
                    aria-label={t('Remove set {n}', { n: i + 1 })}
                    className={`text-lg leading-none ${faint}`}
                  >
                    ×
                  </button>
                </div>

                {entry.dropSet && (
                  <>
                    {(set.drops ?? []).map((d, j) => {
                      const dh = planning ? null : dropHint(i, j)
                      return (
                        <div key={d.id} className={`${grid} mt-1`}>
                          <span className={`text-center text-xs font-semibold ${faint}`} aria-hidden="true">↓</span>
                          {!planning && <span className={`text-xs ${faint}`}>{t('Drop')} {j + 1}</span>}
                          <input
                            inputMode="decimal" value={d.kg} placeholder={dh && num(dh.kg) > 0 ? fmt1(num(dh.kg)) : '0'}
                            onChange={(e) => ops.patchDrop(id, set.id, d.id, { kg: e.target.value })}
                            aria-label={t('Set {n} drop {d} weight', { n: i + 1, d: j + 1 })} className={input}
                          />
                          <input
                            inputMode="numeric" value={d.reps} placeholder={dh ? fmt0(num(dh.reps)) : '0'}
                            onChange={(e) => ops.patchDrop(id, set.id, d.id, { reps: e.target.value })}
                            aria-label={t('Set {n} drop {d} reps', { n: i + 1, d: j + 1 })} className={input}
                          />
                          {!planning && <span />}
                          <button
                            onClick={() => ops.removeDrop(id, set.id, d.id)}
                            aria-label={t('Remove drop {d}', { d: j + 1 })}
                            className={`text-lg leading-none ${faint}`}
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                    <button
                      onClick={() => ops.addDrop(id, set.id)}
                      className={`mt-1 ms-8 text-xs font-semibold ${accentText}`}
                    >
                      + {t('Add drop')}
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => ops.addSet(id)}
          className={`w-full rounded-xl py-2 text-sm font-semibold transition active:scale-[0.98] ${buttonBg} ${accentText}`}
        >
          + {t('Add Set')}
        </button>
      </Card>
    </motion.div>
  )
}

export default memo(ExerciseCard, (a, b) => (
  a.entry === b.entry && a.previous === b.previous && a.best === b.best && a.planning === b.planning &&
  a.ops === b.ops && a.tag?.n === b.tag?.n && a.tag?.of === b.tag?.of
))
