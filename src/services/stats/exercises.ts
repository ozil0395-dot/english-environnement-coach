import type { Exercise } from '../../types'
import { normalize } from '../../utils/text'

/** Correction locale d'un exercice. Pour un QCM, `given` est l'index de l'option (en texte). */
export function checkExercise(ex: Exercise, given: string): boolean {
  if (ex.type === 'mcq') return ex.answers.some((a) => normalize(a) === normalize(given))
  const g = normalize(given)
  if (!g) return false
  return ex.answers.some((a) => normalize(a) === g)
}
