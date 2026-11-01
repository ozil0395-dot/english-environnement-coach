/** Normalise une réponse pour la comparer : minuscules, sans accents ni ponctuation, espaces réduits. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const todayKey = (d = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const dayKeyOffset = (offset: number, from = new Date()): string => {
  const d = new Date(from)
  d.setDate(d.getDate() - offset)
  return todayKey(d)
}
