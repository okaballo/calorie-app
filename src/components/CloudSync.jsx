// Cloud Sync UI: the card on the Profile tab (status, account, Sync Now, Sign Out),
// the sign-up / log-in sheet (email + password, confirmed by an emailed link) and the
// "Account verified" screen. Google / Apple buttons are kept but switched off. Signing in is optional:
// KiBase keeps working fully offline without an account.
//
// Brand assets: the Apple and Google marks below follow each company's sign-in
// button rules (equal size, black / white Apple button, Google's light / dark
// styles). Before launch, swap the two marks for the official files: Apple Design
// Resources ("Sign in with Apple" logos) and Google's sign-in branding kit.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Card, SectionTitle, Sheet, PrimaryButton, ConfirmDialog, TextInput, buttonBg, fieldBg, focusRing, muted, faint, accentText } from './ui.jsx'
import { useAuth, useSyncStatus } from '../lib/sync/AuthContext.jsx'
import { LegalDoc } from './LegalPages.jsx'
import { PRIVACY, TERMS } from '../lib/legal.js'
import { MAX_LENGTH, emailValid, passwordChecks, passwordStrength, passwordValid } from '../lib/password.js'
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

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

const MailIcon = ({ className = 'size-6' }) => (
  <svg viewBox="0 0 24 24" className={className} {...stroke}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7.5 8 6 8-6" /></svg>
)
const EyeIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" className="size-5" {...stroke}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
)
const CheckDot = ({ ok }) => (
  <span className={`flex size-4 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-500 text-white' : 'border border-zinc-400 dark:border-white/40'}`}>
    {ok && <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5.5 12.5 4 4L18.5 8" /></svg>}
  </span>
)

const BAR_TONE = ['', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']

/** Four bars and a word for how strong the password is, then the four rules with a tick each. */
function PasswordHelp({ password }) {
  const { bars, label } = passwordStrength(password)
  return (
    <div className="space-y-3 px-1">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= bars ? BAR_TONE[bars] : 'bg-black/10 dark:bg-white/15'}`} />
          ))}
        </div>
        <span className={`w-14 text-end text-xs font-semibold ${muted}`} aria-live="polite">{label && t(label)}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2" aria-label={t('Password must have')}>
        {passwordChecks(password).map((c) => (
          <li key={c.id} className={`flex items-center gap-2 text-xs ${c.ok ? '' : muted}`}>
            <CheckDot ok={c.ok} />
            <span>{t(c.label)}<span className="sr-only">{c.ok ? ' ✓' : ''}</span></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ERRORS = {
  offline: 'You are offline. Connect to the internet to continue.',
  invalid: 'Email or password is incorrect.',
  exists: 'This email already has an account. Log in instead.',
  weak: 'Choose a stronger password.',
  rate: 'Too many tries. Please wait a few minutes.',
  emailLimit: 'We cannot send verification emails right now. Please try again later.',
  unknown: 'Something went wrong. Please try again.',
}

/**
 * The sign-up / log-in screen. Creating an account needs a valid email, a password that
 * meets every rule, and the Terms / Privacy box ticked; the account is then confirmed
 * through a link emailed to the person (see the "Check your email" view).
 * Google / Apple sign-in is switched off for now: its buttons are kept below, commented out.
 */
function AuthSheet({ onClose }) {
  const auth = useAuth()
  const [mode, setMode] = useState('signup')     // 'signup' | 'login'
  const [view, setView] = useState('form')       // 'form' | 'sent' (verification email on its way)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [agreed, setAgreed] = useState(false)    // must be ticked before an account can be created
  const [doc, setDoc] = useState(null)           // 'terms' | 'privacy' | null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // const leaving = auth.busy                     // Google / Apple (switched off)
  const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`
  const signup = mode === 'signup'

  const canSubmit = !busy && emailValid(email) && (signup ? passwordValid(password) && agreed : password.length > 0)

  const switchMode = (m) => { setMode(m); setError(null) }

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true); setError(null)
    const res = signup ? await auth.signUpEmail(email, password) : await auth.signInEmail(email, password)
    setBusy(false)
    if (res.error === 'unconfirmed') { setView('sent'); return }
    if (res.error) { setError(res.error); return }
    if (signup) { setPassword(''); setView('sent') }
    // Logged in (or no email check needed): the session arrives and this sheet closes by itself.
  }

  const heading = view === 'sent' ? 'Check your email' : signup ? 'Create your account' : 'Welcome back'
  return (
    <Sheet variant="modal" title={t('Cloud Sync')} closeLabel="Close" onClose={onClose} z="z-[55]">
      <div className="flex flex-col gap-9 px-2 pt-6 pb-6">
        <div className="flex flex-col items-center gap-5 text-center">
          {view === 'sent' ? (
            <span className="flex size-[88px] items-center justify-center rounded-full bg-royal/15 text-royal dark:bg-royal/25 dark:text-lilac"><MailIcon className="size-10" /></span>
          ) : (
            <img src={icon} alt="" className="size-[72px] rounded-[18px] shadow-[0_18px_40px_-14px_rgba(120,81,169,0.75)]" />
          )}
          <h2 className="max-w-[17rem] text-[28px] leading-[1.15] font-bold tracking-tight text-balance">{t(heading)}</h2>
          {view === 'sent' && (
            <p className={`max-w-[18rem] text-[15px] leading-relaxed text-pretty ${muted}`}>
              {t('We sent a verification link to {email}. Open it to finish creating your account.', { email })}
            </p>
          )}
        </div>

        {view === 'sent' ? (
          <button type="button" onClick={() => { setView('form'); setError(null) }} className={`mx-auto block min-h-11 rounded-lg px-3 text-[15px] font-medium ${accentText} ${focusRing}`}>
            {t('Use a different email')}
          </button>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-6">
            {/* Sign up / Log in */}
            <div className={`grid grid-cols-2 gap-1 rounded-xl p-1 ${fieldBg}`}>
              {[['signup', 'Sign Up'], ['login', 'Log In']].map(([m, label]) => (
                <button
                  key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)}
                  className={`min-h-10 rounded-lg text-[15px] font-semibold transition ${focusRing} ${mode === m ? 'bg-white shadow-sm dark:bg-white/12' : muted}`}
                >
                  {t(label)}
                </button>
              ))}
            </div>

            <div className="space-y-3.5">
              <TextInput
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={t('Email')} aria-label={t('Email')} autoComplete="email" inputMode="email"
                autoCapitalize="none" autoCorrect="off" spellCheck={false} className="h-14 text-base"
              />
              <div className="relative">
                <TextInput
                  type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('Password')} aria-label={t('Password')} maxLength={MAX_LENGTH}
                  autoComplete={signup ? 'new-password' : 'current-password'} className="h-14 pe-12 text-base"
                />
                <button
                  type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t('Hide password') : t('Show password')}
                  className={`absolute end-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl ${muted} ${focusRing}`}
                >
                  <EyeIcon off={show} />
                </button>
              </div>
            </div>

            {signup && <PasswordHelp password={password} />}

            {signup && (
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
            )}

            {error && <p role="alert" className="text-center text-sm text-fat-deep dark:text-fat">{t(ERRORS[error] || ERRORS.unknown)}</p>}

            <div className="space-y-3">
              <PrimaryButton type="submit" disabled={!canSubmit} className="flex items-center justify-center gap-2 py-4">
                {busy && <Spinner />}
                {signup ? t('Create Account') : t('Log In')}
              </PrimaryButton>
              {signup && <p className={`text-center text-xs ${faint}`}>{t('We will email you a link to verify your account.')}</p>}
            </div>

            {/* Google / Apple sign-in: switched off until the providers are set up in Supabase.
                To bring them back, uncomment this block (and `leaving` above) and add an "or" divider.
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
            */}
          </form>
        )}
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

