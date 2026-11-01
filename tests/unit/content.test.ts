import { describe, expect, it } from 'vitest'
import { MODULES } from '../../src/data/curriculum/modules'
import { GRAMMAR } from '../../src/data/exercises/grammar'
import { PLACEMENT } from '../../src/data/exercises/placement'
import { SCENARIOS } from '../../src/data/scenarios/scenarios'
import { INTERVIEW } from '../../src/data/exercises/interview'
import { VOCAB } from '../../src/data/vocabulary/bank'
import { checkExercise } from '../../src/services/stats/exercises'
import type { Exercise } from '../../src/types'

const allEx: Exercise[] = [...MODULES.flatMap((m) => m.lessons.flatMap((l) => l.exercises)), ...GRAMMAR.flatMap((g) => g.exercises)]

describe('intégrité du contenu', () => {
  it('12 modules, 15 scénarios, 8 leçons de grammaire, 12 questions d\'entretien', () => {
    expect(MODULES).toHaveLength(12); expect(SCENARIOS).toHaveLength(15); expect(GRAMMAR).toHaveLength(8); expect(INTERVIEW).toHaveLength(12)
    expect(SCENARIOS.map((s) => s.id).join('')).toBe('ABCDEFGHIJKLMNO')
  })
  it('identifiants uniques', () => {
    for (const ids of [allEx.map((e) => e.id), VOCAB.map((v) => v.id), PLACEMENT.map((p) => p.id)]) expect(new Set(ids).size).toBe(ids.length)
  })
  it('chaque exercice est corrigeable avec sa propre réponse', () => {
    for (const e of allEx) { expect(e.answers.length, e.id).toBeGreaterThan(0); for (const a of e.answers) expect(checkExercise(e, a), `${e.id}:${a}`).toBe(true); if (e.type === 'mcq') for (const a of e.answers) expect(e.options, e.id).toContain(a) }
  })
  it('chaque leçon a objectifs, vocabulaire, exemples et exercices', () => {
    for (const l of MODULES.flatMap((m) => m.lessons)) { expect(l.goals.length).toBeGreaterThan(0); expect(l.vocab.length).toBeGreaterThanOrEqual(5); expect(l.examples.length).toBeGreaterThan(0); expect(l.exercises.length).toBeGreaterThanOrEqual(5) }
  })
  it('test de niveau : 6 questions par niveau A1-C1, indices de réponse valides', () => {
    for (const l of ['A1', 'A2', 'B1', 'B2', 'C1']) expect(PLACEMENT.filter((p) => p.level === l)).toHaveLength(6)
    for (const p of PLACEMENT) { expect(p.answer).toBeLessThan(p.options.length); if (p.listen) expect(p.passage).toBeTruthy() }
    expect(PLACEMENT.some((p) => p.skill === 'ecoute')).toBe(true); expect(PLACEMENT.some((p) => p.skill === 'lecture')).toBe(true)
  })
  it('chaque scénario a objectif, contexte, rôles, vocabulaire, dialogue de secours et expressions', () => {
    for (const s of SCENARIOS) { for (const k of ['objective', 'context', 'userRole', 'partnerRole', 'opening'] as const) expect(s[k], `${s.id}.${k}`).toBeTruthy(); expect(s.vocab.length).toBeGreaterThan(0); expect(s.script).toHaveLength(3); expect(s.phrases.length).toBeGreaterThan(0); expect(s.script[0].partner).toBe(s.opening) }
  })
})
