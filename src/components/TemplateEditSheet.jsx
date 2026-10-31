// Create or edit a saved meal (it lives in Log Meal > My Items > Saved Meals).
// `template` is the meal to edit, or null to build a new one from scratch.
//
// Meal Divider: cooked a big batch? Add everything that went into the pot,
// then divide it into N portions. The meal is saved as ONE portion: every
// ingredient's weight is divided by N, so logging it later is a single tap.
// Leave it at 1 portion to save the ingredients exactly as entered.
import { useRef, useState } from 'react'
import { ZERO, add, scale, num, fmt0, divideBatch } from '../lib/calc.js'
import { toPicked, toItems } from '../lib/picked.js'
import {
  Card, SectionTitle, Sheet, TextInput, MacroSummary, ConfirmDialog,
  buttonBg, focusRing, muted, faint, accentText,
} from './ui.jsx'
import { FoodPicker, PickedList } from './FoodPicker.jsx'
import { t } from '../lib/i18n.js'

const round1 = (n) => Math.round(n * 10) / 10

export default function TemplateEditSheet({ template, foods, customFoods, templates, onSave, onDelete, onClose, onAddToMyItems }) {
  const creating = !template
  const [name, setName] = useState(template?.name ?? '')
  const [picked, setPicked] = useState(() => (template ? toPicked(template.items) : []))
  const [portionsText, setPortionsText] = useState('1')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const initial = useRef(JSON.stringify({ name, picked, portionsText }))
  const dirty = JSON.stringify({ name, picked, portionsText }) !== initial.current // unsaved edits: closing by swipe asks first

  const totals = picked.reduce((sum, p) => add(sum, scale(p.food, num(p.grams))), ZERO)
  const rawGrams = picked.reduce((g, p) => g + num(p.grams), 0)
  const portions = Math.max(Math.round(num(portionsText)), 1)
  const { portionGrams, perPortion } = divideBatch(totals, rawGrams, portions)
  const canSave = name.trim() && picked.length > 0 && picked.every((p) => num(p.grams) > 0)

  const stepPortions = (delta) => setPortionsText(String(Math.max(portions + delta, 1)))

  const save = () => {
    const items = toItems(picked).map((item) => (portions > 1 ? { ...item, grams: round1(item.grams / portions) } : item))
    onSave({ ...template, id: template?.id ?? crypto.randomUUID(), name: name.trim(), items })
    onClose()
  }

  return (
    <Sheet
      title={t(creating ? 'New Meal' : 'Edit Saved Meal')} onClose={onClose} dirty={dirty} z="z-50"
      action={<button onClick={save} disabled={!canSave} className={`font-semibold disabled:opacity-35 ${focusRing} ${accentText}`}>{t('Save')}</button>}
    >
      <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Meal name')} aria-label={t('Meal name')} />

      <Card className="space-y-3.5">
        <SectionTitle>{t('Ingredients')}</SectionTitle>
        {picked.length === 0 && (
          <p className={`text-sm ${muted}`}>
            {t(creating ? 'Add ingredients from the list below to build this meal.' : 'Add at least one ingredient to keep this meal.')}
          </p>
        )}
        <PickedList
          picked={picked} setPicked={setPicked}
          picker={{ foods, customFoods, templates: templates.filter((x) => x.id !== template?.id) }}
        />
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <SectionTitle>{t(portions > 1 ? 'Whole Batch' : 'Total')}</SectionTitle>
          <p className={`text-2xl font-bold tabular-nums ${accentText}`}>
            {fmt0(totals.calories)} <span className={`text-xs font-normal ${muted}`}>{t('kcal')}</span>
          </p>
        </div>
        <div className="mt-2"><MacroSummary macros={totals} /></div>
      </Card>

      {/* ---- Meal Divider ---- */}
      <Card className="space-y-3.5">
        <SectionTitle>{t('Meal Divider')}</SectionTitle>
        <p className={`text-[13px] ${muted}`}>
          {t('Cooked a big batch? Add everything that went into it, then divide it. The meal is saved as one portion.')}
        </p>
        <div className="flex items-center justify-center gap-5">
          <button
            type="button" onClick={() => stepPortions(-1)} disabled={portions <= 1} aria-label={t('Fewer portions')}
            className={`flex size-11 items-center justify-center rounded-full text-2xl leading-none disabled:opacity-35 ${buttonBg} ${focusRing} ${accentText}`}
          >
            −
          </button>
          <div className="text-center">
            <input
              inputMode="numeric" value={portionsText}
              onChange={(e) => setPortionsText(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={() => setPortionsText(String(portions))}
              aria-label={t('Number of portions')}
              className="w-20 bg-transparent text-center text-4xl font-bold tabular-nums outline-none"
            />
            <p className={`text-xs ${muted}`}>{t(portions === 1 ? 'portion' : 'portions')}</p>
          </div>
          <button
            type="button" onClick={() => stepPortions(1)} aria-label={t('More portions')}
            className={`flex size-11 items-center justify-center rounded-full bg-royal text-2xl leading-none text-on-accent transition active:scale-95 neu:shadow-(--neu-raised-sm) ${focusRing}`}
          >
            +
          </button>
        </div>
        {portions > 1 && rawGrams > 0 && (
          <div className="space-y-1.5 border-t border-black/5 pt-3 dark:border-white/10 neu:border-(--neu-line)">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{t('One Portion')}</span>
              <span className={`text-sm tabular-nums ${muted}`}>{t('≈ {n} g each', { n: fmt0(portionGrams) })}</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${accentText}`}>
              {fmt0(perPortion.calories)} <span className={`text-xs font-normal ${muted}`}>{t('kcal')}</span>
            </p>
            <MacroSummary macros={perPortion} />
            <p className={`text-xs ${faint}`}>{t('Saved as one portion: every weight is divided by {n}.', { n: portions })}</p>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <SectionTitle>{t('Add Ingredients')}</SectionTitle>
        <FoodPicker
          foods={foods} customFoods={customFoods}
          templates={templates.filter((x) => x.id !== template?.id)}
          picked={picked} setPicked={setPicked}
          onAddToMyItems={onAddToMyItems}
        />
      </Card>

      {!creating && (
        <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-sm font-medium text-fat-deep dark:text-fat">
          {t('Delete saved meal')}
        </button>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t('Delete {name}?', { name: template.name })}
          message={t('Meals you already logged from it are not affected.')}
          confirmLabel={t('Delete')}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { onDelete(template.id); onClose() }}
        />
      )}
    </Sheet>
  )
}
