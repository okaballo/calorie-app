// Backup & restore of everything the app saves in localStorage (the mt.* keys,
// listed in App.jsx).
//
// A backup file is JSON:
//   { app: 'KiBase', version: 1, exportedAt: ISO date, data: { 'mt.meals': [...], ... } }
//
// Importing replaces all current mt.* data, so the caller should confirm first
// and reload the page afterwards (every tab reads its data from storage on load).
import { dayKey } from './calc.js'

const APP = 'KiBase'
const VERSION = 1
const PREFIX = 'mt.'

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const arrayOf = (check) => (v) => Array.isArray(v) && v.every(check)
const oneOf = (...values) => (v) => values.includes(v)

/** The keys a backup may restore, each with a check of its stored shape.
 *  Keys not listed here are skipped on import. */
const SCHEMA = {
  'mt.profile': isObject,
  'mt.avatar': (v) => v === null || (typeof v === 'string' && v.startsWith('data:image/')),
  'mt.theme': oneOf('system', 'dark', 'light'),
  'mt.lang': oneOf('en', 'ar'),
  'mt.meals': arrayOf(isObject),
  'mt.customFoods': arrayOf(isObject),
  'mt.templates': arrayOf(isObject),
  'mt.weights': arrayOf(isObject),
  'mt.cheatDays': arrayOf((d) => typeof d === 'string'),
  'mt.activeDay': isObject,
  'mt.dailyWorkouts': isObject,
  'mt.workoutHistory': arrayOf(isObject),
  'mt.workoutTemplates': arrayOf(isObject),
  'mt.gymEquipment': arrayOf((e) => typeof e === 'string'),
  'mt.volumeRoutine': (v) => v === null || typeof v === 'string',
}

/** Every mt.* key currently in localStorage. */
const storedKeys = () => {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key)
  }
  return keys
}

/** Downloads all saved data as KiBase_Backup_YYYY-MM-DD.json. */
export function exportBackup() {
  const data = {}
  for (const key of storedKeys()) {
    try {
      data[key] = JSON.parse(localStorage.getItem(key))
    } catch {
      /* unreadable value: leave it out of the backup */
    }
  }
  const backup = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `KiBase_Backup_${dayKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Parses and validates the text of a backup file. Returns
 * { data, exportedAt, counts } or throws an Error whose message is a
 * user-facing English string (translated by the caller).
 */
export function parseBackup(text) {
  let backup
  try {
    backup = JSON.parse(text)
  } catch {
    throw new Error("This file isn't valid JSON.")
  }
  if (!isObject(backup) || backup.app !== APP || !isObject(backup.data)) {
    throw new Error("This file isn't a KiBase backup.")
  }
  if (typeof backup.version !== 'number' || backup.version > VERSION) {
    throw new Error('This backup was made by a newer version of KiBase.')
  }

  const data = {}
  for (const [key, value] of Object.entries(backup.data)) {
    const check = SCHEMA[key]
    if (!check) continue
    if (!check(value)) throw new Error('This backup is damaged and cannot be restored.')
    data[key] = value
  }
  if (!('mt.profile' in data)) throw new Error("This file isn't a KiBase backup.")

  return {
    data,
    exportedAt: backup.exportedAt,
    counts: {
      meals: data['mt.meals']?.length ?? 0,
      weights: data['mt.weights']?.length ?? 0,
      workouts: data['mt.workoutHistory']?.length ?? 0,
    },
  }
}

/**
 * Replaces all saved data with the backup's. If storage fails part way (e.g.
 * it is full), the previous data is put back and the error is rethrown.
 */
export function applyBackup(data) {
  const previous = storedKeys().map((key) => [key, localStorage.getItem(key)])
  try {
    for (const [key] of previous) localStorage.removeItem(key)
    for (const [key, value] of Object.entries(data)) localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    for (const key of storedKeys()) localStorage.removeItem(key)
    for (const [key, raw] of previous) localStorage.setItem(key, raw)
    throw err
  }
}
