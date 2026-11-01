import { normalize } from './text'

/** Part des mots de la phrase cible retrouvés dans le texte reconnu (comparaison de TEXTE, pas de prononciation). */
export function wordMatch(target: string, spoken: string): { pct: number; missing: string[] } {
  const t = normalize(target).split(' ').filter(Boolean)
  const s = new Set(normalize(spoken).split(' ').filter(Boolean))
  if (!t.length) return { pct: 0, missing: [] }
  const missing = t.filter((w) => !s.has(w))
  return { pct: Math.round((100 * (t.length - missing.length)) / t.length), missing }
}
