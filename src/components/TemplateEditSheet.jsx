// Edit a saved meal template: rename it, change each ingredient's grams,
// remove ingredients, or append new ones from the Database / My Items.
// Opened from the ">" arrow in Log Meal > My Items.
import { useRef, useState } from 'react'
import { ZERO, add, scale, num, fmt0 } from '../lib/calc.js'
import { toPicked, toItems } from '../lib/picked.js'
import {
  Card, SectionTitle, Sheet, TextInput, MacroSummary, ConfirmDialog,
  muted, accentText,
} from './ui.jsx'
import { FoodPicker, PickedList } from './FoodPicker.jsx'
import { t } from '../lib/i18n.js'

export default function TemplateEditSheet({ template, foods, customFoods, templates, onSave, onDelete, onClose }) {
  const [name, setName] = useState(template.name)
  const [picked, setPicked] = useState(() => toPicked(template.items))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const initial = useRef(JSON.stringify({ name, picked }))
  const dirty = JSON.stringify({ name, picked }) !== initial.current // unsaved edits: closing by swipe asks first

  const totals = picked.reduce((sum, p) => add(sum, scale(p.food, num(p.grams))), ZERO)
  const canSave = name.trim() && picked.length > 0 && picked.every((p) => num(p.grams) > 0)

  const save = () => {
    onSave({ ...template, name: name.trim(), items: toItems(picked) })
    onClose()
  }

  return (
    <Sheet
      title={t('Edit Saved Meal')} onClose={onClose} dirty={dirty} z="z-50"
      action={<button onClick={save} disabled={!canSave} className={`font-semibold disabled:opacity-35 ${accentText}`}>{t('Save')}</button>}
    >
      <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Template name')} aria-label={t('Template name')} />

      <Card className="space-y-3.5">
        <SectionTitle>{t('Ingredients')}</SectionTitle>
        {picked.length === 0 && <p className={`text-sm ${muted}`}>{t('Add at least one ingredient to keep this meal.')}</p>}
        <PickedList
          picked={picked} setPicked={setPicked}
          picker={{ foods, customFoods, templates: templates.filter((x) => x.id !== template.id) }}
        />
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <SectionTitle>{t('Total')}</SectionTitle>
          <p className={`text-2xl font-bold tabular-nums ${accentText}`}>
            {fmt0(totals.calories)} <span className={`text-xs font-normal ${muted}`}>{t('kcal')}</span>
          </p>
        </div>
        <div className="mt-2"><MacroSummary macros={totals} /></div>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Add Ingredients</SectionTitle>
        <FoodPicker
          foods={foods} customFoods={customFoods}
          templates={templates.filter((x) => x.id !== template.id)}
          picked={picked} setPicked={setPicked}
        />
      </Card>

      <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-sm font-medium text-fat-deep dark:text-fat">
        {t('Delete saved meal')}
      </button>

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
