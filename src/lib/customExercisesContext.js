// The user's own exercises (mt.customExercises), shared with the exercise
// picker. App owns the saved list and provides it around the Workout tab, so
// the picker, the routine editor and the workout screen all see one copy.
import { createContext } from 'react'

export const CustomExercisesContext = createContext({ list: [], setList: () => {} })
