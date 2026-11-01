import type { AttemptRec, ErrorRec, SessionRec } from '../storage/db'
import { dayKeyOffset } from '../../utils/text'

export interface WeeklyReview {
  /** Réponses enregistrées sur les 7 derniers jours. */
  answers: number
  /** Taux de réussite (en %) sur 7 jours, ou null s'il n'y a aucune réponse. */
  rate: number | null
  /** Taux de la semaine précédente, ou null s'il n'y a pas assez de réponses (moins de 5). */
  prevRate: number | null
  minutes: number
  activeDays: number
  /** Compétence la plus solide et la plus fragile (au moins 3 réponses chacune, et deux compétences différentes). */
  best: { skill: string; pct: number } | null
  weakest: { skill: string; pct: number } | null
  /** Erreurs les plus fréquentes enregistrées (jamais inventées). */
  topErrors: { original: string; fix: string; count: number }[]
}

const pct = (ok: number, n: number) => Math.round((100 * ok) / n)

/** Bilan calculé uniquement à partir des réponses et séances enregistrées : aucun chiffre n'est estimé ni inventé. */
export function weeklyReview(attempts: AttemptRec[], sessions: SessionRec[], errors: ErrorRec[], now = new Date()): WeeklyReview {
  const end = now.getTime()
  const week = 7 * 86_400_000
  const cur = attempts.filter((a) => a.ts > end - week && a.ts <= end)
  const prev = attempts.filter((a) => a.ts > end - 2 * week && a.ts <= end - week)
  const days = new Set([...Array(7).keys()].map((i) => dayKeyOffset(i, now)))
  const mine = sessions.filter((s) => days.has(s.date))
  const bySkill = new Map<string, { ok: number; n: number }>()
  for (const a of cur) { const b = bySkill.get(a.skill) ?? { ok: 0, n: 0 }; b.n++; if (a.correct) b.ok++; bySkill.set(a.skill, b) }
  const ranked = [...bySkill.entries()].filter(([, v]) => v.n >= 3).map(([skill, v]) => ({ skill, pct: pct(v.ok, v.n) })).sort((a, b) => b.pct - a.pct)
  const ok = cur.filter((a) => a.correct).length
  const pok = prev.filter((a) => a.correct).length
  return {
    answers: cur.length,
    rate: cur.length ? pct(ok, cur.length) : null,
    prevRate: prev.length >= 5 ? pct(pok, prev.length) : null,
    minutes: mine.reduce((s, x) => s + x.minutes, 0),
    activeDays: new Set(mine.filter((s) => s.minutes > 0).map((s) => s.date)).size,
    best: ranked.length >= 2 ? ranked[0] : null,
    weakest: ranked.length >= 2 ? ranked[ranked.length - 1] : null,
    topErrors: errors.filter((e) => e.fix && e.last > end - week).sort((a, b) => b.count - a.count).slice(0, 3).map((e) => ({ original: e.original, fix: e.fix, count: e.count })),
  }
}
