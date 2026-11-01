import type { AttemptRec } from '../storage/db'

export interface Calibration {
  n: number
  sureN: number; sureOk: number
  unsureN: number; unsureOk: number
  overconfident: number
  underconfident: number
}

/** Compare la confiance déclarée AVANT la réponse avec le résultat réel. Les pré-tests sont exclus. */
export function computeCalibration(attempts: AttemptRec[]): Calibration {
  const c: Calibration = { n: 0, sureN: 0, sureOk: 0, unsureN: 0, unsureOk: 0, overconfident: 0, underconfident: 0 }
  for (const a of attempts) {
    if (a.confident === undefined || a.ref.startsWith('pre:')) continue
    c.n++
    if (a.confident) { c.sureN++; if (a.correct) c.sureOk++; else c.overconfident++ }
    else { c.unsureN++; if (a.correct) { c.unsureOk++; c.underconfident++ } }
  }
  return c
}

export function calibrationAdvice(c: Calibration): string {
  if (c.n < 10) return 'Pas encore assez de réponses avec indication de confiance (il en faut au moins 10).'
  const sure = c.sureN ? c.sureOk / c.sureN : null
  const unsure = c.unsureN ? c.unsureOk / c.unsureN : null
  if (sure !== null && c.sureN >= 5 && sure < 0.7) return `Quand tu es sûr, tu as raison ${Math.round(sure * 100)} % du temps : tu te surestimes. Reviens sur ces points avec un test, pas avec une relecture.`
  if (unsure !== null && c.unsureN >= 5 && unsure >= 0.7) return `Même quand tu hésites, tu as raison ${Math.round(unsure * 100)} % du temps : tu te sous-estimes. Fais-toi confiance un peu plus.`
  return 'Ta confiance est plutôt bien calibrée : quand tu es sûr, tu as en général raison.'
}

export function predictionGap(predicted: number, actual: number, total: number): string {
  const d = predicted - actual
  if (d === 0) return `Prédiction exacte (${actual}/${total}).`
  return d > 0 ? `Tu avais prédit ${predicted}/${total}, résultat ${actual}/${total} : tu t'es surestimé de ${d}.` : `Tu avais prédit ${predicted}/${total}, résultat ${actual}/${total} : tu t'es sous-estimé de ${-d}.`
}
