// Local-first sync: localStorage is the source of truth for the UI, Supabase is a
// background copy that keeps devices in step.
//
//   write  The app writes localStorage as always (useLocalStorage). The hook then
//          calls noteLocalChange(); we diff against the last value we saw and put
//          the changed records in the OUTBOX (persisted, survives restarts and
//          offline periods). A push runs ~1 s later, silently.
//   push   Sends the outbox in batches. Success removes those entries (unless they
//          were edited again meanwhile); a network failure keeps them and retries
//          with back-off. Nothing here ever throws into the UI.
//   pull   On sign-in, app start, coming back online / to the foreground: fetches
//          the rows changed since our cursor (a server timestamp) and writes them
//          into localStorage, then tells the hooks to re-read (onHydrate). A record
//          with a change still waiting in the outbox is left alone: the local edit
//          wins and is pushed next.
//   delete Deletes are tombstones (deleted_at), so other devices remove them too.
//
// Which data goes where: tables.js.  Database + security: supabase/schema.sql.
//
// Owner. kb.sync.owner is the account the data on this device belongs to.
//   - First sign-in on a device: the device's data and the cloud's are JOINED.
//   - Same account again: normal incremental sync.
//   - Another account: start() answers 'switch' and does nothing until the person
//     confirms adoptAccount() (this device's data is replaced by that account's).
//     One account's data is never uploaded into another's.
import { COLLECTIONS, COLLECTION_BY_KEY, FIELD_BY_KEY, PROFILE_FIELDS, SYNCED_KEYS } from './tables.js'

const K = {
  outbox: 'kb.sync.outbox',
  cursors: 'kb.sync.cursors',
  owner: 'kb.sync.owner',
  first: 'kb.sync.first',         // set until this device's first full sync has finished
  reconcile: 'kb.sync.reconcile', // set by a backup restore: make the cloud match this device
  last: 'kb.sync.lastSyncedAt',
}
export const RECONCILE_KEY = K.reconcile
export const OWNER_KEY = K.owner

const PAGE = 1000          // rows per pull request (Supabase's default max)
const CHUNK = 200          // rows per push request
const PUSH_DELAY = 1200    // ms after the last change
const PULL_EVERY = 60000   // at most once a minute when coming back to the app
const POLL_EVERY = 300000  // and every 5 minutes while it is open

// ---- storage helpers (localStorage can throw: private mode, full) ----
const ls = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true } catch { return false } },
  del: (k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}
const parse = (raw, fallback) => { if (raw === null || raw === undefined) return fallback; try { return JSON.parse(raw) } catch { return fallback } }
const readJSON = (k, fallback) => parse(ls.get(k), fallback)

// ---- state ----
const loadClient = () => import('../supabaseClient.ts').then((m) => m.supabase)

let uid = null                                 // signed-in user whose data we sync (null: paused)
let outbox = readJSON(K.outbox, {})            // { "meals_log:<id>": entry, "profiles": entry }
let cursors = readJSON(K.cursors, {})          // { table: last updated_at seen (server time) }
let stamp = Date.now()                         // version of outbox entries (edits during a push survive)
let running = null                             // the sync in flight
let again = null                               // another sync was asked for meanwhile: 'push' | 'pull'
let pushTimer = 0, retryTimer = 0
let failures = 0
let lastPull = 0
let listening = false

// What the app last wrote, per synced key (raw JSON). Taken NOW, when the module
// loads, before the app's first write, so the first real edit is seen as a change.
const snap = {}
for (const k of SYNCED_KEYS) snap[k] = ls.get(k)

let status = {
  phase: 'signedOut',      // signedOut | idle | syncing | offline | error | paused
  pending: Object.keys(outbox).length,
  lastSyncedAt: ls.get(K.last),
  error: null,
  skipped: 0,              // records the server refused (invalid data); kept on the device
}
const listeners = new Set()
const setStatus = (patch) => {
  status = { ...status, ...patch, pending: Object.keys(outbox).length }
  listeners.forEach((fn) => fn())
}
export const getStatus = () => status
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

const hydrators = new Map()                    // key -> Set(callback): hooks that re-read the key
/** useLocalStorage registers here; `cb` runs after a pull changed the key. */
export function onHydrate(key, cb) {
  if (!hydrators.has(key)) hydrators.set(key, new Set())
  hydrators.get(key).add(cb)
  return () => hydrators.get(key).delete(cb)
}
/** Writes a key that came from the cloud: storage, snapshot (so it is not pushed back), hooks. */
function writeLocal(key, value) {
  const raw = JSON.stringify(value)
  if (ls.get(key) === raw) return
  // Storage full: stop here so the pull's cursor stays put and these rows are fetched again.
  if (!ls.set(key, raw)) throw new SyncError('Could not save synced data on this device', 'server')
  snap[key] = raw
  hydrators.get(key)?.forEach((cb) => { try { cb() } catch { /* a hook went away */ } })
}

