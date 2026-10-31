// Sign-in state for the whole app (Google / Apple through Supabase) and the bridge
// to the sync engine: signing in starts background sync, signing out stops it.
//
// Signing in is optional: without an account KiBase works exactly as before,
// with everything on the device. The Supabase library is loaded on demand, so
// it never slows down the first screen.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import * as engine from './syncEngine.js'

/** True when this build has the Supabase URL and key (see .env.example). */
export const cloudConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

const loadSupabase = () => import('../supabaseClient.ts')

/** An OAuth error sent back in the URL (e.g. the person cancelled at Apple). */
function readOAuthError() {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search)
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const msg = q.get('error_description') || h.get('error_description') || q.get('error') || h.get('error')
  return msg ? msg.replace(/\+/g, ' ') : null
}
/** Removes the OAuth leftovers (?code=, ?error=) from the address bar once handled. */
function cleanUrl() {
  const url = new URL(window.location.href)
  let dirty = false
  for (const k of ['code', 'state', 'error', 'error_code', 'error_description']) {
    if (url.searchParams.has(k)) { url.searchParams.delete(k); dirty = true }
  }
  if (/(^|[#&])(access_token|error)=/.test(url.hash)) { url.hash = ''; dirty = true }
  if (dirty) window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(cloudConfigured ? undefined : null) // undefined: still reading the saved session
  const [busy, setBusy] = useState(null)                                    // 'google' | 'apple' while leaving for sign-in
  const [authError, setAuthError] = useState(readOAuthError)
  const [switchTo, setSwitchTo] = useState(null)                            // another account signed in: ask first

  // The saved session (works offline) and later sign-in / sign-out events.
  useEffect(() => {
    if (!cloudConfigured) return undefined
    let live = true
    let unsubscribe = () => {}
    loadSupabase().then(({ supabase }) => {
      if (!live || !supabase) { setSession(null); return }
      supabase.auth.getSession().then(({ data }) => {
        if (!live) return
        setSession(data.session ?? null)
        cleanUrl()                               // after getSession: the ?code= has been exchanged by now
      })
      // Keep this callback synchronous: calling Supabase from inside it can deadlock.
      const { data } = supabase.auth.onAuthStateChange((_event, s) => { if (live) setSession(s ?? null) })
      unsubscribe = () => data.subscription.unsubscribe()
    }).catch(() => { if (live) setSession(null) })
    return () => { live = false; unsubscribe() }
  }, [])

  // Sync follows the signed-in account.
  const userId = session?.user?.id ?? null
  useEffect(() => {
    if (!userId) { engine.stop(); return }
    setBusy(null)
    if (engine.start(userId) === 'switch') setSwitchTo(userId)
  }, [userId])

  const signIn = useCallback(async (provider) => {
    setAuthError(null)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setAuthError('offline'); return }
    setBusy(provider)
    try {
      const { supabase, authRedirectUrl } = await loadSupabase()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authRedirectUrl(),
          ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
        },
      })
      if (error) throw error
      // success: the browser is now leaving for Google / Apple and comes back signed in
    } catch (e) {
      setAuthError(e?.message || 'Sign-in failed')
      setBusy(null)
    }
  }, [])

  const signOut = useCallback(async () => {
    await engine.flush()                          // send what is pending first (best effort, a few seconds)
    try {
      const { supabase } = await loadSupabase()
      await supabase?.auth.signOut({ scope: 'local' }) // this device only
    } catch { /* offline: the local session is cleared anyway */ }
    engine.stop()
    setSession(null)
  }, [])

  const confirmSwitch = useCallback(() => {
    if (switchTo) engine.adoptAccount(switchTo)
    setSwitchTo(null)
  }, [switchTo])
  const cancelSwitch = useCallback(async () => {
    setSwitchTo(null)
    try {
      const { supabase } = await loadSupabase()
      await supabase?.auth.signOut({ scope: 'local' })
    } catch { /* ignore */ }
    setSession(null)
  }, [])

  const value = useMemo(() => ({
    configured: cloudConfigured,
    ready: session !== undefined,
    user: session?.user ?? null,
    busy,
    authError,
    clearError: () => setAuthError(null),
    signIn,
    signOut,
    switchPending: Boolean(switchTo),
    confirmSwitch,
    cancelSwitch,
    syncNow: () => engine.syncNow({ pull: true }),
  }), [session, busy, authError, signIn, signOut, switchTo, confirmSwitch, cancelSwitch])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** { phase, pending, lastSyncedAt, error, skipped } from the sync engine, live. */
export const useSyncStatus = () => useSyncExternalStore(engine.subscribe, engine.getStatus)
