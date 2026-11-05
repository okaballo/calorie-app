// Profile tab: photo, personal info, themes, one settings list (language,
// Plan & Goals), and backup & restore of all saved data.
import { useRef, useState } from 'react'
import { fmt0 } from '../lib/calc.js'
import { toAvatarDataUrl } from '../lib/image.js'
import { applyBackup, exportBackup, parseBackup } from '../lib/backup.js'
import { revealTheme } from '../lib/theme.js'
import {
  Card, SectionTitle, PageTitle, TextInput, FieldRow, GlassSwitch, Avatar, CheckIcon, ChevronIcon,
  ConfirmDialog, focusRing, divider, muted, faint, accentText,
} from '../components/ui.jsx'
import { locale, t } from '../lib/i18n.js'
import { CloudSyncCard } from '../components/CloudSync.jsx'
import { LegalCard } from '../components/LegalPages.jsx'

// Theme choices: the value that is saved and its label (translated).
// Neumorphism is English-only for now, so it is hidden in Arabic.
const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'neumorphism', label: 'Neumorphism', englishOnly: true },
  { value: 'neumorphism-dark', label: 'Dark Neumorphism', englishOnly: true },
]

// Colours of each theme's thumbnail. Fixed on purpose: a thumbnail shows
// its own theme whatever theme is active.
const PREVIEW = {
  light: {
    bg: '#f7f7f8', card: '#ffffff', border: '0.5px solid rgba(0,0,0,0.07)',
    shadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 14px -8px rgba(0,0,0,0.2)',
    accent: '#7851a9', track: 'rgba(120,81,169,0.18)', ink: '#18181b', line: '#d4d4d8',
  },
  dark: {
    bg: '#000000', card: '#0e0e11', border: '0.5px solid rgba(255,255,255,0.1)', shadow: 'none',
    accent: '#b58ff2', track: 'rgba(181,143,242,0.2)', ink: '#ffffff', line: '#3f3f46',
  },
  neumorphism: {
    bg: '#e4e8ee', card: '#e4e8ee', border: '0.5px solid rgba(255,255,255,0.6)',
    shadow: '4px 4px 9px #bec5d1, -4px -4px 9px #ffffff',
    accent: '#2a2f3d', track: 'rgba(42,47,61,0.14)', ink: '#2a2f3d', line: '#c3c9d4',
  },
  'neumorphism-dark': {
    bg: '#25282f', card: '#25282f', border: '0.5px solid rgba(255,255,255,0.06)',
    shadow: '4px 4px 9px #15171c, -4px -4px 9px #333741',
    accent: '#e6e9f0', track: 'rgba(230,233,240,0.16)', ink: '#e6e9f0', line: '#3d424d',
  },
}

/** A tiny card in a theme's colours: a progress ring and two lines of text. */
const PreviewScene = ({ p, className = '', style }) => (
  <span aria-hidden="true" className={`absolute inset-0 ${className}`} style={{ background: p.bg, ...style }}>
    <span
      className="absolute inset-3 flex items-center gap-2.5 rounded-xl px-3"
      style={{ background: p.card, boxShadow: p.shadow, border: p.border }}
    >
      <span
        className="size-7 shrink-0 -rotate-45 rounded-full border-[3.5px]"
        style={{ borderColor: p.accent, borderBottomColor: p.track, borderLeftColor: p.track }}
      />
      <span className="flex-1 space-y-1.5">
        <span className="block h-1.5 w-4/5 rounded-full" style={{ background: p.ink }} />
        <span className="block h-1.5 w-1/2 rounded-full" style={{ background: p.line }} />
      </span>
    </span>
  </span>
)

/** Thumbnail of a theme. System is split: light on the left, dark on the right. */
const ThemePreview = ({ theme }) => (
  <span className="relative block h-[76px] overflow-hidden rounded-[14px] ring-[0.5px] ring-black/10 dark:ring-white/15 neu:ring-(--neu-edge)">
    {theme === 'system' ? (
      <>
        <PreviewScene p={PREVIEW.light} />
        <PreviewScene p={PREVIEW.dark} style={{ clipPath: 'inset(0 0 0 50%)' }} />
      </>
    ) : (
      <PreviewScene p={PREVIEW[theme]} />
    )}
  </span>
)

/** Themes: one thumbnail per theme. The chosen one gets an accent outline
 *  and a filled check, so the choice never rests on colour alone. */
