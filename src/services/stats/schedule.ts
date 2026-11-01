const DAY = 86_400_000
/** Intervalles d'espacement en jours. Le dernier intervalle se répète : rien n'est jamais retiré. */
export const SCHEDULE_DAYS = [1, 3, 7, 14, 30, 60, 120]

/**
 * Première étude : revoir demain. Ensuite, une révision réussie (≥ 80 %) allonge l'intervalle ;
 * entre 50 et 80 % on reste au même intervalle ; en dessous de 50 % on repart de J+1.
 */
export function scheduleNext(prevStage: number | undefined, ratio: number, now = Date.now()): { stage: number; due: number } {
  let stage = 0
  if (prevStage !== undefined) {
    if (ratio >= 0.8) stage = Math.min(prevStage + 1, SCHEDULE_DAYS.length - 1)
    else if (ratio >= 0.5) stage = prevStage
    else stage = 0
  }
  return { stage, due: now + SCHEDULE_DAYS[stage] * DAY }
}
