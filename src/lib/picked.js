// Pure helpers for the "In This Meal" list in Log Meal.
// Each entry: { key, food, grams (string, as typed), foodId?, group?, groupName? }
//   foodId    - set for single foods picked from Database / Custom Items
//   group     - set for items that came from a saved meal template (its id);
//               they are shown together as one card in the picked list
//   groupName - that saved meal's name, the card's title
import { ZERO, add, num, round1, scale } from './calc.js'

/** Grams added or removed by one tap on a food's + / − control. */
export const STEP_GRAMS = 25

/** Macro totals of picker entries, at the grams currently typed. */
export const pickedTotals = (entries) => entries.reduce((sum, p) => add(sum, scale(p.food, num(p.grams))), ZERO)

/** Saved meal/template items -> picker entries, so they can be edited. */
export const toPicked = (items) =>
  items.map((item) => ({ key: crypto.randomUUID(), food: item, grams: String(item.grams) }))

/** Picker entries -> saved items. Per-100 g values are COPIED in, so later
 *  edits to a custom food never change meals already logged. */
export const toItems = (picked) =>
  picked.map(({ food, grams }) => ({
    name: food.name, grams: num(grams),
    calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat,
  }))

/** Changes one food's grams by `delta`; removes it when it reaches 0. */
export const stepFood = (list, foodId, delta) =>
  list.flatMap((p) => {
    if (p.foodId !== foodId) return [p]
    const grams = round1(num(p.grams) + delta)
    return grams > 0 ? [{ ...p, grams: String(grams) }] : []
  })

/** Replaces a saved meal's entries with `next`, keeping the card where it
 *  was in the list. An empty `next` removes the saved meal. */
export const replaceGroup = (list, groupId, next) => {
  const at = list.findIndex((p) => p.group === groupId)
  if (at < 0) return list
  const rest = list.filter((p) => p.group !== groupId)
  const pos = list.slice(0, at).filter((p) => p.group !== groupId).length
  return [...rest.slice(0, pos), ...next, ...rest.slice(pos)]
}

/**
 * Changes a template from `from` to `to` servings by scaling all of its
 * items' grams proportionally (so any grams you edited keep their ratio).
 * `to` of 0 removes the template's items.
 */
export const scaleGroup = (list, groupId, from, to) =>
  to <= 0
    ? list.filter((p) => p.group !== groupId)
    : list.map((p) =>
        p.group === groupId ? { ...p, grams: String(round1((num(p.grams) * to) / from)) } : p,
      )
