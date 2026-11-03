// Built-in resistance training exercises. Fully offline: no API, no fetch.
//
// Each exercise has ONE primary muscle (what it is filed under and what
// "alternatives" match on), optional secondary muscles, and the equipment it
// needs, so a user whose gym lacks a machine can find a swap that trains the
// same muscle with what they have.
//
// Ids are made from the name and are saved in logged workouts and templates,
// so renaming an exercise changes its id: give it an explicit `id` instead
// (the third tuple slot) to keep old logs pointing at it.

export const MUSCLES = [
  'Chest', 'Back', 'Lower Back', 'Traps', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
  'Abs', 'Quads', 'Hamstrings', 'Glutes', 'Adductors', 'Calves',
] as const

export const EQUIPMENT = [
  'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith Machine', 'Kettlebell',
] as const

export type Muscle = (typeof MUSCLES)[number]
export type Equipment = (typeof EQUIPMENT)[number]

export interface Exercise {
  id: string
  name: string
  muscle: Muscle
  equipment: Equipment
  secondary: Muscle[]
}

// [name, equipment, secondary muscles?, explicit id?]
type Row = [string, Equipment, Muscle[]?, string?]

const B = 'Barbell'
const D = 'Dumbbell'
const M = 'Machine'
const C = 'Cable'
const BW = 'Bodyweight'
const S = 'Smith Machine'
const K = 'Kettlebell'

