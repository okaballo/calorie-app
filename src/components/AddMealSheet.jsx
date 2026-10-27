// Log Meal: pick foods or saved meals, adjust grams, and the totals update
// live from each item's per-100 g values. The picker lives in FoodPicker.jsx.
//
// Edit mode: pass `meal` (an already logged meal). Its items are loaded into
// the same picker list, so you can append items from the Database or My
// Items, change grams or remove items. Save hands back the SAME meal (same
// id, date and tracking day) with the new items; App swaps it into the list
// and every total derived from meals updates on the next render.
import { useState } from 'react'
import { ZERO, add, scale, num, fmt0, fmt1 } from '../lib/calc.js'
import { Card, SectionTitle, Sheet, TextInput, focusRing, muted, accentText, carbsText, fatText } from './ui.jsx'
import { FoodPicker, PickedList } from './FoodPicker.jsx'
import { toPicked, toItems } from '../lib/picked.js'
import { t } from '../lib/i18n.js'

/** Outlined dashed shortcut button (custom meal / meal divider). */
export const ToolButton = ({ onClick, icon, children }) => (
  <button
    onClick={onClick}
    type="button"
    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-royal/50 px-3 py-2.5 text-center text-[13px] leading-tight font-semibold text-balance transition active:bg-royal/10 ${focusRing} ${accentText}`}
  >
    <span aria-hidden="true" className="text-lg leading-none">{icon}</span>
    <span>{children}</span>
  </button>
)

export default function AddMealSheet({
  foods, customFoods, templates, onSave, onClose, onCreateCustom, onEditCustom, onEditTemplate, onOpenDivider, meal,
}) {
  const editing = Boolean(meal)
  const [name, setName] = useState(meal?.name ?? '')
  const [picked, setPicked] = useState(() => (meal ? toPicked(meal.items) : []))

  const totals = picked.reduce((sum, p) => add(sum, scale(p.food, num(p.grams))), ZERO)
  const canSave = picked.length > 0 && picked.every((p) => num(p.grams) > 0)

  // Used when the name field is left empty: each saved meal card by its name
  // (once), each single item by its own name, e.g. "Oat bowl, Protein shake".
  const autoName = [...new Set(picked.map((p) => (p.group ? p.groupName : t(p.food.name))))]
    .filter(Boolean)
    .join(', ')

  const save = () => {
    onSave(
      editing
        ? { ...meal, name: name.trim() || autoName, items: toItems(picked) } // keeps id, date, day
        : { id: crypto.randomUUID(), name: name.trim() || autoName, date: new Date().toISOString(), items: toItems(picked) },
    )
    onClose()
  }

  return (
    <Sheet
      title={t(editing ? 'Edit Meal' : 'Log Meal')}
      variant="modal"
      onClose={onClose}
      action={
        <button onClick={save} disabled={!canSave} className={`font-semibold disabled:opacity-35 ${accentText}`}>{t('Save')}</button>
      }
    >
      {/* The placeholder previews the name the meal gets if this stays empty. */}
      <TextInput
        value={name} onChange={(e) => setName(e.target.value)}
        placeholder={autoName || t('Meal name (optional)')} aria-label={t('Meal name (optional)')}
      />

      {picked.length > 0 && (
        <>
          <Card className="space-y-3.5">
            <SectionTitle>{t(editing ? 'Items in This Meal' : 'In This Meal')}</SectionTitle>
            <PickedList picked={picked} setPicked={setPicked} picker={{ foods, customFoods, templates }} />
          </Card>

          <Card>
            <div className="flex items-baseline justify-between">
              <SectionTitle>{t('Meal Total')}</SectionTitle>
              <p className={`text-3xl font-bold tabular-nums ${accentText}`}>
                {fmt0(totals.calories)} <span className={`text-xs font-normal ${muted}`}>{t('kcal')}</span>
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 text-center">
              {[['Protein', totals.protein, accentText], ['Carbs', totals.carbs, carbsText], ['Fats', totals.fat, fatText]].map(
                ([label, value, color]) => (
                  <div key={label}>
                    <p className={`font-semibold tabular-nums ${color}`}>{fmt1(value)} {t('g')}</p>
                    <p className={`text-xs ${muted}`}>{t(label)}</p>
                  </div>
                ),
              )}
            </div>
          </Card>
        </>
      )}

      {editing && <p className={`-mb-1 px-1 text-xs ${muted}`}>{t('Add more items below. Totals update as you go.')}</p>}
      <Card className="space-y-3">
        <FoodPicker
          foods={foods} customFoods={customFoods} templates={templates}
          picked={picked} setPicked={setPicked}
          onEditCustom={onEditCustom} onEditTemplate={onEditTemplate}
          actions={
            <div className="grid grid-cols-2 gap-2">
              <ToolButton onClick={onCreateCustom} icon="+">{t('Create a custom meal')}</ToolButton>
              <ToolButton onClick={onOpenDivider} icon="÷">{t('Meal Divider')}</ToolButton>
            </div>
          }
        />
      </Card>
    </Sheet>
  )
}
