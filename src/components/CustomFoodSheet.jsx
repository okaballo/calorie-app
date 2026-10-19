// Create or edit a custom item. Values are per 100 g; when logging later you
// only type the grams. Pass `food` to edit an existing item.
import { useState } from 'react'
import { num, fmt0 } from '../lib/calc.js'
import { Card, SectionTitle, FieldRow, PrimaryButton, Sheet, TextInput, ConfirmDialog, muted } from './ui.jsx'
import { t } from '../lib/i18n.js'

const text = (n) => (n === undefined || n === null ? '' : String(n))

export default function CustomFoodSheet({ food, onSave, onDelete, onClose }) {
  const editing = Boolean(food)
  const [form, setForm] = useState(() => ({
    name: food?.name ?? '',
    protein: text(food?.protein),
    carbs: text(food?.carbs),
    fat: text(food?.fat),
    calories: text(food?.calories),
    serving: text(food?.servingGrams),
    basis: '100', // grams the entered macros refer to
  }))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const protein = num(form.protein)
  const carbs = num(form.carbs)
  const fat = num(form.fat)
  // Calories left empty are derived from the macros (4 / 4 / 9 kcal per gram).
  const estimated = protein * 4 + carbs * 4 + fat * 9
  const calories = form.calories.trim() ? num(form.calories) : estimated

  // No upper limits: any non-negative numbers are accepted.
  const basis = form.basis.trim() ? num(form.basis) : 100
  const canSave = form.name.trim() && basis > 0 && Math.min(calories, protein, carbs, fat) >= 0

  const save = () => {
    const serving = num(form.serving)
    const k = 100 / basis
    onSave({
      ...food, // keeps extra fields, e.g. batch info from the Meal Divider
      id: food?.id ?? crypto.randomUUID(),
      name: form.name.trim(), custom: true,
      // stored per 100 g, whatever amount the values were entered for
      calories: calories * k, protein: protein * k, carbs: carbs * k, fat: fat * k,
      servingGrams: serving > 0 ? serving : undefined, // default grams when logging
    })
    onClose()
  }

  return (
    <Sheet title={t(editing ? 'Edit Custom Item' : 'Custom Meal')} onClose={onClose} z="z-50">
      <Card className="space-y-3.5">
        <SectionTitle>{editing ? t(food.name) : t('Create a custom meal')}</SectionTitle>
        <p className={`text-[13px] ${muted}`}>
          {t('Enter the values for the amount below (100 g by default). When you log it later you only type the grams.')}
        </p>
        <TextInput value={form.name} onChange={set('name')} placeholder={t('Name (e.g. Chicken Rice Bowl)')} />
        <FieldRow label={t('Amount')} unit={t('g')} placeholder="100" value={form.basis} onChange={set('basis')} />
        <FieldRow label={t('Protein')} unit={t('g')} placeholder="0" value={form.protein} onChange={set('protein')} />
        <FieldRow label={t('Carbs')} unit={t('g')} placeholder="0" value={form.carbs} onChange={set('carbs')} />
        <FieldRow label={t('Fats')} unit={t('g')} placeholder="0" value={form.fat} onChange={set('fat')} />
        <FieldRow
          label={t('Calories')} unit={t('kcal')}
          placeholder={estimated > 0 ? fmt0(estimated) : '0'}
          value={form.calories} onChange={set('calories')}
        />
        <p className={`text-xs ${muted}`}>{t('Leave calories empty to calculate them from the macros.')}</p>
        <FieldRow label={t('Portion size')} unit={t('g')} placeholder="100" value={form.serving} onChange={set('serving')} />
        <p className={`text-xs ${muted}`}>{t('Optional. Logging this item starts at one portion instead of 100 g.')}</p>
      </Card>

      <PrimaryButton onClick={save} disabled={!canSave}>{t(editing ? 'Save Changes' : 'Save Custom Meal')}</PrimaryButton>
      {editing && (
        <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-sm font-medium text-fat-deep dark:text-fat">
          {t('Delete item')}
        </button>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={t('Delete {name}?', { name: t(food.name) })}
          message={t('Meals you already logged with it are not affected.')}
          confirmLabel={t('Delete')}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { onDelete(food.id); onClose() }}
        />
      )}
    </Sheet>
  )
}