const ROWS: Record<Muscle, Row[]> = {
  Chest: [
    ['Barbell Bench Press', B, ['Triceps', 'Shoulders']],
    ['Incline Barbell Bench Press', B, ['Shoulders', 'Triceps']],
    ['Decline Barbell Bench Press', B, ['Triceps']],
    ['Barbell Floor Press', B, ['Triceps']],
    ['Dumbbell Bench Press', D, ['Triceps', 'Shoulders']],
    ['Incline Dumbbell Press', D, ['Shoulders', 'Triceps']],
    ['Decline Dumbbell Press', D, ['Triceps']],
    ['Dumbbell Fly', D],
    ['Incline Dumbbell Fly', D, ['Shoulders']],
    ['Dumbbell Squeeze Press', D, ['Triceps']],
    ['Dumbbell Pullover', D, ['Back']],
    ['Chest Press Machine', M, ['Triceps', 'Shoulders']],
    ['Incline Chest Press Machine', M, ['Shoulders', 'Triceps']],
    ['Plate-Loaded Chest Press', M, ['Triceps']],
    ['Pec Deck', M],
    ['Cable Crossover', C],
    ['Low-to-High Cable Fly', C, ['Shoulders']],
    ['High-to-Low Cable Fly', C],
    ['Single-Arm Cable Chest Press', C, ['Triceps', 'Abs']],
    ['Smith Machine Bench Press', S, ['Triceps', 'Shoulders']],
    ['Smith Machine Incline Press', S, ['Shoulders', 'Triceps']],
    ['Smith Machine Decline Press', S, ['Triceps']],
    ['Push-Up', BW, ['Triceps', 'Shoulders']],
    ['Incline Push-Up', BW, ['Triceps']],
    ['Decline Push-Up', BW, ['Shoulders', 'Triceps']],
    ['Chest Dip', BW, ['Triceps', 'Shoulders']],
    ['Kettlebell Floor Press', K, ['Triceps']],
  ],
  Back: [
    ['Deadlift', B, ['Hamstrings', 'Glutes', 'Lower Back', 'Traps']],
    ['Barbell Row', B, ['Biceps', 'Lower Back']],
    ['Pendlay Row', B, ['Biceps']],
    ['T-Bar Row', B, ['Biceps']],
    ['Meadows Row', B, ['Biceps']],
    ['Barbell Seal Row', B, ['Biceps']],
    ['Rack Pull', B, ['Traps', 'Glutes']],
    ['Single-Arm Dumbbell Row', D, ['Biceps']],
    ['Chest-Supported Dumbbell Row', D, ['Biceps']],
    ['Kroc Row', D, ['Biceps', 'Forearms']],
    ['Renegade Row', D, ['Abs']],
    ['Lat Pulldown', C, ['Biceps']],
    ['Close-Grip Lat Pulldown', C, ['Biceps']],
    ['Single-Arm Lat Pulldown', C, ['Biceps']],
    ['Straight-Arm Pulldown', C],
    ['Seated Cable Row', C, ['Biceps']],
    ['Single-Arm Cable Row', C, ['Biceps']],
    ['Plate-Loaded Lat Pulldown', M, ['Biceps']],
    ['Seated Row Machine', M, ['Biceps']],
    ['Chest-Supported T-Bar Row', M, ['Biceps']],
    ['High Row Machine', M, ['Biceps']],
    ['Assisted Pull-Up Machine', M, ['Biceps']],
    ['Smith Machine Row', S, ['Biceps']],
    ['Pull-Up', BW, ['Biceps']],
    ['Chin-Up', BW, ['Biceps']],
    ['Neutral-Grip Pull-Up', BW, ['Biceps']],
    ['Inverted Row', BW, ['Biceps']],
    ['Single-Arm Kettlebell Row', K, ['Biceps']],
  ],
  'Lower Back': [
    ['Good Morning', B, ['Hamstrings', 'Glutes']],
    ['Back Extension', BW, ['Glutes', 'Hamstrings']],
    ['Weighted Back Extension', D, ['Glutes', 'Hamstrings']],
    ['Superman', BW, ['Glutes']],
    ['Reverse Hyperextension', M, ['Glutes', 'Hamstrings']],
  ],
  Traps: [
    ['Barbell Shrug', B],
    ['Dumbbell Shrug', D],
    ['Cable Shrug', C],
    ['Shrug Machine', M],
    ['Smith Machine Shrug', S],
    ['Trap Bar Shrug', B, ['Forearms']],
  ],
  Shoulders: [
    ['Overhead Press', B, ['Triceps']],
    ['Seated Barbell Press', B, ['Triceps']],
    ['Push Press', B, ['Triceps', 'Quads']],
    ['Landmine Press', B, ['Chest', 'Triceps']],
    ['Barbell Upright Row', B, ['Traps']],
    ['Dumbbell Shoulder Press', D, ['Triceps']],
    ['Arnold Press', D, ['Triceps']],
    ['Dumbbell Lateral Raise', D],
    ['Dumbbell Front Raise', D],
    ['Rear Delt Dumbbell Fly', D, ['Back']],
    ['Dumbbell Upright Row', D, ['Traps']],
    ['Shoulder Press Machine', M, ['Triceps']],
    ['Lateral Raise Machine', M],
    ['Reverse Pec Deck', M, ['Back']],
    ['Cable Lateral Raise', C],
    ['Cable Front Raise', C],
    ['Cable Rear Delt Fly', C, ['Back']],
    ['Face Pull', C, ['Back', 'Traps']],
    ['Cable Upright Row', C, ['Traps']],
    ['Smith Machine Shoulder Press', S, ['Triceps']],
    ['Smith Machine Upright Row', S, ['Traps']],
    ['Pike Push-Up', BW, ['Triceps']],
    ['Handstand Push-Up', BW, ['Triceps']],
    ['Kettlebell Overhead Press', K, ['Triceps']],
  ],
  Biceps: [
    ['Barbell Curl', B, ['Forearms']],
    ['EZ-Bar Curl', B, ['Forearms']],
    ['EZ-Bar Preacher Curl', B],
    ['Drag Curl', B],
    ['Dumbbell Curl', D, ['Forearms']],
    ['Hammer Curl', D, ['Forearms']],
    ['Incline Dumbbell Curl', D],
    ['Concentration Curl', D],
    ['Dumbbell Preacher Curl', D],
    ['Spider Curl', D],
    ['Zottman Curl', D, ['Forearms']],
    ['Cable Curl', C, ['Forearms']],
    ['Rope Hammer Curl', C, ['Forearms']],
    ['Bayesian Cable Curl', C],
    ['High Cable Curl', C],
    ['Machine Preacher Curl', M],
    ['Biceps Curl Machine', M],
    ['Kettlebell Curl', K, ['Forearms']],
  ],
  Triceps: [
    ['Close-Grip Bench Press', B, ['Chest', 'Shoulders']],
    ['Skull Crusher', B],
    ['JM Press', B, ['Chest']],
    ['Overhead Dumbbell Extension', D],
    ['Dumbbell Skull Crusher', D],
    ['Dumbbell Kickback', D],
    ['Tate Press', D],
    ['Rope Pushdown', C],
    ['Straight-Bar Pushdown', C],
    ['Overhead Cable Extension', C],
    ['Single-Arm Cable Pushdown', C],
    ['Cable Kickback', C],
    ['Triceps Extension Machine', M],
    ['Seated Dip Machine', M, ['Chest']],
    ['Smith Machine Close-Grip Bench Press', S, ['Chest']],
    ['Triceps Dip', BW, ['Chest', 'Shoulders']],
    ['Bench Dip', BW],
    ['Diamond Push-Up', BW, ['Chest']],
  ],
  Forearms: [
    ['Barbell Wrist Curl', B],
    ['Reverse Barbell Curl', B, ['Biceps']],
    ['Behind-the-Back Wrist Curl', B],
    ['Dumbbell Wrist Curl', D],
    ['Reverse Dumbbell Wrist Curl', D],
    ["Farmer's Walk", D, ['Traps', 'Abs']],
    ['Cable Wrist Curl', C],
    ['Cable Reverse Curl', C, ['Biceps']],
    ['Dead Hang', BW, ['Back']],
  ],
  Abs: [
    ['Crunch', BW],
    ['Bicycle Crunch', BW],
    ['Hanging Leg Raise', BW],
    ['Hanging Knee Raise', BW],
    ['Lying Leg Raise', BW],
    ['Plank', BW],
    ['Side Plank', BW],
    ['Ab Wheel Rollout', BW, ['Lower Back']],
    ['Russian Twist', BW],
    ['V-Up', BW],
    ['Dead Bug', BW],
    ['Mountain Climber', BW, ['Shoulders']],
    ['Cable Crunch', C],
    ['Cable Woodchopper', C],
    ['Pallof Press', C],
    ['Ab Crunch Machine', M],
    ["Captain's Chair Leg Raise", M],
    ['Rotary Torso Machine', M],
    ['Dumbbell Side Bend', D],
    ['Weighted Decline Sit-Up', D],
    ['Landmine Rotation', B, ['Shoulders']],
    ['Kettlebell Turkish Get-Up', K, ['Shoulders', 'Glutes']],
  ],
  Quads: [
    ['Back Squat', B, ['Glutes', 'Adductors']],
    ['Front Squat', B, ['Glutes', 'Abs']],
    ['Box Squat', B, ['Glutes']],
    ['Zercher Squat', B, ['Glutes', 'Abs']],
    ['Barbell Lunge', B, ['Glutes']],
    ['Goblet Squat', D, ['Glutes']],
    ['Bulgarian Split Squat', D, ['Glutes']],
    ['Dumbbell Lunge', D, ['Glutes']],
    ['Walking Lunge', D, ['Glutes']],
    ['Dumbbell Step-Up', D, ['Glutes']],
    ['Leg Press', M, ['Glutes']],
    ['Hack Squat', M, ['Glutes']],
    ['Leg Extension', M],
    ['Pendulum Squat', M, ['Glutes']],
    ['Belt Squat', M, ['Glutes']],
    ['V-Squat', M, ['Glutes']],
    ['Smith Machine Squat', S, ['Glutes']],
    ['Smith Machine Lunge', S, ['Glutes']],
    ['Smith Machine Bulgarian Split Squat', S, ['Glutes']],
    ['Bodyweight Squat', BW, ['Glutes']],
    ['Jump Squat', BW, ['Glutes', 'Calves']],
    ['Pistol Squat', BW, ['Glutes']],
    ['Sissy Squat', BW],
    ['Wall Sit', BW],
    ['Kettlebell Goblet Squat', K, ['Glutes']],
  ],
  Hamstrings: [
    ['Romanian Deadlift', B, ['Glutes', 'Lower Back']],
    ['Stiff-Leg Deadlift', B, ['Glutes', 'Lower Back']],
    ['Dumbbell Romanian Deadlift', D, ['Glutes']],
    ['Single-Leg Romanian Deadlift', D, ['Glutes']],
    ['Lying Leg Curl', M],
    ['Seated Leg Curl', M],
    ['Standing Leg Curl', M],
    ['Glute-Ham Raise', M, ['Glutes']],
    ['Cable Leg Curl', C],
    ['Smith Machine Romanian Deadlift', S, ['Glutes']],
    ['Nordic Hamstring Curl', BW],
    ['Sliding Leg Curl', BW, ['Glutes']],
    ['Kettlebell Romanian Deadlift', K, ['Glutes']],
  ],
  Glutes: [
    ['Barbell Hip Thrust', B, ['Hamstrings']],
    ['Barbell Glute Bridge', B, ['Hamstrings']],
    ['Sumo Deadlift', B, ['Quads', 'Hamstrings', 'Adductors', 'Back']],
    ['Dumbbell Hip Thrust', D, ['Hamstrings']],
    ['Dumbbell Reverse Lunge', D, ['Quads']],
    ['Dumbbell Sumo Squat', D, ['Quads', 'Adductors']],
    ['Hip Thrust Machine', M, ['Hamstrings']],
    ['Glute Kickback Machine', M, ['Hamstrings']],
    ['Hip Abduction Machine', M],
    ['Cable Glute Kickback', C, ['Hamstrings']],
    ['Cable Pull-Through', C, ['Hamstrings']],
    ['Cable Hip Abduction', C],
    ['Smith Machine Hip Thrust', S, ['Hamstrings']],
    ['Smith Machine Reverse Lunge', S, ['Quads']],
    ['Glute Bridge', BW, ['Hamstrings']],
    ['Single-Leg Glute Bridge', BW, ['Hamstrings']],
    ['Frog Pump', BW],
    ['Kettlebell Swing', K, ['Hamstrings', 'Lower Back']],
  ],
  Adductors: [
    ['Hip Adduction Machine', M],
    ['Cable Hip Adduction', C],
    ['Copenhagen Plank', BW, ['Abs']],
  ],
  Calves: [
    ['Standing Calf Raise Machine', M],
    ['Seated Calf Raise', M],
    ['Leg Press Calf Raise', M],
    ['Donkey Calf Raise', M],
    ['Smith Machine Calf Raise', S],
    ['Barbell Calf Raise', B],
    ['Single-Leg Dumbbell Calf Raise', D],
    ['Bodyweight Calf Raise', BW],
    ['Tibialis Raise', BW],
  ],
}