/** Another tab wrote this key and already queued the change: remember it, so this tab does not treat it as its own edit. */
export function noteOtherTabWrite(key) {
  if (key in snap) snap[key] = ls.get(key)
}

const saveOutbox = () => { ls.set(K.outbox, JSON.stringify(outbox)); setStatus({}) }
const saveCursors = () => ls.set(K.cursors, JSON.stringify(cursors))

// ============================ local changes -> outbox ============================

const put = (table, id, entry) => { outbox[`${table}:${id}`] = { t: table, id, ...entry, v: ++stamp } }
const putField = (field, value) => {
  const e = outbox.profiles || { t: 'profiles', op: 'upsert', cols: {} }
  e.cols[field.column] = value === undefined ? null : value
  e.v = ++stamp
  outbox.profiles = e
}

function diffCollection(col, before, after) {
  const old = new Map()
  for (const x of before) if (x && x.id !== undefined && x.id !== null) old.set(String(x.id), JSON.stringify(x))
  const now = new Set()
  for (const x of after) {
    if (!x || x.id === undefined || x.id === null) continue
    const id = String(x.id)
    now.add(id)
    if (old.get(id) !== JSON.stringify(x)) put(col.table, id, { op: 'upsert', row: col.toRow(x) })
  }
  for (const id of old.keys()) if (!now.has(id)) put(col.table, id, { op: 'delete' })
}

/**
 * Called by useLocalStorage after every write. `raw` is the JSON it just stored.
 * `isDefault`: the hook is only storing its initial value because the key was
 * empty (first launch): not an edit, so it is never pushed over the cloud's data.
 * Cheap when nothing changed (a string compare).
 */
export function noteLocalChange(key, value, raw, isDefault = false) {
  if (!(key in snap)) return
  if (raw === undefined) raw = JSON.stringify(value)
  const before = snap[key]
  if (raw === before) return
  snap[key] = raw
  if (isDefault) return
  if (!ls.get(K.owner)) return                 // never signed in here: the first sign-in uploads everything
  const col = COLLECTION_BY_KEY[key]
  if (col) diffCollection(col, parse(before, []) || [], Array.isArray(value) ? value : [])
  else putField(FIELD_BY_KEY[key], value)
  saveOutbox()
  schedulePush()
}

function enqueueAllRecords() {
  for (const col of COLLECTIONS) {
    for (const x of readJSON(col.key, []) || []) {
      if (x && x.id !== undefined && x.id !== null) put(col.table, String(x.id), { op: 'upsert', row: col.toRow(x) })
    }
  }
}
function enqueueAllFields() {
  for (const f of PROFILE_FIELDS) {
    const raw = ls.get(f.key)
    if (raw !== null) putField(f, parse(raw, null))
  }
}

// ================================== push ==================================

const isNetworkError = (e) => {
  const m = String((e && (e.message || e)) || '')
  return /fetch|network|load failed|timeout|offline|abort/i.test(m)
}
class SyncError extends Error {
  constructor(message, kind) { super(message); this.kind = kind } // kind: 'offline' | 'auth' | 'server'
}
const classify = (res) => {
  const code = String(res.error?.code || '')
  const st = res.status || 0
  if (st === 0 || isNetworkError(res.error)) return 'offline'
  if (st === 401 || st === 403 || code === '42501' || code === 'PGRST301') return 'auth'
  if (code.startsWith('22') || code.startsWith('23') || st === 400 || st === 413 || st === 422) return 'invalid'
  return 'server'
}

function settle(list) {                         // sent: drop the entries unless edited again meanwhile
  for (const [k, e] of list) if (outbox[k] && outbox[k].v === e.v) delete outbox[k]
  saveOutbox()
}

/** Runs one request for `list`; on invalid data, retries one by one and skips the bad ones. */
async function send(list, run) {
  let res
  try { res = await run(list) } catch (e) { throw new SyncError(String(e?.message || e), isNetworkError(e) ? 'offline' : 'server') }
  if (!res || !res.error) return settle(list)
  const kind = classify(res)
  if (kind === 'invalid') {
    if (list.length > 1) { for (const one of list) await send([one], run); return }
    console.warn('[sync] the server refused a record; it stays on this device only:', list[0][0], res.error)
    settle(list)
    setStatus({ skipped: status.skipped + 1 })
    return
  }
  throw new SyncError(res.error.message || 'sync failed', kind)
}

const chunks = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out }

