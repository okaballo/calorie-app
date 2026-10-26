// A small pill that opens a rounded, translucent popover (frosted glass, like
// the tab bar) instead of the system menu. Used in chart headers (the Home
// interval, the Workout routine).
//
// `options` is [{ value, label }]; the list is read on every render, so
// options added or removed elsewhere show up the next time it opens. Closes on
// a pick, a tap outside or Escape; arrow keys move between the options.
// data-no-swipe keeps drags here from switching tabs.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { accentText } from './ui.jsx'

export default function OptionMenu({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()
  const root = useRef(null)
  const list = useRef(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  // Focus the picked option when the menu opens, so the keyboard starts there.
  useEffect(() => {
    if (open) list.current?.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true })
  }, [open])

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation()
      setOpen(false)
      root.current?.querySelector('button')?.focus()
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open) {
      e.preventDefault()
      const items = [...list.current.querySelectorAll('button')]
      const i = items.indexOf(document.activeElement)
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus()
    }
  }

  const pick = (option) => {
    onChange(option)
    setOpen(false)
    root.current?.querySelector('button')?.focus()
  }

  return (
    <div ref={root} data-no-swipe onKeyDown={onKeyDown} className="relative min-w-0 shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? ''}`}
        className={`flex max-w-44 items-center gap-1 rounded-full bg-royal/10 py-1 ps-3 pe-2 text-[13px] font-semibold outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-royal/60 dark:bg-royal/25 ${accentText}`}
      >
        <span className="truncate">{current?.label}</span>
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={list}
            role="listbox"
            aria-label={label}
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.8 }}
            className="absolute end-0 top-full z-20 mt-1.5 max-h-64 w-max min-w-32 max-w-64 origin-top-right overflow-y-auto rounded-2xl border-[0.5px] border-black/8 bg-white/75 p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150 rtl:origin-top-left dark:border-white/12 dark:bg-black/55 dark:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.8)]"
          >
            {options.map((option) => {
              const on = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => pick(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-1.5 text-start text-[14px] outline-none transition active:scale-[0.97] focus-visible:bg-black/5 dark:focus-visible:bg-white/10 ${
                    on ? `font-semibold ${accentText}` : ''
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {on && (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
