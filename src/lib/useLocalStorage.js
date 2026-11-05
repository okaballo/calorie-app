import { useEffect, useRef, useState } from 'react'
import { noteLocalChange, noteOtherTabWrite, onHydrate } from './sync/syncEngine.js'

const read = (key, initial) => {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? initial : JSON.parse(raw)
  } catch {
    return initial
  }
}

/**
 * useState that is saved to localStorage, so data survives closing the app
 * and needs no network. Falls back to the initial value if nothing is stored
 * or the stored JSON is unreadable.
 *
 * Local-first sync: every write is also handed to the sync engine, which sends
 * the change to the cloud in the background (when signed in). When the cloud
 * brings newer data, the engine rewrites the key and this hook re-reads it.
 */
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => read(key, initial))
  const initialRef = useRef(initial)
  initialRef.current = initial
  // True until the first write when the key was empty: that write only stores the default.
  const storingDefault = useRef(null)
  if (storingDefault.current === null) {
    try { storingDefault.current = localStorage.getItem(key) === null } catch { storingDefault.current = false }
  }

  useEffect(() => {
    const raw = JSON.stringify(value)
    try {
      localStorage.setItem(key, raw)
    } catch {
      /* storage full or blocked: keep working in memory */
    }
    noteLocalChange(key, value, raw, storingDefault.current)
    storingDefault.current = false
  }, [key, value])

  // The cloud or another open tab changed the key (or another account's data was cleared): re-read it.
  // A cleared key falls back to the default, which again is not an edit.
  useEffect(() => {
    const reread = () => {
      try { if (localStorage.getItem(key) === null) storingDefault.current = true } catch { /* ignore */ }
      setValue(read(key, initialRef.current))
    }
    const onStorage = (e) => {
      if (e.key !== key && e.key !== null) return // null: the whole storage was cleared
      noteOtherTabWrite(key)
      reread()
    }
    const stopHydrate = onHydrate(key, reread)
    window.addEventListener('storage', onStorage)
    return () => {
      stopHydrate()
      window.removeEventListener('storage', onStorage)
    }
  }, [key])

  return [value, setValue]
}
