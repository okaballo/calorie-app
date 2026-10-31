// Built-in food database: about a thousand foods, generic and prepared, with
// Egyptian / Middle Eastern dishes and the restaurant chains of the region.
// The rows live in lib/food-data/ (see the header of each file for the row
// format); this file turns them into food objects:
//
//   { id, name, ar, calories, protein, carbs, fat,   per 100 g
//     type, diet, region?, brand?, servingGrams?, custom: false }
//
//   ar       the Arabic name, so a search finds a food by either name
//
//   type     one of the keys in FOOD_TYPES (components/FoodPicker.jsx)
//   diet     'V' vegan, 'T' vegetarian but not vegan, '' contains meat or
//            fish (the Vegetarian filter accepts both 'V' and 'T')
//   region   true for Egyptian / Middle Eastern foods
//   brand    the restaurant's English name, for chain items
//
// It also registers the Arabic names with lib/i18n.js, so t(food.name)
// shows Arabic wherever a food name is displayed, including meals saved
// earlier. This file is loaded on demand by App (a separate chunk), so the
// first screen does not wait for the data.
import { addTranslations } from './i18n.js'
import { GENERIC_A } from './food-data/generic-a.js'
import { GENERIC_B } from './food-data/generic-b.js'
import { GENERIC_C } from './food-data/generic-c.js'
import { DISHES } from './food-data/dishes.js'
import { DISHES_B } from './food-data/dishes-b.js'
import { BRANDS as BRANDS_A } from './food-data/brands.js'
import { BRANDS_B } from './food-data/brands-b.js'

// Restaurants of both files; a name that appears twice gets the rows of both.
const BRANDS = []
for (const brand of [...BRANDS_A, ...BRANDS_B]) {
  const known = BRANDS.find((b) => b.name === brand.name)
  if (known) known.rows = [...known.rows, ...brand.rows]
  else BRANDS.push({ ...brand })
}

// Generic foods that are Egyptian / Middle Eastern staples, so the
// "Middle Eastern" filter finds them as well as the dishes.
const MIDDLE_EASTERN = new Set([
  'Baladi Bread (Aish Baladi)', 'Fino Bread', 'Shami Bread (Pita)', 'Whole Wheat Pita',
  'Domiati Cheese (white cheese)', 'Rumi Cheese (Roumy)', 'Cottage Cheese / Areesh', 'Labneh',
  'Laban Rayeb (Egyptian fermented milk)', 'Qishta (clotted cream)', 'Ghee (Samna Baladi)',
  'Vegetable Ghee (Samna Sinaei)', 'Feseekh (salted fermented mullet)', 'Renga (smoked herring)',
  'Tilapia / Bolti (cooked)', 'Grey Mullet / Bouri (cooked)', 'Catfish / Qarmout (cooked)',
  'Nile Perch (cooked)', 'Sole / Mousa (cooked)', 'Beef Basterma (Pastirma)', 'Beef Mortadella',
  'Pigeon (cooked)', 'Fava Beans (cooked)', 'Fava Beans (dry)', 'Fava Beans (canned)',
  'Lupini Beans / Termis (cooked)', 'Black-Eyed Peas / Lobia (cooked)', 'Black-Eyed Peas / Lobia (dry)',
  'Freekeh (cooked)', 'Bulgur (cooked)', 'Bulgur (dry)', 'Molokhia Leaves (raw)',
  'Colocasia / Qolqas (cooked)', 'Okra / Bamia (raw)', 'Okra / Bamia (cooked)', 'Arugula / Gargeer',
  'Pickled Turnip (Lift Mekhalel)', 'Mixed Pickles (Torshi)', 'Prickly Pear (Teen Shoky)',
  'Dates (Medjool)', 'Dates (Deglet Noor / dry)', 'Dried Apricots (Amardeen)', 'Tamarind Pulp',
  'Sunflower Seeds (Lib Soudani)', 'Pumpkin Seeds (Lib Asmar)', 'Watermelon Seeds (Lib Abyad)',
  'Tahini (Tahina)', 'Hot Sauce (Shatta)', 'Tahini Sauce (Tarator)', 'Garlic Sauce (Toum)',
  'Molasses (Black Honey / Asal Eswed)', 'Date Syrup (Dibs)', 'Pomegranate Molasses',
  'Halawa Tahiniya (Halva)', 'Turkish Delight (Lokum)', 'Turkish Coffee (no sugar)',
  'Tea with Sugar', 'Tea with Milk and Sugar', 'Mint Tea', 'Rusk (Bashmat)', 'Swiss Chard (Selq)',
  'Jujube (Annab)',
])

const round1 = (n) => Math.round(n * 10) / 10
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const foods = []
const arabic = {}

const push = (name, ar, values, extra) => {
  arabic[name] = ar
  foods.push({
    id: `f-${slug(name)}`, name, ar, ...values, custom: false, ...extra,
  })
}

// Per-100 g rows: [name, ar, kcal, protein, carbs, fat, portion g, diet?]
for (const { type, diet, rows } of [...GENERIC_A, ...GENERIC_B, ...GENERIC_C]) {
  for (const [name, ar, calories, protein, carbs, fat, serving, own] of rows) {
    push(name, ar, { calories, protein, carbs, fat }, {
      type, diet: own ?? diet,
      ...(serving > 0 && { servingGrams: serving }),
      ...(MIDDLE_EASTERN.has(name) && { region: true }),
    })
  }
}

// Per-portion rows: [name, ar, portion g, kcal, protein, carbs, fat, diet?]
// stored per 100 g, with the portion kept as the default amount.
const per100 = (grams, kcal, p, c, f) => ({
  calories: Math.round((kcal / grams) * 100),
  protein: round1((p / grams) * 100),
  carbs: round1((c / grams) * 100),
  fat: round1((f / grams) * 100),
})

for (const { type, region, diet, rows } of [...DISHES, ...DISHES_B]) {
  for (const [name, ar, grams, kcal, p, c, f, own] of rows) {
    push(name, ar, per100(grams, kcal, p, c, f), {
      type, diet: own ?? diet, servingGrams: grams, ...(region && { region: true }),
    })
  }
}

for (const brand of BRANDS) {
  arabic[brand.name] = brand.ar
  for (const [item, ar, grams, kcal, p, c, f, own] of brand.rows) {
    push(`${brand.name} ${item}`, `${brand.ar} ${ar}`, per100(grams, kcal, p, c, f), {
      type: 'restaurant', diet: own ?? '', servingGrams: grams, brand: brand.name,
    })
  }
}

addTranslations(arabic)

export const SEED_FOODS = foods

/** Restaurants with at least one item, in menu order: [{ name, count }]. */
export const FOOD_BRANDS = BRANDS.map((b) => ({
  name: b.name, count: b.rows.length,
}))

export const TRANSLATIONS = arabic