function ThemePicker({ theme, onTheme, lang }) {
  const choices = THEMES.filter((c) => !(c.englishOnly && lang === 'ar'))
  // In Arabic, Neumorphism displays as Light and Dark Neumorphism as Dark (see App).
  const shown = choices.some((c) => c.value === theme) ? theme : theme === 'neumorphism-dark' ? 'dark' : 'light'
  return (
    <Card className="space-y-3">
      <div>
        <SectionTitle>{t('Themes')}</SectionTitle>
        <p className={`mt-1 text-sm ${muted}`}>{t('System follows your device’s light or dark setting.')}</p>
      </div>
      <div role="group" aria-label={t('Themes')} className={`grid gap-3 ${choices.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {choices.map(({ value, label }) => {
          const selected = value === shown
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={(e) => revealTheme(value, lang === 'ar', e.currentTarget.firstElementChild, () => onTheme(value))}
              className={`flex flex-col gap-2 rounded-[18px] p-1 text-start transition active:scale-[0.97] ${focusRing}`}
            >
              <span className={`block rounded-[16px] p-[3px] ring-2 transition-colors ${selected ? 'ring-royal dark:ring-lilac' : 'ring-transparent hover:ring-zinc-300 dark:hover:ring-white/20'}`}>
                <ThemePreview theme={value} />
              </span>
              <span className="flex min-h-6 items-center gap-2 px-1">
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                  selected ? 'bg-royal text-white dark:bg-lilac dark:text-black' : 'border-[1.5px] border-zinc-300 dark:border-white/25'
                }`}>
                  {selected && <CheckIcon className="size-3" strokeWidth={3.5} />}
                </span>
                <span className={`text-[15px] leading-tight text-balance ${selected ? 'font-semibold' : 'font-medium'}`}>{t(label)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

/** Plain tinted button for the backup card. It sits in the content layer, so
 *  it uses no Liquid Glass; the Royal Purple icon carries the accent.
 *  `danger` (Restore, which overwrites data) is soft red in Neumorphism. */
const BackupAction = ({ icon, danger = false, children, ...props }) => (
  <button
    type="button"
    {...props}
    className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-black/5 bg-royal/[0.07] px-3 py-3.5 text-sm font-semibold
       transition active:scale-[0.97] active:opacity-90 dark:border-white/10 dark:bg-white/[0.05] neu:border-(--neu-edge) neu:bg-canvas neu:shadow-(--neu-raised-sm) neu:active:shadow-(--neu-inset) ${danger ? 'neu:text-fat-deep' : ''} ${focusRing}`}
  >
    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-royal/15 dark:bg-royal/25 ${danger ? 'neu:bg-fat-deep/12' : 'neu:bg-royal/8'}`}>
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${accentText} ${danger ? 'neu:text-fat-deep' : ''}`} fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon}
      </svg>
    </span>
    {children}
  </button>
)

/** Backup & Restore: export all data to a JSON file, or replace it from one. */
function BackupCard() {
  const fileInput = useRef(null)
  const [pending, setPending] = useState(null) // parsed backup awaiting confirmation
  const [status, setStatus] = useState(null)   // { error: boolean, text: string }

  const exportData = () => {
    try {
      exportBackup()
      setStatus({ error: false, text: 'Backup saved.' })
    } catch {
      setStatus({ error: true, text: "The backup couldn't be created. Try again." })
    }
  }

  const pickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be picked again later
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
      setStatus(null)
    } catch (err) {
      setStatus({ error: true, text: err?.message || "This file isn't a KiBase backup." })
    }
  }

  // Every tab reads its data from storage on load, so a reload shows the
  // restored data everywhere at once.
  const restore = () => {
    try {
      applyBackup(pending.data)
      window.location.reload()
    } catch {
      setPending(null)
      setStatus({ error: true, text: "The backup couldn't be restored. Your data was not changed." })
    }
  }

  const exported = pending?.exportedAt && !Number.isNaN(Date.parse(pending.exportedAt))
    ? new Date(pending.exportedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <Card className="space-y-3">
      <div>
        <SectionTitle>{t('Backup & Restore')}</SectionTitle>
        <p className={`mt-1 text-sm ${muted}`}>
          {t('Your data lives only on this device. Save a backup file to keep it safe.')}
        </p>
      </div>
      <div className="flex gap-3">
        <BackupAction onClick={exportData} icon={<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 12a9 3 0 0 0 5 2.69"/><path d="M21 9.3V5"/><path d="M3 5v14a9 3 0 0 0 6.47 2.88"/><path d="M12 12v4h4"/><path d="M13 20a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L12 16"/></>}>
          {t('Back Up Data')}
        </BackupAction>
        <BackupAction danger onClick={() => fileInput.current?.click()} icon={<><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h2"/><path d="M20 8v11a2 2 0 0 1-2 2h-2"/><path d="m9 15 3-3 3 3"/><path d="M12 12v9"/></>}>
          {t('Restore Data')}
        </BackupAction>
      </div>
      {status && (
        <p role="status" className={`text-sm ${status.error ? 'text-fat-deep dark:text-fat' : muted}`}>{t(status.text)}</p>
      )}
      <input ref={fileInput} type="file" accept="application/json,.json" onChange={pickFile} className="hidden" />

      {pending && (
        <ConfirmDialog
          destructive
          title={t('Restore From Backup?')}
          message={
            t('This backup has {meals} meals, {weights} weight entries and {workouts} workouts.', pending.counts) +
            (exported ? ' ' + t('Saved on {date}.', { date: exported }) : '') + ' ' +
            t('Restoring will overwrite all data on this device. This cannot be undone.')
          }
          confirmLabel={t('Restore')}
          onCancel={() => setPending(null)}
          onConfirm={restore}
        />
      )}
    </Card>
  )
}

export default function Profile({ profile, onChange, avatar, onAvatar, theme, onTheme, lang, onLang, onOpenPlan }) {
  const fileInput = useRef(null)
  const [error, setError] = useState('')

  // Shrinks the photo to a 256 px JPEG and saves it as base64 in localStorage.
  const pickPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same photo be picked again later
    if (!file) return
    try {
      onAvatar(await toAvatarDataUrl(file))
      setError('')
    } catch {
      setError("That image couldn't be loaded. Try a JPEG or PNG.")
    }
  }

  return (
    <>
      <PageTitle>{t('Profile')}</PageTitle>

      {/* ---- Photo ---- */}
      <Card className="flex flex-col items-center gap-3 text-center">
        <button type="button" onClick={() => fileInput.current?.click()} aria-label={t('Change profile picture')} className={`rounded-full ${focusRing}`}>
          <Avatar src={avatar} name={profile.name} size={92} />
        </button>
        <p className="max-w-full break-words text-lg font-semibold">{profile.name?.trim() || t('Your name')}</p>
        <div className="flex gap-2 text-sm font-medium">
          <button type="button" onClick={() => fileInput.current?.click()} className={`min-h-11 rounded-lg px-3 ${focusRing} ${accentText}`}>
            {t(avatar ? 'Change Photo' : 'Add Photo')}
          </button>
          {avatar && <button type="button" onClick={() => onAvatar(null)} className={`min-h-11 rounded-lg px-3 ${focusRing} ${faint}`}>{t('Remove Photo')}</button>}
        </div>
        {error && <p role="alert" className="text-sm text-fat-deep dark:text-fat">{t(error)}</p>}
        <input ref={fileInput} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
      </Card>

      {/* ---- Personal info ---- */}
      <Card className="space-y-3">
        <SectionTitle>{t('Personal Info')}</SectionTitle>
        <TextInput
          value={profile.name ?? ''} onChange={(e) => onChange({ name: e.target.value })}
          placeholder={t('Name')} aria-label={t('Name')} autoComplete="given-name"
        />
        {/* Age is shared with the TDEE calculator. */}
        <FieldRow label={t('Age')} unit={t('yrs')} inputMode="numeric" value={profile.age} onChange={(e) => onChange({ age: e.target.value })} />
      </Card>

      {/* ---- Cloud Sync (hidden in builds without Supabase settings) ---- */}
      <CloudSyncCard />

      {/* ---- Themes ---- */}
      <ThemePicker theme={theme} onTheme={onTheme} lang={lang} />

      {/* ---- Settings: language and Plan & Goals in one grouped list ---- */}
      <Card className={`divide-y overflow-hidden p-0! ${divider}`}>
        {/* Language: Arabic also switches the layout to right-to-left. */}
        <div className="flex min-h-14 items-center justify-between gap-3 px-[18px] py-2">
          <SectionTitle>{t('Language')}</SectionTitle>
          <GlassSwitch
            label={t('Language')}
            value={lang === 'ar' ? 1 : 0}
            onChange={(v) => onLang(v ? 'ar' : 'en')}
            left={{ icon: 'En' }}
            right={{ icon: 'ع' }}
          />
        </div>

        {/* Plan & Goals (opens the TDEE calculator sheet). */}
        <button
          type="button" onClick={onOpenPlan}
          className="flex w-full items-center gap-3 p-[18px] text-start transition-colors active:bg-black/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-royal dark:active:bg-white/5 dark:focus-visible:outline-lilac"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal/15 dark:bg-royal/25">
            <svg viewBox="0 0 24 24" className={`h-5 w-5 ${accentText}`} fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t('Plan & Goals')}</span>
            <span className={`block truncate text-sm ${muted}`}>
              {t('TDEE calculator · {kcal} kcal · {protein} g protein', {
                kcal: fmt0(Number(profile.calorieGoal) || 0),
                protein: fmt0(Number(profile.proteinGoal) || 0),
              })}
            </span>
          </span>
          <ChevronIcon className={`h-5 w-5 ${faint}`} />
        </button>
      </Card>

      {/* ---- Backup & Restore ---- */}
      <BackupCard />

      {/* ---- Privacy Policy and Terms ---- */}
      <LegalCard />
    </>
  )
}
