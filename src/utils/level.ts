import type { Level } from '../types'

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']

/** Niveau estimé : le plus haut niveau atteint en continu (≥ 4 bonnes réponses sur 6 par niveau). */
export function estimateLevel(byLevel: Record<string, { ok: number; n: number }>): Level {
  let est: Level = 'A1'
  for (const l of LEVELS) {
    const b = byLevel[l]
    if (!b || b.n === 0) break
    if (b.ok / b.n >= 0.66) est = l
    else break
  }
  return est
}

export const nextLevel = (l: Level): Level => LEVELS[Math.min(LEVELS.indexOf(l) + 1, LEVELS.length - 1)]
