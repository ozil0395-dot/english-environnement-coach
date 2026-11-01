import { describe, expect, it } from 'vitest'
import { computeStats } from '../../src/services/stats/stats'
import { isDue, newCard, review } from '../../src/services/stats/srs'
import { checkExercise } from '../../src/services/stats/exercises'
import { estimateLevel } from '../../src/utils/level'
import { normalize, dayKeyOffset } from '../../src/utils/text'
import { wordMatch } from '../../src/utils/wordMatch'
import { localCheck } from '../../src/services/ai/localRules'
import { mcq, fill } from '../../src/data/builders'

const now = new Date('2026-10-30T12:00:00')
const sess = (offset: number, minutes: number) => ({ date: dayKeyOffset(offset, now), ts: 0, minutes, kind: 'x' })

describe('statistiques', () => {
  it('renvoie des zéros sans données (rien d\'inventé)', () => {
    const s = computeStats([], [], now)
    expect(s).toMatchObject({ sessions: 0, minutes: 0, successRate: null, streak: 0, todayMinutes: 0, weekMinutes: 0 })
    expect(s.last7).toHaveLength(7)
  })
  it('calcule minutes, série et taux de réussite', () => {
    const s = computeStats([sess(0, 5), sess(1, 10), sess(2, 3), sess(5, 20)], [
      { ts: 1, skill: 'grammaire', correct: true, ref: 'a' }, { ts: 2, skill: 'grammaire', correct: false, ref: 'b' }, { ts: 3, skill: 'oral', correct: true, ref: 'c' }, { ts: 4, skill: 'oral', correct: true, ref: 'd' },
    ], now)
    expect(s.minutes).toBe(38); expect(s.streak).toBe(3); expect(s.todayMinutes).toBe(5); expect(s.weekMinutes).toBe(38)
    expect(s.successRate).toBe(75); expect(s.bySkill.grammaire).toEqual({ ok: 1, n: 2 })
  })
  it('la série d\'hier compte si aujourd\'hui n\'est pas encore pratiqué', () => {
    expect(computeStats([sess(1, 5), sess(2, 5)], [], now).streak).toBe(2)
  })
  it('la série est interrompue par un jour sans pratique', () => {
    expect(computeStats([sess(0, 5), sess(2, 5)], [], now).streak).toBe(1)
  })
})

describe('révision espacée', () => {
  it('une carte oubliée revient dans 10 minutes et devient difficile', () => {
    const t = 1_000_000, c = review({ ...newCard('a', t), reps: 3, interval: 6 }, 0, t)
    expect(c.reps).toBe(0); expect(c.due).toBe(t + 600_000); expect(c.hard).toBe(true); expect(isDue(c, t + 600_000)).toBe(true)
  })
  it('les intervalles augmentent avec les bonnes réponses', () => {
    const t = 0; let c = newCard('a', t)
    const intervals: number[] = []
    for (let i = 0; i < 4; i++) { c = review(c, 2, t); intervals.push(c.interval) }
    expect(intervals[0]).toBe(1); expect(intervals[1]).toBe(6); expect(intervals[2]).toBeGreaterThan(6); expect(intervals[3]).toBeGreaterThan(intervals[2])
  })
  it('« facile » espace plus que « difficile »', () => {
    expect(review(newCard('a', 0), 3, 0).interval).toBeGreaterThan(review(newCard('a', 0), 1, 0).interval - 1)
  })
})

describe('correction des exercices', () => {
  const f = fill('x', 'p', ['at', 'for'], 'e')
  it('ignore la casse, la ponctuation et les accents', () => { expect(checkExercise(f, '  AT. ')).toBe(true); expect(checkExercise(f, 'for!')).toBe(true) })
  it('refuse une mauvaise ou vide réponse', () => { expect(checkExercise(f, 'in')).toBe(false); expect(checkExercise(f, '')).toBe(false) })
  it('corrige un QCM', () => { const m = mcq('m', 'p', ['am', 'is', 'are'], 1, 'e'); expect(checkExercise(m, 'is')).toBe(true); expect(checkExercise(m, 'am')).toBe(false) })
  it('normalize gère les apostrophes typographiques', () => { expect(normalize('Don’t  leave')).toBe("don't leave") })
})

describe('niveau estimé', () => {
  const b = (a: number[]) => Object.fromEntries(['A1', 'A2', 'B1', 'B2', 'C1'].map((l, i) => [l, { ok: a[i], n: 6 }]))
  it('tout juste → C1', () => expect(estimateLevel(b([6, 6, 6, 6, 6]))).toBe('C1'))
  it('s\'arrête au premier niveau raté', () => expect(estimateLevel(b([6, 5, 2, 6, 6]))).toBe('A2'))
  it('débutant → A1', () => expect(estimateLevel(b([2, 0, 0, 0, 0]))).toBe('A1'))
  it('4/6 suffit pour valider un niveau', () => expect(estimateLevel(b([6, 6, 4, 3, 0]))).toBe('B1'))
})

describe('divers', () => {
  it('wordMatch compte les mots retrouvés', () => { expect(wordMatch('Please keep the area clean', 'please keep area clean')).toEqual({ pct: 80, missing: ['the'] }) })
  it('règles locales corrigent « I am agree »', () => { const r = localCheck('I am agree with you'); expect(r.corrected).toBe('I agree with you'); expect(r.notes).toHaveLength(1) })
  it('règles locales : texte correct inchangé', () => { const r = localCheck('I agree with you'); expect(r.corrected).toBe('I agree with you'); expect(r.notes).toHaveLength(0) })
  it('règles locales : since + durée', () => { expect(localCheck('I work since 3 years').corrected).toContain('for 3 years') })
})