async function push(sb, me) {
  const entries = Object.entries(outbox)
  if (!entries.length) return
  for (const col of COLLECTIONS) {
    const mine = entries.filter(([, e]) => e.t === col.table)
    for (const part of chunks(mine.filter(([, e]) => e.op === 'upsert'), CHUNK)) {
      await send(part, (list) => sb.from(col.table)
        .upsert(list.map(([, e]) => ({ ...e.row, user_id: me, deleted_at: null })), { onConflict: 'user_id,id' }))
    }
    for (const part of chunks(mine.filter(([, e]) => e.op === 'delete'), CHUNK)) {
      await send(part, (list) => sb.from(col.table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', me)
        .in('id', list.map(([, e]) => e.id)))
    }
  }
  if (outbox.profiles) {
    const e = outbox.profiles
    await send([['profiles', e]], () => sb.from('profiles').upsert({ ...e.cols, user_id: me }, { onConflict: 'user_id' }))
  }
}

// ================================== pull ==================================

const canon = (col, x) => JSON.stringify(col.toRow(x))

function applyCollection(col, rows) {
  const local = readJSON(col.key, []) || []
  const map = new Map()
  for (const x of local) if (x && x.id !== undefined && x.id !== null) map.set(String(x.id), x)
  let changed = false
  for (const r of rows) {
    const id = String(r.id)
    if (outbox[`${col.table}:${id}`]) continue          // a local edit is waiting: it wins
    if (r.deleted_at) { if (map.delete(id)) changed = true; continue }
    const item = col.fromRow(r)
    const prev = map.get(id)
    if (!prev || canon(col, prev) !== canon(col, item)) { map.set(id, item); changed = true }
  }
  if (changed) writeLocal(col.key, [...map.values()].sort(col.sort))
}

function applyProfile(row, firstSync) {
  const pending = outbox.profiles ? { ...outbox.profiles.cols } : {}   // columns edited here and not sent yet: they win
  for (const f of PROFILE_FIELDS) {
    if (!(f.column in row) || f.column in pending) continue
    let remote = row[f.column]
    if (remote === null || remote === undefined) {
      if (firstSync) { const raw = ls.get(f.key); if (raw !== null) putField(f, parse(raw, null)) } // cloud has nothing yet: send ours
      else if (f.nullable) writeLocal(f.key, null)                                                  // e.g. the photo was removed
      continue
    }
    if (firstSync && f.merge) {
      const merged = f.merge(remote, readJSON(f.key, []))
      if (JSON.stringify(merged) !== JSON.stringify(remote)) putField(f, merged)              // upload the union
      remote = merged
    }
    writeLocal(f.key, remote)
  }
}

async function pull(sb, me) {
  for (const col of COLLECTIONS) {
    const since = cursors[col.table] || '1970-01-01T00:00:00Z'
    const rows = []
    for (let from = 0; ; from += PAGE) {
      const res = await sb.from(col.table).select('*')
        .eq('user_id', me)
        .gt('updated_at', since)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (res.error) throw new SyncError(res.error.message, classify(res))
      rows.push(...(res.data || []))
      if (!res.data || res.data.length < PAGE) break
    }
    if (uid !== me) return
    if (rows.length) {
      applyCollection(col, rows)
      cursors[col.table] = rows[rows.length - 1].updated_at
      saveCursors()
    }
  }

  const res = await sb.from('profiles').select('*').eq('user_id', me).maybeSingle()
  if (res.error) throw new SyncError(res.error.message, classify(res))
  if (uid !== me) return
  const firstSync = ls.get(K.first) === '1'
  const row = res.data
  if (!row) {
    if (!outbox.profiles || firstSync) enqueueAllFields()        // first device for this account: send ours
  } else if (firstSync || (!outbox.profiles && (!cursors.profiles || Date.parse(row.updated_at) > Date.parse(cursors.profiles)))) {
    applyProfile(row, firstSync)
    cursors.profiles = row.updated_at
    saveCursors()
  }
  if (firstSync) ls.del(K.first)
  saveOutbox()
}

/** After a backup restore: make the cloud match this device (restore = "this is my data now"). */
async function reconcile(sb, me) {
  outbox = {}
  enqueueAllRecords()
  enqueueAllFields()
  for (const col of COLLECTIONS) {
    const local = new Set((readJSON(col.key, []) || []).filter(Boolean).map((x) => String(x.id)))
    for (let from = 0; ; from += PAGE) {
      const res = await sb.from(col.table).select('id').eq('user_id', me).is('deleted_at', null)
        .order('id', { ascending: true }).range(from, from + PAGE - 1)
      if (res.error) throw new SyncError(res.error.message, classify(res))
      for (const r of res.data || []) if (!local.has(String(r.id))) put(col.table, String(r.id), { op: 'delete' })
      if (!res.data || res.data.length < PAGE) break
    }
  }
  cursors = {}
  saveCursors()
  saveOutbox()
}

// ================================== runner ==================================

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

/**
 * Pushes the outbox and, with { pull: true }, pulls the cloud's changes. Never
 * rejects: resolves true when everything went through. Calls made while one is
 * running are folded into one more run afterwards.
 */
export function syncNow(opts = {}) {
  const wantPull = !!opts.pull
  if (!uid) return Promise.resolve(false)
  if (running) { again = (again === 'pull' || wantPull) ? 'pull' : 'push'; return running }
  const me = uid
  running = (async () => {
    clearTimeout(pushTimer); clearTimeout(retryTimer)
    if (isOffline()) { setStatus({ phase: 'offline' }); return false }
    try {
      const sb = await loadClient()
      if (!sb) { setStatus({ phase: 'signedOut' }); return false }
      setStatus({ phase: 'syncing' })
      if (ls.get(K.reconcile)) { await reconcile(sb, me); await push(sb, me); ls.del(K.reconcile) }
      await push(sb, me)
      if (wantPull || ls.get(K.first) === '1') {
        await pull(sb, me)
        lastPull = Date.now()
        await push(sb, me)                    // anything the pull queued (e.g. a first device's profile)
      }
      if (uid !== me) return false
      failures = 0
      const at = new Date().toISOString()
      ls.set(K.last, at)
      setStatus({ phase: 'idle', lastSyncedAt: at, error: null })
      return true
    } catch (e) {
      if (uid !== me) return false
      failures += 1
      const kind = e && e.kind
      setStatus({
        phase: kind === 'offline' || isOffline() ? 'offline' : 'error',
        error: kind === 'auth' ? 'auth' : kind === 'offline' ? null : String(e?.message || e),
      })
      // back-off: 5 s, 10 s, 20 s ... up to 5 min (going online / foreground retries sooner)
      retryTimer = setTimeout(() => syncNow({ pull: true }), Math.min(300000, 5000 * 2 ** Math.min(failures - 1, 6)))
      return false
    } finally {
      running = null
      if (again) { const p = again === 'pull'; again = null; setTimeout(() => syncNow({ pull: p }), 0) }
    }
  })()
  return running
}

function schedulePush() {
  if (!uid) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => syncNow(), PUSH_DELAY)
}

