// The actions of an exercise card (change a set, add a drop, move, remove,
// superset...), shared by the routine editor and the workout screen.
//
// The returned object NEVER changes identity, and every action takes the
// entry / set ids it works on. That lets ExerciseCard be React.memo'd: typing
// in one set re-renders that card only, instead of every card on the screen.
//
//   apply(fn)       applies `fn(entries) => entries` to the screen's list of entries
//   openPicker(x)   opens the exercise picker: { replacing: entry } to swap, or
//                   { replacing: null, partnerOf: entry } to add a superset exercise
//                   (both read through a ref, so they may change on every render)
import { useMemo, useRef } from 'react'
import {
  newSet, unlink, removeEntryFrom, moveEntry, toggleDropSet, addDrop, patchDrop, removeDrop,
} from './workouts.js'

export function useEntryOps(apply, openPicker) {
  const latest = useRef({ apply, openPicker })
  latest.current = { apply, openPicker }

  return useMemo(() => {
    const A = (fn) => latest.current.apply(fn)
    const setEntry = (id, fn) => A((list) => list.map((e) => (e.id === id ? fn(e) : e)))
    return {
      setSet: (id, setId, patch) =>
        setEntry(id, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) })),
      // A new set starts from the last one's numbers, like most lifting logs.
      addSet: (id) => setEntry(id, (e) => {
        const last = e.sets[e.sets.length - 1]
        return { ...e, sets: [...e.sets, newSet(last?.kg ?? '', last?.reps ?? '')] }
      }),
      // A routine's plan is matched by position, so it loses the same row.
      removeSet: (id, setId) => setEntry(id, (e) => {
        const i = e.sets.findIndex((s) => s.id === setId)
        return { ...e, sets: e.sets.filter((_, j) => j !== i), ...(e.plan && { plan: e.plan.filter((_, j) => j !== i) }) }
      }),
      remove: (id) => A((list) => removeEntryFrom(list, id)),
      move: (id, dir) => A((list) => moveEntry(list, id, dir)),
      unlink: (id) => A((list) => unlink(list, id)),
      toggleDropSet: (id) => setEntry(id, toggleDropSet),
      addDrop: (id, setId) => setEntry(id, (e) => addDrop(e, setId)),
      patchDrop: (id, setId, dropId, patch) => setEntry(id, (e) => patchDrop(e, setId, dropId, patch)),
      removeDrop: (id, setId, dropId) => setEntry(id, (e) => removeDrop(e, setId, dropId)),
      swap: (entry) => latest.current.openPicker({ replacing: entry }),
      addPartner: (entry) => latest.current.openPicker({ replacing: null, partnerOf: entry }),
    }
  }, [])
}
