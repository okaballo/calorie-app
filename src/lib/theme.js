// Applying a theme, and the circular reveal when the user picks one.
//
// A theme is only two classes on <html>: `dark` switches every `dark:` variant,
// `neu` every `neu:` one. Neumorphism is English-only for now: in Arabic it
// shows as Light, and Dark Neumorphism as plain Dark.
//
// The reveal uses the browser's View Transitions: it snapshots the old screen,
// and the new theme grows over it as a circle (keyframes in index.css). The
// browser animates the snapshots, so no component renders while it runs.
// Browsers without the API, and Reduce Motion, just switch.
import { flushSync } from 'react-dom'

const themeFlags = (theme, rtl) => {
  const neu = (theme === 'neumorphism' || theme === 'neumorphism-dark') && !rtl
  const dark = theme === 'dark' || theme === 'neumorphism-dark'
    || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  return { neu, dark }
}

export function applyTheme(theme, rtl) {
  const { neu, dark } = themeFlags(theme, rtl)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.classList.toggle('neu', neu)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? (neu ? '#25282f' : '#000000') : neu ? '#e4e8ee' : '#f7f7f8')
}

let active = null // the reveal running now

/**
 * Picks a theme, growing it out of the `origin` element. `commit` saves the
 * choice; applying it stays with App's layout effect, which runs inside the
 * flushSync below, so the new snapshot already shows the new theme.
 */
export function revealTheme(theme, rtl, origin, commit) {
  const root = document.documentElement
  const next = themeFlags(theme, rtl)
  const looksTheSame = root.classList.contains('dark') === next.dark && root.classList.contains('neu') === next.neu
  if (looksTheSame || !document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    commit()
    return
  }

  const box = origin.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  root.style.setProperty('--reveal-x', `${x}px`)
  root.style.setProperty('--reveal-y', `${y}px`)
  // Far enough to reach the furthest corner.
  root.style.setProperty('--reveal-r', `${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`)

  active?.skipTransition()
  const transition = document.startViewTransition(() => {
    root.classList.add('theme-switching')
    flushSync(commit)
  })
  active = transition
  const done = () => {
    if (active !== transition) return
    active = null
    root.classList.remove('theme-switching')
  }
  transition.finished.then(done, done)
}
