// The Supabase client, used for sign-in (Google / Apple) and cloud backup.
//
// The URL and the publishable ("anon") key come from .env.local (see .env.example).
// The anon key is meant to be public: every table is protected by Row Level
// Security (supabase/schema.sql), so it can only reach the signed-in user's
// own rows. NEVER put the service_role key in this app.
//
// This module is loaded on demand by lib/sync (a separate chunk), so the
// first screen of the app never waits for it.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** False in a build without the two variables: the app then runs local-only. */
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        flowType: 'pkce',          // OAuth code + verifier: no tokens in the URL
        persistSession: true,      // stays signed in offline and after a restart
        autoRefreshToken: true,
        detectSessionInUrl: true,  // finishes the Google / Apple redirect on return
        storageKey: 'kb.auth',     // not "mt.*": session tokens are never put in backup files
      },
    })
  : null

/** Where Google / Apple send people back after signing in: this app's own URL. */
export const authRedirectUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin).href
