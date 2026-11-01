import type { AttemptRec, SessionRec } from '../storage/db'
import { dayKeyOffset } from '../../utils/text'

export interface Stats {
  sessions: number
  minutes: number
  successRate: number | null
  streak: number
  todayMinutes: number
  weekMinutes: number
  last7: { day: string; minutes: number }[]
  bySkill: Record<string, { ok: number; n: number }>
}

/** Calcule les statistiques UNIQUEMENT à partir des enregistrements (minutes de pratique active). */
export function computeStats(sessions: SessionRec[], attempts: AttemptRec[], now = new Date()): Stats {
  const byDay = new Map<string, number>()
  let minutes = 0
  for (const s of sessions) {
    byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.minutes)
    minutes += s.minutes
  }
  const today = dayKeyOffset(0, now)
  let streak = 0
  for (let i = 0; i < 3650; i++) {
    const k = dayKeyOffset(i, now)
    if ((byDay.get(k) ?? 0) > 0) streak++
    else if (i === 0) continue // aujourd'hui pas encore pratiqué : la série d'hier compte
    else break
  }
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = dayKeyOffset(6 - i, now)
    return { day, minutes: byDay.get(day) ?? 0 }
  })
  const bySkill: Stats['bySkill'] = {}
  let ok = 0
  let counted = 0
  for (const a of attempts) {
    if (a.ref.startsWith('pre:')) continue // les pré-tests (avant la leçon) ne comptent pas dans la réussite
    counted++
    const b = (bySkill[a.skill] ??= { ok: 0, n: 0 })
    b.n++
    if (a.correct) {
      b.ok++
      ok++
    }
  }
  return {
    sessions: sessions.length,
    minutes,
    successRate: counted ? Math.round((100 * ok) / counted) : null,
    streak,
    todayMinutes: byDay.get(today) ?? 0,
    weekMinutes: last7.reduce((s, d) => s + d.minutes, 0),
    last7,
    bySkill,
  }
}
