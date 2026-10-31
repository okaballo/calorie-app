// The food picker shared by Log Meal, the Meal Divider and the saved meal editor.
//
//   PickedList      - the chosen items. Single foods are rows with an editable
//                     grams field; a saved meal is ONE card (edit + remove)
//   GroupEditSheet  - opened from a card's pencil: change its ingredients'
//                     grams, remove some, or add more
//   FoodPicker      - Database / My Items lists with "+" buttons that turn
//                     into "− value +" counters once an item is picked
//
// The picked list itself is owned by the parent screen (see lib/picked.js for
// the entry shape), so every screen shares the same behaviour.
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ZERO, add, scale, num, fmt0 } from '../lib/calc.js'
import { STEP_GRAMS, stepFood, scaleGroup, replaceGroup } from '../lib/picked.js'
import {
  Card, SectionTitle, Sheet, MacroSummary, Segmented, SearchInput, AddButton, Stepper, ChevronIcon, PencilIcon,
  PrimaryButton, Chip, ChipRow, focusRing, buttonBg, muted, faint, accentText, fieldBg, divider,
} from './ui.jsx'
import { t, locale, isRTL } from '../lib/i18n.js'
import { useLocalStorage } from '../lib/useLocalStorage.js'

const newKey = () => crypto.randomUUID()

/** Default grams for a newly picked food: its saved portion size, else 100 g. */
const defaultGrams = (food) => String(food.servingGrams > 0 ? food.servingGrams : 100)

const totalsOf = (entries) => entries.reduce((sum, p) => add(sum, scale(p.food, num(p.grams))), ZERO)

/**
 * Chosen items. Single foods are rows with an editable grams field; the
 * items of a saved meal are grouped into one card with edit and remove
 * buttons. `flat` lists every item as a row (used inside the card editor).
 * `picker` ({ foods, customFoods, templates }) feeds the card editor's own
 * picker, so more items can be added to a saved meal.
 */
