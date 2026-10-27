// Weight tab: log a weight with a date and see the trend line.
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { num, fmt1, dayKey } from '../lib/calc.js'
import {
  Card, SectionTitle, PageTitle, PrimaryButton, StatTile, FieldRow, TrashIcon, EmptyState,
  focusRing, focusWithin, hitSlopY, faint, accentText, fieldBg, useRowMotion,
} from '../components/ui.jsx'
import { LineChart } from '../components/Charts.jsx'
import { t, locale } from '../lib/i18n.js'

export default function Weight({ entries, onAdd, onDelete }) {
  const rowMotion = useRowMotion()
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(dayKey())

  const kg = num(weight)
  const canSave = kg > 20 && kg < 400 && date && date <= dayKey()

  // entries are kept sorted oldest first
  const latest = entries[entries.length - 1]
  const change = entries.length > 1 ? latest.kg - entries[0].kg : null

  const save = () => {
    onAdd({ id: crypto.randomUUID(), date, kg })
    setWeight('')
    setDate(dayKey())
  }

  return (
    <>
      <PageTitle>{t('Weight')}</PageTitle>

      <div className="flex gap-4">
        <StatTile title={t('Current')} value={latest ? fmt1(latest.kg) : '–'} unit={t('kg')} />
        <StatTile title={t('Change')} value={change === null ? '–' : (change > 0 ? '+' : '') + fmt1(change)} unit={t('kg')} />
      </div>

      <Card className="space-y-3.5">
        <SectionTitle>{t('Log Weight')}</SectionTitle>
        <FieldRow label={t('Weight')} unit={t('kg')} placeholder="0.0" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <label className={`flex items-center rounded-xl px-3.5 py-2.5 ${focusWithin} ${fieldBg}`}>
          <span className="flex-1">{t('Date')}</span>
          <input
            type="date" value={date} max={dayKey()}
            onChange={(e) => setDate(e.target.value)}
            className={`bg-transparent text-end outline-none ${accentText}`}
          />
        </label>
        <PrimaryButton onClick={save} disabled={!canSave}>{t('Save Entry')}</PrimaryButton>
      </Card>

      <Card>
        <SectionTitle>{t('Trend')}</SectionTitle>
        {entries.length === 0 ? (
          <EmptyState icon={<path d="M4 4v16h16M7.5 15l3.5-4 3 2.5L19 8" />}>
            {t('Your trend line appears after your first entry.')}
          </EmptyState>
        ) : (
          <div className="mt-3">
            <LineChart points={entries.map((e) => ({ date: e.date, value: e.kg }))} />
          </div>
        )}
      </Card>

      {entries.length > 0 && (
        <Card>
          <SectionTitle>{t('History')}</SectionTitle>
          <ul className="relative mt-2">
            <AnimatePresence initial={false} mode="popLayout">
            {[...entries].reverse().map((entry) => (
              <motion.li key={entry.id} {...rowMotion} className="flex items-center py-1.5">
                <span className="flex-1">
                  {new Date(entry.date).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className={`tabular-nums ${accentText}`}>{fmt1(entry.kg)} {t('kg')}</span>
                <button
                  type="button" onClick={() => onDelete(entry.id)} aria-label={t('Delete entry')}
                  className={`${hitSlopY} ms-3 rounded-md p-1 transition active:scale-90 ${focusRing} ${faint}`}
                >
                  <TrashIcon />
                </button>
              </motion.li>
            ))}
            </AnimatePresence>
          </ul>
        </Card>
      )}
    </>
  )
}
