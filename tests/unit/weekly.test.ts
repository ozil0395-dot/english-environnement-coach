import { describe, expect, it } from 'vitest'
import { weeklyReview } from '../../src/services/stats/weekly'
import type { AttemptRec, ErrorRec, SessionRec } from '../../src/services/storage/db'

const NOW = new Date('2026-10-31T12:00:00')
const day = 86_400_000
const att = (daysAgo: number, skill: string, correct: boolean): AttemptRec => ({ ts: NOW.getTime() - daysAgo * day, skill, correct, ref: 'x' })

describe('weeklyReview', () => {
  it('ne renvoie rien d\'inventé quand il n\'y a aucune donnée', () => {
    const r = weeklyReview([], [], [], NOW)
    expect(r.answers).toBe(0); expect(r.rate).toBeNull(); expect(r.best).toBeNull(); expect(r.weakest).toBeNull(); expect(r.topErrors).toEqual([])
  })
  it('calcule le taux de la semaine et celui de la semaine précédente', () => {
    const a = [att(1, 'grammaire', true), att(2, 'grammaire', true), att(3, 'grammaire', false), att(4, 'grammaire', true),
      ...Array.from({ length: 5 }, (_, i) => att(8 + i, 'grammaire', i < 2))]
    const r = weeklyReview(a, [], [], NOW)
    expect(r.answers).toBe(4); expect(r.rate).toBe(75); expect(r.prevRate).toBe(40)
  })
  it('ignore le taux précédent s\'il y a moins de 5 réponses', () => {
    expect(weeklyReview([att(1, 'oral', true), att(9, 'oral', true)], [], [], NOW).prevRate).toBeNull()
  })
  it('désigne la meilleure et la plus faible compétence seulement avec 3 réponses chacune', () => {
    const a = [...[true, true, true].map((c) => att(1, 'lecture', c)), ...[true, false, false].map((c) => att(1, 'oral', c)), att(1, 'ecoute', false)]
    const r = weeklyReview(a, [], [], NOW)
    expect(r.best).toEqual({ skill: 'lecture', pct: 100 }); expect(r.weakest).toEqual({ skill: 'oral', pct: 33 })
  })
  it('ne désigne personne avec une seule compétence suffisamment documentée', () => {
    const a = [true, true, false].map((c) => att(1, 'oral', c))
    const r = weeklyReview(a, [], [], NOW)
    expect(r.best).toBeNull(); expect(r.weakest).toBeNull()
  })
  it('somme les minutes et compte les jours actifs sur 7 jours', () => {
    const s: SessionRec[] = [
      { date: '2026-10-31', ts: 1, minutes: 5, kind: 'lesson' }, { date: '2026-10-31', ts: 2, minutes: 3, kind: 'review' },
      { date: '2026-10-29', ts: 3, minutes: 4, kind: 'voice' }, { date: '2026-10-01', ts: 4, minutes: 60, kind: 'lesson' },
    ]
    const r = weeklyReview([], s, [], NOW)
    expect(r.minutes).toBe(12); expect(r.activeDays).toBe(2)
  })
  it('retient les erreurs récentes les plus fréquentes', () => {
    const e: ErrorRec[] = [
      { key: 'a', count: 2, last: NOW.getTime() - day, type: 't', original: 'he go', fix: 'he goes' },
      { key: 'b', count: 5, last: NOW.getTime() - 2 * day, type: 't', original: 'I has', fix: 'I have' },
      { key: 'c', count: 9, last: NOW.getTime() - 30 * day, type: 't', original: 'old', fix: 'old fix' },
    ]
    expect(weeklyReview([], [], e, NOW).topErrors.map((x) => x.original)).toEqual(['I has', 'he go'])
  })
})