export function PickedList({ picked, setPicked, picker, flat = false }) {
  const [editing, setEditing] = useState(null) // group id of the card being edited

  // Rows in list order; a saved meal appears once, where its first item is.
  const rows = []
  const seen = new Set()
  for (const p of picked) {
    if (flat || !p.group) rows.push({ key: p.key, entry: p })
    else if (!seen.has(p.group)) {
      seen.add(p.group)
      rows.push({ key: `group-${p.group}`, group: p.group, entries: picked.filter((x) => x.group === p.group) })
    }
  }
  const editingEntries = editing ? picked.filter((p) => p.group === editing) : []

  return (
    <>
      {rows.map((row) =>
        row.group ? (
          <SavedMealCard
            key={row.key} entries={row.entries}
            onEdit={() => setEditing(row.group)}
            onRemove={() => setPicked((list) => list.filter((p) => p.group !== row.group))}
          />
        ) : (
          <PickedRow key={row.key} entry={row.entry} setPicked={setPicked} />
        ),
      )}
      {/* Portal: this list sits inside a sliding sheet, and a fixed-position
          sheet inside a transformed parent would be clipped to it. */}
      {createPortal(
        <AnimatePresence>
          {editingEntries.length > 0 && (
            <GroupEditSheet
              key={editing}
              groupId={editing} entries={editingEntries} picker={picker}
              onSave={(next) => setPicked((list) => replaceGroup(list, editing, next))}
              onClose={() => setEditing(null)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

/** A saved meal in the picked list: name, ingredients, totals, edit and remove. */
function SavedMealCard({ entries, onEdit, onRemove }) {
  const name = entries[0].groupName || t('Saved meal')
  const totals = totalsOf(entries)
  const grams = entries.reduce((g, p) => g + num(p.grams), 0)
  return (
    <div className={`rounded-2xl p-3 ${fieldBg}`}>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className={`text-xs ${muted}`}>
            {t('Saved meal')} · {entries.length === 1 ? t('1 ingredient') : t('{n} ingredients', { n: entries.length })}
            {' · '}{fmt0(grams)} {t('g')}
          </p>
        </div>
        <button onClick={onEdit} aria-label={t('Edit {name}', { name })} className={`p-1 transition active:scale-90 ${accentText}`}>
          <PencilIcon />
        </button>
        <button onClick={onRemove} aria-label={t('Remove {name}', { name })} className={`px-1 text-xl leading-none ${faint}`}>
          ×
        </button>
      </div>
      <p className={`mt-1.5 line-clamp-2 text-xs ${faint}`}>
        {entries.map((p) => `${fmt0(num(p.grams))} ${t('g')} ${t(p.food.name)}`).join(' · ')}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-2 text-xs">
        <span className={`font-semibold tabular-nums ${accentText}`}>{fmt0(totals.calories)} {t('kcal')}</span>
        <MacroSummary macros={totals} />
      </div>
    </div>
  )
}

/**
 * Edits one saved meal card: ingredient grams, removing ingredients and
 * adding more from the Database / My Items. Works on a copy and only writes
 * back on Done. It changes this meal only, not the saved meal in My Items.
 */
function GroupEditSheet({ groupId, entries, picker, onSave, onClose }) {
  const name = entries[0].groupName || t('Saved meal')
  // foodId is dropped so the single-food +/− counters outside never grab a
  // saved meal's ingredient; inside, added foods get their own foodId.
  const [items, setItems] = useState(() => entries.map(({ key, food, grams }) => ({ key, food, grams })))
  const totals = totalsOf(items)
  const canSave = items.every((p) => num(p.grams) > 0)

  const done = () => {
    onSave(items.map(({ key, food, grams }) => ({ key, food, grams, group: groupId, groupName: entries[0].groupName })))
    onClose()
  }

  return (
    <Sheet
      title={name} onClose={onClose} z="z-[55]"
      action={<button onClick={done} disabled={!canSave} className={`font-semibold disabled:opacity-35 ${accentText}`}>{t('Done')}</button>}
    >
      <Card className="space-y-3.5">
        <SectionTitle>{t('Ingredients')}</SectionTitle>
        {items.length === 0
          ? <p className={`text-sm ${muted}`}>{t('No ingredients left. Tap Done to remove this meal.')}</p>
          : <PickedList picked={items} setPicked={setItems} flat />}
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

      <p className={`-mb-1 px-1 text-xs ${muted}`}>
        {t('Changes apply to this meal only. To change the saved meal itself, use the arrow next to it in My Items.')}
      </p>
      {picker && (
        <Card className="space-y-3">
          <SectionTitle>{t('Add Ingredients')}</SectionTitle>
          <FoodPicker
            foods={picker.foods} customFoods={picker.customFoods}
            templates={picker.templates.filter((x) => x.id !== groupId)}
            picked={items} setPicked={setItems}
          />
        </Card>
      )}
    </Sheet>
  )
}

/** A single food in the picked list: name, macros, grams field and remove. */
function PickedRow({ entry: p, setPicked }) {
  const setGrams = (grams) => setPicked((list) => list.map((x) => (x.key === p.key ? { ...x, grams } : x)))
  const macros = scale(p.food, num(p.grams))
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t(p.food.name)}</p>
        <div className="flex flex-wrap gap-x-2 text-xs">
          <span className={`tabular-nums ${accentText}`}>{fmt0(macros.calories)} {t('kcal')}</span>
          <MacroSummary macros={macros} />
        </div>
      </div>
      <input
        inputMode="decimal" value={p.grams}
        onChange={(e) => setGrams(e.target.value)}
        aria-label={t('Grams of {name}', { name: t(p.food.name) })}
        className={`w-16 rounded-lg px-2 py-2 text-end tabular-nums outline-none ${fieldBg}`}
      />
      <span className={muted}>{t('g')}</span>
      <button
        onClick={() => setPicked((list) => list.filter((x) => x.key !== p.key))}
        aria-label={t('Remove {name}', { name: t(p.food.name) })}
        className={`px-1 text-xl leading-none ${faint}`}
      >
        ×
      </button>
    </div>
  )
}

// Rows slide up and fade in the first time they scroll into view. The first
// STAGGER_ROWS rows wait ROW_DELAY s more than the one before, so the list
// opens one row after another; later rows (reached by scrolling) come in at once.
const STAGGER_ROWS = 8
const ROW_DELAY = 0.08

// Press and hold a row's text for HOLD_MS to open its extra actions. A
// right-click does the same on a computer, and keyboard / screen-reader users
// get a button that is only visible while it has focus.
const HOLD_MS = 450

/** One list row: name (with optional ">" edit arrow), details, and a control.
 *  `index` is the row's place in its list; `stagger: false` skips the delay.
 *  `onHold` opens the row's actions; `held` shows `heldContent` under it. */
function ItemRow({ title, subtitle, meta, onEdit, control, index = 0, stagger = true, onHold, held = false, heldContent }) {
  const reduce = useReducedMotion()
  const delay = stagger && index < STAGGER_ROWS ? index * ROW_DELAY : 0
  const press = useRef(null)            // { x, y, glow, timer } while a finger or button is down
  const [pressing, setPressing] = useState(false)

  const stop = () => {
    if (press.current) { clearTimeout(press.current.glow); clearTimeout(press.current.timer); press.current = null }
    setPressing(false)
  }
  useEffect(() => stop, []) // eslint-disable-line react-hooks/exhaustive-deps

  const down = (e) => {
    if (!onHold || e.button > 0 || e.target.closest('button, input, a')) return
    stop()
    press.current = {
      x: e.clientX, y: e.clientY,
      glow: setTimeout(() => setPressing(true), 140),   // the row dims a moment before the hold fires
      timer: setTimeout(() => { press.current = null; setPressing(false); navigator.vibrate?.(12); onHold() }, HOLD_MS),
    }
  }
  // Moving the finger more than a few pixels is a scroll, not a hold.
  const move = (e) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) stop()
  }

  return (
    <motion.li
      className={onHold ? 'select-none [-webkit-touch-callout:none]' : undefined}
      // Reduce Motion: no travel, a plain fade.
      initial={{ opacity: 0, y: reduce ? 0 : 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: reduce ? 0.15 : 0.38, ease: [0.22, 1, 0.36, 1], delay }}
      onPointerDown={down} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}
      onContextMenu={onHold && ((e) => { e.preventDefault(); stop(); onHold() })}
    >
      <div className={`flex items-center gap-3 py-2.5 transition-colors ${
        held || pressing ? '-mx-2 rounded-xl bg-black/5 px-2 dark:bg-white/8 neu:bg-transparent neu:shadow-(--neu-inset)' : ''
      }`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <p className="truncate text-sm font-medium">{title}</p>
            {onEdit && (
              <button onClick={onEdit} aria-label={t('Edit {name}', { name: title })} className={`ms-0.5 shrink-0 rounded-md p-1 ${faint}`}>
                <ChevronIcon />
              </button>
            )}
          </div>
          {subtitle && <p className={`truncate text-xs ${faint}`}>{subtitle}</p>}
          <div className={`flex flex-wrap gap-x-2 text-xs ${muted}`}>{meta}</div>
        </div>
        {control}
        {onHold && (
          <button
            type="button" onClick={onHold}
            className={`sr-only focus-visible:not-sr-only focus-visible:text-xs focus-visible:font-semibold ${focusRing} ${accentText}`}
          >
            {t('More actions for {name}', { name: title })}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {held && (
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {heldContent}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

const StarIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
)

/** What a held Database row offers: put the food in My Items (a copy, kept
 *  next to the foods you made yourself), then fold away. */
function HoldActions({ food, saved, onAdd, onClose }) {
  const [added, setAdded] = useState(false)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!added) return undefined
    const id = setTimeout(() => close.current(), 1300)
    return () => clearTimeout(id)
  }, [added])
  return (
    <div data-hold-actions className="flex items-center gap-2 pb-2.5">
      {saved || added ? (
        <p role="status" className={`flex min-h-10 items-center gap-1.5 text-sm font-semibold ${accentText}`}>
          <CheckMark /> {t(added ? 'Added to My Items' : 'Already in My Items')}
        </p>
      ) : (
        <button
          type="button" onClick={() => { onAdd(food); setAdded(true) }}
          className={`flex min-h-10 items-center gap-1.5 rounded-full bg-royal px-4 text-[13px] font-semibold text-on-accent transition active:scale-95 neu:shadow-(--neu-raised-sm) ${focusRing}`}
        >
          <StarIcon /> {t('Add to My Items')}
        </button>
      )}
      <button type="button" onClick={onClose} className={`min-h-10 rounded-full px-3 text-[13px] font-medium ${muted} ${focusRing}`}>
        {t('Close')}
      </button>
    </div>
  )
}

const SubHeading = ({ children }) => (
  <h3 className={`pt-1 text-xs font-semibold uppercase tracking-wide ${faint}`}>{children}</h3>
)

// ---- Database filters ---------------------------------------------------------

/** The quick type pills above the list. `region` and the two restaurant
 *  entries cut across the food groups, so they are tested separately. */
const FOOD_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'region', label: 'Middle Eastern' },
  { id: 'fastfood', label: 'Fast Food' },
  { id: 'restaurant', label: 'Restaurants' },
  { id: 'meals', label: 'Meals & Dishes' },
  { id: 'meat', label: 'Meat & Poultry' },
  { id: 'seafood', label: 'Seafood' },
  { id: 'dairy', label: 'Dairy & Eggs' },
  { id: 'grains', label: 'Grains & Bread' },
  { id: 'legumes', label: 'Legumes' },
  { id: 'veg', label: 'Vegetables' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'nuts', label: 'Nuts & Seeds' },
  { id: 'fats', label: 'Oils & Sauces' },
  { id: 'sweets', label: 'Sweets & Desserts' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'supp', label: 'Supplements' },
]

const TYPE_TESTS = {
  all: () => true,
  region: (f) => Boolean(f.region),
  fastfood: (f) => f.type === 'fastfood' || f.type === 'restaurant',
}
const inType = (f, id) => (TYPE_TESTS[id] ? TYPE_TESTS[id](f) : f.type === id)

/** The filter page's diet and nutrition switches; a food must pass all that are on. */
const DIET_FILTERS = [
  { id: 'vegan', label: 'Vegan', test: (f) => f.diet === 'V' },
  { id: 'vegetarian', label: 'Vegetarian', test: (f) => f.diet === 'V' || f.diet === 'T' },
  { id: 'highProtein', label: 'High Protein', test: (f) => f.protein >= 15 },
  { id: 'lowCarb', label: 'Low Carb', test: (f) => f.carbs <= 10 },
  { id: 'lowCalorie', label: 'Low Calorie', test: (f) => f.calories <= 60 },
]

const SORTS = [
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'calAsc', label: 'Calories: Low to High' },
  { id: 'calDesc', label: 'Calories: High to Low' },
  { id: 'protein', label: 'Protein: High to Low' },
]

const NO_FILTERS = { diet: [], brand: null, sort: 'name' }

/** Lower case, without apostrophes and Arabic spelling variants, so
 *  "mcdonalds" finds McDonald's and any alef form finds the same word. */
const norm = (text) => text.toLowerCase()
  .replace(/['’`´]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[ً-ْ]/g, '')

/** Rows drawn at first, and added each time the end of the list scrolls close. */
const PAGE = 40

const FilterIcon = () => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1" />
    <circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="17" cy="18" r="2" />
  </svg>
)

const CheckMark = () => (
  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)

/**
 * The filter page: diet and nutrition, sort order and the restaurants. Changes
 * apply at once, so the button at the bottom just closes it and says how many
 * foods are showing.
 */
function FoodFilterSheet({ filters, setFilters, onBrand, brands, count, onClose, onReset, canReset }) {
  const toggleDiet = (id) => setFilters((f) => ({
    ...f, diet: f.diet.includes(id) ? f.diet.filter((d) => d !== id) : [...f.diet, id],
  }))
  return (
    <Sheet
      variant="modal" z="z-[55]" title={t('Filters')} onClose={onClose} closeLabel="Close"
      action={
        <button type="button" onClick={onReset} disabled={!canReset} className={`font-semibold disabled:opacity-35 ${focusRing} ${accentText}`}>
          {t('Reset')}
        </button>
      }
    >
      <Card className="space-y-3">
        <SectionTitle>{t('Diet & Nutrition')}</SectionTitle>
        <div role="group" aria-label={t('Diet & Nutrition')} className="flex flex-wrap gap-2 neu:gap-3.5 neu:p-1.5">
          {DIET_FILTERS.map((d) => (
            <Chip key={d.id} active={filters.diet.includes(d.id)} onClick={() => toggleDiet(d.id)}>{t(d.label)}</Chip>
          ))}
        </div>
        <p className={`text-xs ${muted}`}>{t('High Protein is 15 g or more per 100 g, Low Carb 10 g or less, Low Calorie 60 kcal or less.')}</p>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>{t('Sort By')}</SectionTitle>
        <div role="group" aria-label={t('Sort By')} className="flex flex-wrap gap-2 neu:gap-3.5 neu:p-1.5">
          {SORTS.map((o) => (
            <Chip key={o.id} active={filters.sort === o.id} onClick={() => setFilters((f) => ({ ...f, sort: o.id }))}>{t(o.label)}</Chip>
          ))}
        </div>
      </Card>

      {brands.length > 0 && (
        <Card className="space-y-1 overflow-hidden">
          <SectionTitle>{t('Famous Restaurants')}</SectionTitle>
          <p className={`pb-1 text-xs ${muted}`}>{t('Chain menus differ by country, so these are close estimates.')}</p>
          <ul className={`-mx-[18px] divide-y ${divider}`}>
            {brands.map(({ name, count: n }) => {
              const on = filters.brand === name
              return (
                <li key={name}>
                  <button
                    type="button" aria-pressed={on}
                    onClick={() => onBrand(on ? null : name)}
                    className={`flex min-h-12 w-full items-center gap-3 px-[18px] py-2 text-start transition-colors active:bg-black/5 dark:active:bg-white/5 ${focusRing}`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{t(name)}</span>
                    <span className={`text-xs tabular-nums ${muted}`}>{t('{n} items', { n })}</span>
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                      on ? 'bg-royal text-white dark:bg-lilac dark:text-black' : 'border-[1.5px] border-zinc-300 dark:border-white/25'
                    }`}>
                      {on && <CheckMark />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <PrimaryButton onClick={onClose}>{t('Show {n} Foods', { n: count })}</PrimaryButton>
    </Sheet>
  )
}

export function FoodPicker({
  foods, customFoods, templates, picked, setPicked,
  onEditCustom, onEditTemplate, onAddToMyItems, actions,
}) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState('Database')
  const [servings, setServings] = useState({}) // templateId -> servings currently picked
  const [type, setType] = useState('all')      // Database pill
  const [filters, setFilters] = useState(NO_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [shown, setShown] = useState(PAGE)     // Database rows drawn so far
  const [held, setHeld] = useState(null)       // id of the Database food whose actions are open
  const [heldBefore, setHeldBefore] = useLocalStorage('mt.holdHint', false) // the tip goes away after the first hold
  const more = useRef(null)                    // end-of-list marker that loads the next rows
  const rtl = isRTL()

  // The list follows the text a moment later, so typing never waits for it.
  const typed = useDeferredValue(search)
  const query = typed.trim().toLowerCase()
  const words = useMemo(() => norm(typed).split(/\s+/).filter(Boolean), [typed])
  // Matches the English name, the Arabic name or the name as shown in the
  // current language; every word typed must be in it, in any order.
  const matches = (x) => {
    const name = norm(`${x.name} ${t(x.name)} ${x.ar ?? ''}`)
    return words.every((w) => name.includes(w))
  }

  // ---- single foods: each tap of + / − moves by one portion (or STEP_GRAMS) ----
  const stepOf = (food) => (food.servingGrams > 0 ? food.servingGrams : STEP_GRAMS)
  const foodControl = (food) => {
    const entry = picked.find((p) => p.foodId === food.id)
    return entry ? (
      <Stepper
        label={t(food.name)}
        value={`${fmt0(num(entry.grams))} ${t('g')}`}
        onMinus={() => setPicked((list) => stepFood(list, food.id, -stepOf(food)))}
        onPlus={() => setPicked((list) => stepFood(list, food.id, stepOf(food)))}
      />
    ) : (
      <AddButton
        label={t('Add {name}', { name: t(food.name) })}
        onClick={() => setPicked((list) => [...list, { key: newKey(), food, grams: defaultGrams(food), foodId: food.id }])}
      />
    )
  }

  // ---- saved meals: each tap adds/removes one serving (all items scale) ----
  const servingsOf = (tpl) => (picked.some((p) => p.group === tpl.id) ? servings[tpl.id] ?? 1 : 0)
  const loadTemplate = (tpl) => {
    setPicked((list) => [
      ...list,
      ...tpl.items.map((item) => ({ key: newKey(), food: item, grams: String(item.grams), group: tpl.id, groupName: tpl.name })),
    ])
    setServings((s) => ({ ...s, [tpl.id]: 1 }))
  }
  const stepTemplate = (tpl, delta) => {
    const from = servingsOf(tpl)
    const to = from + delta
    setPicked((list) => scaleGroup(list, tpl.id, from, to))
    setServings((s) => ({ ...s, [tpl.id]: Math.max(to, 0) }))
  }
  const templateControl = (tpl) => {
    const n = servingsOf(tpl)
    return n > 0 ? (
      <Stepper label={tpl.name} value={`${n}×`} onMinus={() => stepTemplate(tpl, -1)} onPlus={() => stepTemplate(tpl, 1)} />
    ) : (
      <AddButton label={t('Add {name}', { name: tpl.name })} onClick={() => loadTemplate(tpl)} />
    )
  }

  const foodMeta = (food) => (
    <>
      <span className="tabular-nums">{t('{n} kcal / 100 g', { n: fmt0(food.calories) })}</span>
      <MacroSummary macros={food} />
      {food.servingGrams > 0 && <span className="tabular-nums">{t('· 1 portion {n} g', { n: fmt0(food.servingGrams) })}</span>}
    </>
  )

  // ---- the Database: type pill + filter page + search + sort ----
  const brands = useMemo(() => {
    const counts = new Map()
    for (const f of foods) if (f.brand) counts.set(f.brand, (counts.get(f.brand) ?? 0) + 1)
    return [...counts].map(([name, count]) => ({ name, count }))
  }, [foods])

  const dbResults = useMemo(() => {
    const tests = DIET_FILTERS.filter((d) => filters.diet.includes(d.id)).map((d) => d.test)
    const list = foods.filter((f) => inType(f, type)
      && (!filters.brand || f.brand === filters.brand)
      && tests.every((test) => test(f))
      && matches(f))
    const collator = new Intl.Collator(locale(), { sensitivity: 'base', numeric: true })
    const byName = (a, b) => collator.compare(t(a.name), t(b.name))
    // Typing: foods that START with the first word come before the rest.
    const lead = (f) => (words.length && norm(t(f.name)).startsWith(words[0]) ? 0 : 1)
    const order = {
      name: (a, b) => lead(a) - lead(b) || byName(a, b),
      calAsc: (a, b) => a.calories - b.calories || byName(a, b),
      calDesc: (a, b) => b.calories - a.calories || byName(a, b),
      protein: (a, b) => b.protein - a.protein || byName(a, b),
    }[filters.sort]
    return list.sort(order)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foods, type, filters, words, rtl])

  const filterCount = filters.diet.length + (filters.brand ? 1 : 0) + (filters.sort !== 'name' ? 1 : 0)
  const filtered = type !== 'all' || filterCount > 0
  const resetFilters = () => { setType('all'); setFilters(NO_FILTERS) }
  // Picking a restaurant also moves the type pill to Restaurants, so another
  // pill that was on (Middle Eastern, say) cannot empty the list.
  const pickBrand = (brand) => {
    setFilters((f) => ({ ...f, brand }))
    if (brand) setType('restaurant')
  }

  // A new result list starts again at the first page, with no row held.
  useEffect(() => { setShown(PAGE); setHeld(null) }, [dbResults, view])

  // A press anywhere but on the open actions folds them away.
  useEffect(() => {
    if (!held) return undefined
    const away = (e) => { if (!e.target.closest?.('[data-hold-actions]')) setHeld(null) }
    document.addEventListener('pointerdown', away, true)
    return () => document.removeEventListener('pointerdown', away, true)
  }, [held])

  // Draw the next page when the end of the list scrolls close (the marker is
  // tall, so this happens before the person reaches it). The observer is made
  // again after every page, so a tall screen keeps filling until it is full.
  useEffect(() => {
    const el = more.current
    if (!el) return undefined
    const watch = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setShown((n) => n + PAGE)
    })
    watch.observe(el)
    return () => watch.disconnect()
  }, [shown, dbResults, view])

  const templateResults = templates.filter(matches)
  const customResults = customFoods.filter(matches)

  return (
    <>
      <Segmented options={['Database', 'My Items']} value={view} onChange={setView} />
      {actions}
      <div className="flex items-center gap-2">
        <SearchInput
          value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} autoCorrect="off"
          placeholder={t(view === 'Database' ? 'Search foods' : 'Search my items')}
          aria-label={t(view === 'Database' ? 'Search foods' : 'Search my items')}
          className="min-w-0 flex-1"
        />
        {view === 'Database' && (
          <button
            type="button" onClick={() => setFilterOpen(true)}
            aria-label={filterCount > 0 ? t('Filters, {n} on', { n: filterCount }) : t('Filters')}
            aria-haspopup="dialog"
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-xl transition active:scale-95 ${buttonBg} ${focusRing} ${accentText}`}
          >
            <FilterIcon />
            {filterCount > 0 && (
              <span className="absolute -end-1 -top-1 flex size-5 items-center justify-center rounded-full bg-royal text-[11px] font-semibold text-white tabular-nums dark:bg-lilac dark:text-black">
                {filterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {view === 'Database' ? (
        <>
          <ChipRow label={t('Food type')} bleed="-mx-[18px] px-[18px]">
            {FOOD_TYPES.map(({ id, label }) => (
              <Chip
                key={id} active={type === id}
                onClick={() => {
                  setType(id)
                  // A restaurant picked on the filter page only belongs with the restaurant-style pills.
                  if (id !== 'restaurant' && id !== 'fastfood' && filters.brand) setFilters((f) => ({ ...f, brand: null }))
                }}
              >
                {t(label)}
              </Chip>
            ))}
          </ChipRow>
          <p className={`text-xs ${muted}`} aria-live="polite">
            {t('{n} foods', { n: dbResults.length })}
            {filters.brand && ` · ${t(filters.brand)}`}
          </p>
          {onAddToMyItems && !heldBefore && (
            <p className={`-mt-1 text-xs ${faint}`}>{t('Tip: press and hold a food to add it to My Items.')}</p>
          )}
          <ul className={`divide-y ${divider}`}>
            {dbResults.slice(0, shown).map((food, i) => (
              <ItemRow
                key={food.id} index={i} stagger={!query} title={t(food.name)} meta={foodMeta(food)} control={foodControl(food)}
                onHold={onAddToMyItems && (() => { setHeld(food.id); setHeldBefore(true) })}
                held={held === food.id}
                heldContent={onAddToMyItems && (
                  <HoldActions
                    food={food} saved={customFoods.some((c) => c.from === food.id)}
                    onAdd={onAddToMyItems} onClose={() => setHeld(null)}
                  />
                )}
              />
            ))}
            {shown < dbResults.length && <li ref={more} aria-hidden="true" className="h-40 border-t-0!" />}
          </ul>
          {dbResults.length === 0 && (
            <div className="space-y-2 py-2">
              <p className={`text-sm ${muted}`}>{t('No foods match your search.')}</p>
              {filtered && (
                <button type="button" onClick={resetFilters} className={`min-h-11 rounded-lg text-sm font-semibold ${focusRing} ${accentText}`}>
                  {t('Clear Filters')}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <SubHeading>{t('Saved Meals')}</SubHeading>
          {templateResults.length === 0 ? (
            <p className={`text-sm ${muted}`}>
              {t(templates.length === 0
                ? 'No saved meals yet. Tap the bookmark next to a meal on the Home tab to save it.'
                : 'No saved meals match your search.')}
            </p>
          ) : (
            <ul className={`divide-y ${divider}`}>
              {templateResults.map((tpl, i) => {
                const tt = tpl.items.reduce((sum, item) => add(sum, scale(item, item.grams)), ZERO)
                return (
                  <ItemRow
                    key={tpl.id}
                    index={i} stagger={!query}
                    title={tpl.name}
                    subtitle={tpl.items.map((item) => `${fmt0(item.grams)} ${t('g')} ${t(item.name)}`).join(' · ')}
                    meta={<><span className="tabular-nums">{fmt0(tt.calories)} {t('kcal')}</span><MacroSummary macros={tt} /></>}
                    onEdit={onEditTemplate && (() => onEditTemplate(tpl))}
                    control={templateControl(tpl)}
                  />
                )
              })}
            </ul>
          )}

          <SubHeading>{t('Custom Items')}</SubHeading>
          {customResults.length === 0 ? (
            <p className={`text-sm ${muted}`}>
              {t(customFoods.length === 0
                ? 'No custom items yet. Add your own, like a specific protein bar.'
                : 'No custom items match your search.')}
            </p>
          ) : (
            <ul className={`divide-y ${divider}`}>
              {customResults.map((food, i) => (
                <ItemRow
                  key={food.id} index={i} stagger={!query} title={t(food.name)} meta={foodMeta(food)}
                  onEdit={onEditCustom && (() => onEditCustom(food))} control={foodControl(food)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {/* Portal: this picker sits inside a sliding sheet, and a fixed-position
          sheet inside a transformed parent would be clipped to it. */}
      {createPortal(
        <AnimatePresence>
          {filterOpen && (
            <FoodFilterSheet
              key="filters" filters={filters} setFilters={setFilters} onBrand={pickBrand} brands={brands}
              count={dbResults.length} onClose={() => setFilterOpen(false)}
              canReset={filtered} onReset={resetFilters}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
