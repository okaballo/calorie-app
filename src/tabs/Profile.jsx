// Profile tab: photo, personal info, theme and language toggles, and the Plan & Goals menu.
import { useRef, useState } from 'react'
import { fmt0 } from '../lib/calc.js'
import { toAvatarDataUrl } from '../lib/image.js'
import {
  Card, SectionTitle, PageTitle, TextInput, FieldRow, GlassSwitch, SunIcon, MoonIcon, Avatar, ChevronIcon,
  muted, faint, accentText,
} from '../components/ui.jsx'
import { t } from '../lib/i18n.js'

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
        <button onClick={() => fileInput.current?.click()} aria-label={t('Change profile picture')} className="rounded-full">
          <Avatar src={avatar} name={profile.name} size={92} />
        </button>
        <p className="text-lg font-semibold">{profile.name?.trim() || t('Your name')}</p>
        <div className="flex gap-4 text-sm font-medium">
          <button onClick={() => fileInput.current?.click()} className={accentText}>
            {t(avatar ? 'Change photo' : 'Add photo')}
          </button>
          {avatar && <button onClick={() => onAvatar(null)} className={faint}>{t('Remove')}</button>}
        </div>
        {error && <p className="text-sm text-fat-deep dark:text-fat">{t(error)}</p>}
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

      {/* ---- Theme ---- */}
      <Card className="flex items-center justify-between gap-3">
        <SectionTitle>{t('Appearance')}</SectionTitle>
        <GlassSwitch
          label={t('Appearance')}
          value={theme === 'dark' ? 1 : 0}
          onChange={(v) => onTheme(v ? 'dark' : 'light')}
          left={{ icon: <SunIcon className="h-4 w-4" /> }}
          right={{ icon: <MoonIcon className="h-4 w-4" /> }}
        />
      </Card>

      {/* ---- Language: Arabic also switches the layout to right-to-left ---- */}
      <Card className="flex items-center justify-between gap-3">
        <SectionTitle>{t('Language')}</SectionTitle>
        <GlassSwitch
          label={t('Language')}
          value={lang === 'ar' ? 1 : 0}
          onChange={(v) => onLang(v ? 'ar' : 'en')}
          left={{ icon: 'En' }}
          right={{ icon: 'ع' }}
        />
      </Card>

      {/* ---- Plan & Goals (opens the TDEE calculator sheet) ---- */}
      <Card className="p-0">
        <button onClick={onOpenPlan} className="flex w-full items-center gap-3 p-[18px] text-start">
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
    </>
  )
}