const slug = (name: string) => name.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const EXERCISES: Exercise[] = MUSCLES.flatMap((muscle) =>
  ROWS[muscle].map(([name, equipment, secondary = [], id]) => ({
    id: id ?? slug(name), name, muscle, equipment, secondary,
  })),
).sort((a, b) => a.name.localeCompare(b.name))

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))

// ---- The user's own exercises ------------------------------------------------
// Stored by the app (mt.customExercises) and registered here, so every lookup
// below sees them like built-in ones. Ids start with "custom-" so they can
// never clash with a built-in id.

export interface CustomExercise extends Exercise {
  custom: true
}

let CUSTOM: CustomExercise[] = []
const CUSTOM_BY_ID: Record<string, CustomExercise> = {}

export const isCustomId = (id: string) => id.startsWith('custom-')

/** Registers the user's exercises (call with the whole saved list; safe to repeat). */
export function setCustomExercises(list: CustomExercise[]) {
  CUSTOM = (Array.isArray(list) ? list : []).filter((e) => e && e.id && e.name && MUSCLES.includes(e.muscle))
  for (const k of Object.keys(CUSTOM_BY_ID)) delete CUSTOM_BY_ID[k]
  for (const e of CUSTOM) CUSTOM_BY_ID[e.id] = e
}