/**
 * Full-screen result after the person taps the link in the verification email and lands
 * back in the app: "Account verified" (or "Link expired"). Rendered once, near the root.
 */
export function VerifyResult() {
  const auth = useAuth()
  const reduce = useReducedMotion()
  if (!auth?.configured || !auth.arrival || !auth.ready) return null
  const ok = auth.arrival === 'verified'
  const tone = ok ? 'text-emerald-500' : 'text-amber-500'
  const draw = (delay) => (reduce ? { initial: false } : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.55, delay, ease: 'easeOut' } })
  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-labelledby="verify-title" data-no-swipe
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-10 bg-white px-8 text-center text-zinc-900 dark:bg-black dark:text-white neu:bg-canvas"
    >
      <div className="flex flex-col items-center gap-6">
        <motion.span
          initial={reduce ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className={`flex size-32 items-center justify-center rounded-full ${ok ? 'bg-emerald-500/15' : 'bg-amber-500/15'} ${tone}`}
        >
          <svg viewBox="0 0 64 64" className="size-16" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ok ? (
              <motion.path d="m16 33 11 11 21-24" {...draw(0.25)} />
            ) : (
              <>
                <motion.path d="M32 16v20" {...draw(0.2)} />
                <path d="M32 47.5h.01" />
              </>
            )}
          </svg>
        </motion.span>
        <div className="space-y-3">
          <h1 id="verify-title" className="text-[32px] leading-tight font-bold tracking-tight">{ok ? t('Account verified') : t('Link expired')}</h1>
          <p className={`mx-auto max-w-[19rem] text-base leading-relaxed text-pretty ${muted}`}>
            {ok
              ? (auth.user ? t('Your email is confirmed. Cloud Sync is on and your data is backing up.') : t('Your email is confirmed. Log in from your Profile to turn on Cloud Sync.'))
              : t('This link has expired or was already used. Sign up again, or log in to get a new one.')}
          </p>
        </div>
      </div>
      <PrimaryButton autoFocus onClick={auth.dismissArrival} className="max-w-xs py-4">{t('Continue')}</PrimaryButton>
    </div>,
    document.body,
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
              {provider === 'google' ? <GoogleMark className="size-[18px]" /> : provider === 'apple' ? <AppleMark className="size-[18px]" /> : <MailIcon className="size-[18px]" />}
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
