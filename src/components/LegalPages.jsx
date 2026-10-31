// Privacy Policy and Terms & Conditions: a small list card for the Profile tab
// that opens each document in a full page. The text lives in lib/legal.js.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { Card, Sheet, ChevronIcon, divider, muted, faint, accentText } from './ui.jsx'
import { PRIVACY, TERMS, LEGAL_UPDATED, CONTACT_EMAIL } from '../lib/legal.js'
import { t } from '../lib/i18n.js'

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className={`size-5 ${accentText}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9.5 12 2 2 3.5-4" />
  </svg>
)
const DocIcon = () => (
  <svg viewBox="0 0 24 24" className={`size-5 ${accentText}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" />
  </svg>
)

/** One document, rendered from the data in legal.js. */
export function LegalDoc({ doc, onClose, z = 'z-[55]' }) {
  return (
    <Sheet title={t(doc.title)} closeLabel="Close" onClose={onClose} z={z}>
      {/* The text is English only for now, so it stays left-to-right even in Arabic. */}
      <article dir="ltr" lang="en" className="space-y-6 pb-8 text-start">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
          <p className={`text-sm ${faint}`}>Last updated: {LEGAL_UPDATED}</p>
        </header>
        {doc.intro.map((p) => <p key={p} className={`text-[15px] leading-relaxed ${muted}`}>{p}</p>)}
        {doc.sections.map((s) => (
          <section key={s.h} className="space-y-2.5">
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p?.map((p) => <p key={p} className={`text-[15px] leading-relaxed ${muted}`}>{p}</p>)}
            {s.ul && (
              <ul className={`list-disc space-y-1.5 ps-5 text-[15px] leading-relaxed ${muted}`}>
                {s.ul.map((li) => <li key={li}>{li}</li>)}
              </ul>
            )}
            {s.after?.map((p) => <p key={p} className={`text-[15px] leading-relaxed ${muted}`}>{p}</p>)}
            {s.email && (
              <a href={`mailto:${CONTACT_EMAIL}`} className={`inline-block text-[15px] font-medium break-all underline-offset-2 hover:underline ${accentText}`}>{CONTACT_EMAIL}</a>
            )}
          </section>
        ))}
      </article>
    </Sheet>
  )
}

/** Two rows on the Profile tab: Privacy Policy and Terms & Conditions. */
export function LegalCard() {
  const [open, setOpen] = useState(null) // 'privacy' | 'terms' | null
  const rows = [
    { id: 'privacy', label: 'Privacy Policy', icon: <ShieldIcon /> },
    { id: 'terms', label: 'Terms & Conditions', icon: <DocIcon /> },
  ]
  const doc = open === 'privacy' ? PRIVACY : open === 'terms' ? TERMS : null
  return (
    <Card className={`divide-y overflow-hidden p-0! ${divider}`}>
      {rows.map((r) => (
        <button
          key={r.id} type="button" onClick={() => setOpen(r.id)}
          className="flex w-full items-center gap-3 p-[18px] text-start transition-colors active:bg-black/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-royal dark:active:bg-white/5 dark:focus-visible:outline-lilac"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-royal/15 dark:bg-royal/25">{r.icon}</span>
          <span className="min-w-0 flex-1 font-semibold">{t(r.label)}</span>
          <ChevronIcon className={`h-5 w-5 ${faint}`} />
        </button>
      ))}
      {/* Portal: the Profile page sits on a sliding track; a fixed page inside it would be clipped. */}
      {createPortal(
        <div data-no-swipe>
          <AnimatePresence>{doc && <LegalDoc key={open} doc={doc} onClose={() => setOpen(null)} />}</AnimatePresence>
        </div>,
        document.body,
      )}
    </Card>
  )
}
