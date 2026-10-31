// Cloud Sync UI: the card on the Profile tab (status, account, Sync Now, Sign Out)
// and the sign-in sheet (Continue with Apple / Google). Signing in is optional:
// KiBase keeps working fully offline without an account.
//
// Brand assets: the Apple and Google marks below follow each company's sign-in
// button rules (equal size, black / white Apple button, Google's light / dark
// styles). Before launch, swap the two marks for the official files: Apple Design
// Resources ("Sign in with Apple" logos) and Google's sign-in branding kit.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { Card, SectionTitle, Sheet, PrimaryButton, ConfirmDialog, buttonBg, focusRing, muted, faint, accentText } from './ui.jsx'
import { useAuth, useSyncStatus } from '../lib/sync/AuthContext.jsx'
import { LegalDoc } from './LegalPages.jsx'
import { PRIVACY, TERMS } from '../lib/legal.js'
import { t, locale } from '../lib/i18n.js'

const AppleMark = ({ className = 'size-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
  </svg>
)
const GoogleMark = ({ className = 'size-5' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)
const CloudIcon = ({ className = 'size-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.34 9.1 4 4 0 0 0 6.5 19z" />
  </svg>
)
const Spinner = () => (
  <svg viewBox="0 0 24 24" className="size-5 animate-spin motion-reduce:animate-none" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

/** Sign-in buttons share one size and layout (Apple: never smaller than the others). */
const signInButton = `relative flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-50 ${focusRing}`

const Benefit = ({ icon, children }) => (
  <li className="flex items-center gap-4">
    <span className={`flex size-6 shrink-0 items-center justify-center ${accentText}`}>{icon}</span>
    <span className="text-base font-medium">{children}</span>
  </li>
)
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

/** The sign-in screen: one idea, three short reasons, then Continue with Apple / Google. */
function AuthSheet({ onClose }) {
  const auth = useAuth()
  const leaving = auth.busy
  const [agreed, setAgreed] = useState(false)   // must be ticked before either sign-in button works
  const [doc, setDoc] = useState(null)         // 'terms' | 'privacy' | null
  const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`
  const error = auth.authError === 'offline' ? t('You are offline. Connect to the internet to sign in.') : auth.authError
  return (
    <Sheet variant="modal" title={t('Cloud Sync')} closeLabel="Close" onClose={onClose} z="z-[55]">
      <div className="flex flex-col gap-12 px-2 pt-8 pb-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <img src={icon} alt="" className="size-[88px] rounded-[22px] shadow-[0_18px_40px_-14px_rgba(120,81,169,0.75)]" />
          <h2 className="max-w-[16rem] text-[30px] leading-[1.15] font-bold tracking-tight text-balance">{t('Your data, on every device.')}</h2>
        </div>

        <ul className="mx-auto w-fit space-y-6">
          <Benefit icon={<svg viewBox="0 0 24 24" className="size-6" {...stroke}><path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.34 9.1 4 4 0 0 0 6.5 19z" /></svg>}>{t('Automatic backup')}</Benefit>
          <Benefit icon={<svg viewBox="0 0 24 24" className="size-6" {...stroke}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>}>{t('Still instant, still offline')}</Benefit>
          <Benefit icon={<svg viewBox="0 0 24 24" className="size-6" {...stroke}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>}>{t('Private by design')}</Benefit>
        </ul>

        <div className="space-y-5">
          <div className="flex items-center gap-2.5">
            <button
              type="button" role="checkbox" aria-checked={agreed} aria-labelledby="agree-text"
              onClick={() => setAgreed((v) => !v)}
              className={`relative flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition before:absolute before:-inset-2.5 before:content-[''] ${focusRing} ${agreed ? 'border-royal bg-royal text-on-accent' : 'border-zinc-400 bg-transparent dark:border-white/40'}`}
            >
              {agreed && (
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              )}
            </button>
            <p id="agree-text" className={`text-[13px] leading-snug ${muted}`}>
              {t('I agree to the')}{' '}
              <button type="button" onClick={() => setDoc('terms')} className={`font-semibold underline underline-offset-2 ${accentText} ${focusRing} rounded-sm`}>{t('Terms')}</button>
              {' '}{t('and')}{' '}
              <button type="button" onClick={() => setDoc('privacy')} className={`font-semibold underline underline-offset-2 ${accentText} ${focusRing} rounded-sm`}>{t('Privacy Policy')}</button>.
            </p>
          </div>
          <div className="space-y-3.5">
            <button
              type="button" disabled={Boolean(leaving) || !agreed} onClick={() => auth.signIn('apple')}
              className={`${signInButton} bg-black text-white dark:bg-white dark:text-black`}
            >
              {leaving === 'apple' ? <Spinner /> : <AppleMark className="size-[22px]" />}
              {leaving === 'apple' ? t('Opening Apple...') : t('Continue with Apple')}
            </button>
            <button
              type="button" disabled={Boolean(leaving) || !agreed} onClick={() => auth.signIn('google')}
              className={`${signInButton} border border-[#747775] bg-white text-[#1f1f1f] dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3]`}
            >
              {leaving === 'google' ? <Spinner /> : <GoogleMark />}
              {leaving === 'google' ? t('Opening Google...') : t('Continue with Google')}
            </button>
          </div>
          {error && <p role="alert" className="text-center text-sm text-fat-deep dark:text-fat">{error}</p>}
          <p className={`px-4 pt-2 text-center text-xs leading-relaxed text-balance ${faint}`}>
            {t('Apple or Google shares your name and email. You can use KiBase without an account.')}
          </p>
        </div>
      </div>
      {/* Portal: the sheet is transformed, which would clip a fixed page placed inside it. */}
      {createPortal(
        <div data-no-swipe>
          <AnimatePresence>
            {doc && <LegalDoc key={doc} doc={doc === 'terms' ? TERMS : PRIVACY} onClose={() => setDoc(null)} z="z-[60]" />}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </Sheet>
  )
}

const timeAgo = (iso, now) => {
  if (!iso) return null
  const s = Math.max(0, (now - Date.parse(iso)) / 1000)
  if (s < 45) return t('just now')
  if (s < 3600) return t('{n} min ago', { n: Math.round(s / 60) })
  return new Date(iso).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' })
}

/** Status line under the account: what sync is doing, in words and a coloured dot. */
function useStatusText(st) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  const pending = st.pending
  switch (st.phase) {
    case 'syncing': return { dot: 'bg-royal dark:bg-lilac animate-pulse motion-reduce:animate-none', text: t('Syncing...') }
    case 'offline': return {
      dot: 'bg-amber-500',
      text: pending === 1 ? t('Offline. 1 change will sync when you are back online.')
        : pending ? t('Offline. {n} changes will sync when you are back online.', { n: pending }) : t('Offline. Your data is safe on this device.'),
    }
    case 'error': return st.error === 'auth'
      ? { dot: 'bg-danger', text: t('Sign in again to keep syncing.') }
      : { dot: 'bg-danger', text: t('Could not sync. Trying again automatically.') }
    case 'paused': return { dot: 'bg-amber-500', text: t('Waiting for your choice.') }
    default: return {
      dot: 'bg-emerald-500',
      text: pending === 1 ? t('1 change waiting to sync.') : pending ? t('{n} changes waiting to sync.', { n: pending }) : (st.lastSyncedAt ? t('Up to date. Synced {when}.', { when: timeAgo(st.lastSyncedAt, now) }) : t('Up to date.')),
    }
  }
}

/** Profile tab card. Hidden in builds without Supabase settings. */
export function CloudSyncCard() {
  const auth = useAuth()
  const st = useSyncStatus()
  const [open, setOpen] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const status = useStatusText(st)
  if (!auth?.configured) return null

  const user = auth.user
  const provider = user?.app_metadata?.provider
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || null
  const email = user?.email || null

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-royal/15 text-royal dark:bg-royal/25 dark:text-lilac">
          <CloudIcon />
        </span>
        <div className="min-w-0 flex-1">
          <SectionTitle>{t('Cloud Sync')}</SectionTitle>
          {!user && <p className={`text-sm ${muted}`}>{t('Back up and sync across your devices.')}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : `${buttonBg} ${muted}`}`}>
          {user ? t('On') : t('Off')}
        </span>
      </div>

      {!auth.ready ? (
        <p className={`text-sm ${muted}`}>{t('Checking your account...')}</p>
      ) : user ? (
        <>
          <div className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${buttonBg}`}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black ring-1 ring-black/10 dark:bg-black dark:text-white dark:ring-white/15">
              {provider === 'google' ? <GoogleMark className="size-[18px]" /> : <AppleMark className="size-[18px]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{name || email || t('Signed in')}</span>
              {name && email && <span className={`block truncate text-[13px] ${muted}`}>{email}</span>}
            </span>
          </div>
          <p className="flex items-start gap-2 text-sm" role="status" aria-live="polite">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
            <span className={muted}>{status.text}</span>
          </p>
          {st.skipped > 0 && (
            <p className={`text-xs ${faint}`}>
              {st.skipped === 1 ? t('1 item could not be uploaded and stays on this device only.') : t('{n} items could not be uploaded and stay on this device only.', { n: st.skipped })}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button" onClick={auth.syncNow} disabled={st.phase === 'syncing'}
              className={`min-h-11 flex-1 rounded-2xl text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${buttonBg} ${focusRing} ${accentText}`}
            >
              {t('Sync Now')}
            </button>
            <button
              type="button" onClick={() => setConfirmOut(true)}
              className={`min-h-11 flex-1 rounded-2xl text-sm font-semibold text-fat-deep transition active:scale-[0.98] dark:text-fat ${buttonBg} ${focusRing}`}
            >
              {t('Sign Out')}
            </button>
          </div>
        </>
      ) : (
        <>
          <PrimaryButton onClick={() => { auth.clearError(); setOpen(true) }}>{t('Turn On Cloud Sync')}</PrimaryButton>
          {auth.authError && !open && (
            <p role="alert" className="text-sm text-fat-deep dark:text-fat">
              {auth.authError === 'offline' ? t('You are offline. Connect to the internet to sign in.') : t('Sign-in did not finish: {why}', { why: auth.authError })}
            </p>
          )}
        </>
      )}

      {/* Portal: the Profile page sits on a sliding track; a fixed sheet inside it would be clipped. */}
      {createPortal(
        <div data-no-swipe>
          <AnimatePresence>{open && !user && <AuthSheet key="auth" onClose={() => setOpen(false)} />}</AnimatePresence>
        </div>,
        document.body,
      )}

      {confirmOut && (
        <ConfirmDialog
          title={t('Sign out of Cloud Sync?')}
          message={st.pending === 1
            ? t('1 change has not been uploaded yet. It stays on this device and syncs when you sign back in.')
            : st.pending
            ? t('{n} changes have not been uploaded yet. They stay on this device and sync when you sign back in.', { n: st.pending })
            : t('Your data stays on this device. Changes sync again when you sign back in.')}
          confirmLabel={t('Sign Out')}
          onCancel={() => setConfirmOut(false)}
          onConfirm={() => { setConfirmOut(false); auth.signOut() }}
        />
      )}
      {auth.switchPending && (
        <ConfirmDialog
          destructive
          title={t('Use this account?')}
          message={t('The data on this device belongs to a different KiBase account. Continuing replaces it with the data saved in {who}. The other account\'s cloud copy is not affected.', { who: email || name || t('this account') })}
          confirmLabel={t('Replace')}
          onCancel={auth.cancelSwitch}
          onConfirm={auth.confirmSwitch}
        />
      )}
    </Card>
  )
}
