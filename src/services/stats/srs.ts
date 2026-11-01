import type { CardRec } from '../storage/db'

export type Grade = 0 | 1 | 2 | 3 // 0 = oublié, 1 = difficile, 2 = bien, 3 = facile
const DAY = 86_400_000
/** Aucune carte n'est jamais retirée : au-delà de 90 jours elle revient quand même (maintenance « pour toujours »). */
export const MAX_INTERVAL = 90

export function newCard(id: string, now = Date.now()): CardRec {
  return { id, due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0, fav: false, hard: false, seen: false }
}

/** Révision espacée simplifiée (variante SM-2). Fonction pure : renvoie une nouvelle fiche. */
export function review(card: CardRec, grade: Grade, now = Date.now()): CardRec {
  const c = { ...card, seen: true }
  if (grade === 0) {
    c.reps = 0
    c.lapses += 1
    c.interval = 0
    c.ease = Math.max(1.3, c.ease - 0.2)
    c.due = now + 10 * 60_000 // revoir dans 10 minutes
    c.hard = true
    return c
  }
  c.reps += 1
  c.ease = Math.max(1.3, c.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0))
  if (c.reps === 1) c.interval = grade === 1 ? 1 : grade === 3 ? 4 : 1
  else if (c.reps === 2) c.interval = grade === 1 ? 3 : grade === 3 ? 8 : 6
  else c.interval = Math.min(MAX_INTERVAL, Math.max(1, Math.round(c.interval * c.ease * (grade === 1 ? 0.8 : grade === 3 ? 1.3 : 1))))
  c.due = now + c.interval * DAY
  if (grade >= 2 && c.reps >= 3) c.hard = false
  return c
}

export const isDue = (c: CardRec, now = Date.now()): boolean => c.due <= now
