// Sanity checks for the built-in food database: run with `node scripts/check-foods.mjs`.
//   - every name and id is unique, every food has an Arabic name
//   - calories roughly match 4 x protein + 4 x carbs + 9 x fat (catches typos)
//   - diet, type and portion values are valid
// Exits with a non-zero code when anything fails.
import { SEED_FOODS, TRANSLATIONS, FOOD_BRANDS } from '../src/lib/foods.js'

const TYPES = ['meat', 'seafood', 'dairy', 'grains', 'legumes', 'veg', 'fruit', 'nuts', 'fats', 'sweets',
  'drinks', 'snacks', 'supp', 'meals', 'fastfood', 'restaurant']
// High-fibre foods whose published calories are well below the Atwater sum.
const ATWATER_EXEMPT = new Set(['Cocoa Powder (unsweetened)'])

const problems = []
const seenNames = new Map()
const seenIds = new Map()
const counts = {}

for (const f of SEED_FOODS) {
  const key = f.name.toLowerCase()
  if (seenNames.has(key)) problems.push(`duplicate name: ${f.name}`)
  seenNames.set(key, true)
  if (seenIds.has(f.id)) problems.push(`duplicate id: ${f.id} (${f.name})`)
  seenIds.set(f.id, true)
  if (!TRANSLATIONS[f.name] || !/[\u0600-\u06FF]/.test(TRANSLATIONS[f.name])) problems.push(`no Arabic name: ${f.name}`)
  if (!TYPES.includes(f.type)) problems.push(`bad type ${f.type}: ${f.name}`)
  if (!['V', 'T', ''].includes(f.diet)) problems.push(`bad diet ${JSON.stringify(f.diet)}: ${f.name}`)
  if (f.diet !== '' && /\b(chicken|beef|lamb|tuna|salmon|shrimp|fish|meat|liver|sausage|kofta|kebab|shawarma)\b/i.test(f.name) && f.diet !== 'T' && f.type !== 'sweets') {
    problems.push(`diet ${f.diet} on a meat-sounding name: ${f.name}`)
  }
  for (const k of ['calories', 'protein', 'carbs', 'fat']) {
    if (!(f[k] >= 0)) problems.push(`bad ${k} ${f[k]}: ${f.name}`)
  }
  if (f.servingGrams !== undefined && !(f.servingGrams > 0 && f.servingGrams <= 2500)) problems.push(`bad portion ${f.servingGrams}: ${f.name}`)
  const atwater = 4 * f.protein + 4 * f.carbs + 9 * f.fat
  if (!ATWATER_EXEMPT.has(f.name) && Math.abs(f.calories - atwater) > Math.max(20, 0.2 * f.calories)) {
    problems.push(`calories ${f.calories} vs ${Math.round(atwater)} from macros: ${f.name}`)
  }
  counts[f.type] = (counts[f.type] || 0) + 1
}

const brandItems = SEED_FOODS.filter((f) => f.brand).length
console.log(`${SEED_FOODS.length} foods, ${FOOD_BRANDS.length} restaurants (${brandItems} items),`,
  `${SEED_FOODS.filter((f) => f.region).length} Middle Eastern`)
console.log(counts)
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`)
  for (const p of problems) console.log(' -', p)
  process.exit(1)
}
console.log('All checks passed.')