function listen() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('online', () => syncNow({ pull: true }))
  window.addEventListener('offline', () => { if (uid) setStatus({ phase: 'offline' }) })
  document.addEventListener('visibilitychange', () => {
    if (!uid) return
    if (document.visibilityState === 'hidden') { if (Object.keys(outbox).length) syncNow() }  // leaving: send what is pending
    else if (Date.now() - lastPull > PULL_EVERY) syncNow({ pull: true })
  })
  setInterval(() => {
    if (uid && (typeof document === 'undefined' || document.visibilityState === 'visible')) syncNow({ pull: true })
  }, POLL_EVERY)
}

// ================================ lifecycle ================================

/**
 * Starts syncing for a signed-in user. Answers 'switch' (and syncs nothing) when
 * this device's data belongs to another account: call adoptAccount() once the
 * person agrees, or sign them out.
 */
export function start(userId) {
  const owner = ls.get(K.owner)
  if (owner && owner !== userId) { uid = null; setStatus({ phase: 'paused' }); return 'switch' }
  uid = userId
  if (!owner) {
    ls.set(K.owner, userId)
    ls.set(K.first, '1')
    enqueueAllRecords()                        // join: this device's records go up, the cloud's come down
    saveOutbox()
  }
  listen()
  setStatus({ phase: 'idle', error: null })
  syncNow({ pull: true })
  return 'ok'
}

/** Another account signs in on this device: replace the local data with that account's. */
export function adoptAccount(userId) {
  for (const k of SYNCED_KEYS) {
    ls.del(k)
    snap[k] = null
    hydrators.get(k)?.forEach((cb) => { try { cb() } catch { /* ignore */ } })
  }
  outbox = {}; cursors = {}
  saveOutbox(); saveCursors()
  ls.del(K.reconcile)
  ls.del(K.owner)
  return start(userId)
}

/** Stops syncing (sign-out). Local data and the outbox stay: the app keeps working offline. */
export function stop() {
  uid = null
  clearTimeout(pushTimer); clearTimeout(retryTimer)
  setStatus({ phase: 'signedOut', error: null })
}

/** Best-effort push before signing out; gives up after `ms`. */
export function flush(ms = 4000) {
  if (!uid || !Object.keys(outbox).length) return Promise.resolve(true)
  return Promise.race([syncNow(), new Promise((r) => setTimeout(() => r(false), ms))])
}