/** A built-in or custom exercise by id. */
export const getExercise = (id: string): Exercise | undefined => EXERCISE_BY_ID[id] ?? CUSTOM_BY_ID[id]

export function makeCustomExercise(
  name: string, muscle: Muscle, secondary: Muscle[], equipment: Equipment,
): CustomExercise {
  return {
    id: `custom-${crypto.randomUUID()}`,
    name: name.trim(), muscle, equipment,
    secondary: secondary.filter((m) => m !== muscle),
    custom: true,
  }
}

// ---- Splits ------------------------------------------------------------------
// Suggested ways to divide the week, each day with a short list of staple
// exercises (by name). The "Splits suggestions" screen of the Workout tab shows
// them and starts a new routine from the ones picked.

export interface SplitDay { name: string; muscles: Muscle[]; exercises: string[] }
export interface Split { id: string; name: string; note: string; days: SplitDay[] }

const PUSH = ['Barbell Bench Press', 'Incline Dumbbell Press', 'Cable Crossover', 'Overhead Press', 'Dumbbell Lateral Raise', 'Rope Pushdown', 'Overhead Cable Extension']
const PULL = ['Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'Face Pull', 'Barbell Shrug', 'Barbell Curl', 'Hammer Curl']
const LEGS = ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Extension', 'Lying Leg Curl', 'Standing Calf Raise Machine', 'Cable Crunch']

export const SPLITS: Split[] = [
  {
    id: 'ppl', name: 'Push / Pull / Legs', note: '3 or 6 days a week',
    days: [
      { name: 'Push', muscles: ['Chest', 'Shoulders', 'Triceps'], exercises: PUSH },
      { name: 'Pull', muscles: ['Back', 'Traps', 'Biceps', 'Forearms'], exercises: PULL },
      { name: 'Legs', muscles: ['Quads', 'Hamstrings', 'Calves', 'Abs'], exercises: LEGS },
    ],
  },
  {
    id: 'upper-lower', name: 'Upper / Lower', note: '4 days a week',
    days: [
      {
        name: 'Upper', muscles: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'],
        exercises: ['Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Lat Pulldown', 'Incline Dumbbell Press', 'Dumbbell Lateral Raise', 'Barbell Curl', 'Rope Pushdown'],
      },
      {
        name: 'Lower', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs'],
        exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Lying Leg Curl', 'Barbell Hip Thrust', 'Standing Calf Raise Machine', 'Plank'],
      },
    ],
  },
  {
    id: 'full-body', name: 'Full Body', note: '2 to 3 days a week',
    days: [{
      name: 'Full Body', muscles: ['Quads', 'Chest', 'Back', 'Shoulders', 'Hamstrings', 'Abs'],
      exercises: ['Back Squat', 'Barbell Bench Press', 'Barbell Row', 'Overhead Press', 'Romanian Deadlift', 'Pull-Up', 'Plank'],
    }],
  },
  {
    id: 'bro', name: 'Body Part (Bro Split)', note: '5 days a week',
    days: [
      { name: 'Chest', muscles: ['Chest'], exercises: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Chest Press Machine', 'Cable Crossover', 'Chest Dip'] },
      { name: 'Back', muscles: ['Back', 'Traps'], exercises: ['Deadlift', 'Pull-Up', 'Barbell Row', 'Lat Pulldown', 'Seated Cable Row', 'Barbell Shrug'] },
      { name: 'Shoulders', muscles: ['Shoulders'], exercises: ['Overhead Press', 'Dumbbell Lateral Raise', 'Rear Delt Dumbbell Fly', 'Face Pull', 'Arnold Press', 'Dumbbell Shrug'] },
      { name: 'Arms', muscles: ['Biceps', 'Triceps', 'Forearms'], exercises: ['Barbell Curl', 'Hammer Curl', 'Incline Dumbbell Curl', 'Skull Crusher', 'Rope Pushdown', 'Overhead Dumbbell Extension'] },
      { name: 'Legs', muscles: ['Quads', 'Hamstrings', 'Calves', 'Abs'], exercises: LEGS },
    ],
  },
  {
    id: 'arnold', name: 'Arnold Split', note: '6 days a week',
    days: [
      { name: 'Chest & Back', muscles: ['Chest', 'Back'], exercises: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Dumbbell Fly', 'Pull-Up', 'Barbell Row', 'Seated Cable Row'] },
      { name: 'Shoulders & Arms', muscles: ['Shoulders', 'Biceps', 'Triceps'], exercises: ['Overhead Press', 'Dumbbell Lateral Raise', 'Rear Delt Dumbbell Fly', 'Barbell Curl', 'Hammer Curl', 'Close-Grip Bench Press', 'Rope Pushdown'] },
      { name: 'Legs', muscles: ['Quads', 'Hamstrings', 'Calves', 'Abs'], exercises: LEGS },
    ],
  },
]

/** The built-in exercises behind a split day's suggested names. */
export const splitDayExercises = (day: SplitDay): Exercise[] =>
  day.exercises.map((n) => EXERCISES.find((e) => e.name === n)).filter((e): e is Exercise => Boolean(e))

export interface ExerciseFilter {
  query?: string
  muscle?: Muscle | null
  /** Equipment the user has. Empty or missing = everything. */
  equipment?: Equipment[]
}

/** Exercises matching a search text, a muscle (primary only) and the user's equipment. */
export function filterExercises({ query = '', muscle = null, equipment = [] }: ExerciseFilter): Exercise[] {
  const q = query.trim().toLowerCase()
  const all = CUSTOM.length ? [...EXERCISES, ...CUSTOM].sort((a, b) => a.name.localeCompare(b.name)) : EXERCISES
  return all.filter((e) =>
    (!muscle || e.muscle === muscle) &&
    (equipment.length === 0 || equipment.includes(e.equipment)) &&
    (!q || e.name.toLowerCase().includes(q) || e.equipment.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q)),
  )
}

/**
 * Swaps for an exercise: the same primary muscle, other exercises, limited to
 * the equipment the user has. Ones that share secondary muscles come first,
 * then other equipment types before more of the same.
 */
export function findAlternatives(id: string, equipment: Equipment[] = []): Exercise[] {
  const base = getExercise(id)
  if (!base) return []
  const overlap = (e: Exercise) => e.secondary.filter((m) => base.secondary.includes(m)).length
  return filterExercises({ muscle: base.muscle, equipment })
    .filter((e) => e.id !== id)
    .sort((a, b) =>
      overlap(b) - overlap(a) ||
      Number(a.equipment === base.equipment) - Number(b.equipment === base.equipment) ||
      a.name.localeCompare(b.name),
    )
}
