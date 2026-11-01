import { describe, expect, it } from 'vitest'
import { SCHEDULE_DAYS, scheduleNext } from '../../src/services/stats/schedule'
import { calibrationAdvice, computeCalibration, predictionGap } from '../../src/services/stats/calibration'
import { feedbackMessage } from '../../src/services/stats/feedback'
import { buildMixedSession, vocabToExercise } from '../../src/services/stats/mixed'
import { computeStats } from '../../src/services/stats/stats'
import { MAX_INTERVAL, newCard, review } from '../../src/services/stats/srs'
import { checkExercise } from '../../src/services/stats/exercises'
import { MODULES } from '../../src/data/curriculum/modules'
import { GRAMMAR } from '../../src/data/exercises/grammar'
import { VOCAB } from '../../src/data/vocabulary/bank'
import { AppDB } from '../../src/services/storage/db'
import { exportAll, importAll } from '../../src/services/export/backup'
import { scheduleReview, saveReflection, savePrediction, logAttempt } from '../../src/services/storage/repo'
import { db } from '../../src/services/storage/db'

const DAY = 86_400_000
const at = (n: number): { key: string; ratio: number } => ({ key: 'k', ratio: n })
void at

describe('espacement des leçons (J+1, J+3, J+7, J+14, J+30)', () => {
  it('première étude → revoir demain', () => { const r = scheduleNext(undefined, 1, 0); expect(r).toEqual({ stage: 0, due: DAY }) })
  it('les réussites successives suivent 1, 3, 7, 14, 30 jours', () => {
    let stage: number | undefined; const days: number[] = []
    for (let i = 0; i < 5; i++) { const r = scheduleNext(stage, 0.9, 0); stage = r.stage; days.push(r.due / DAY) }
    expect(days).toEqual([1, 3, 7, 14, 30])
  })
  it('un score moyen garde l\'intervalle, un score faible repart de J+1', () => {
    expect(scheduleNext(3, 0.6, 0).stage).toBe(3); expect(scheduleNext(3, 0.2, 0).stage).toBe(0)
  })
  it('rien n\'est jamais retiré : le dernier intervalle se répète', () => {
    const last = SCHEDULE_DAYS.length - 1; expect(scheduleNext(last, 1, 0).stage).toBe(last)
  })
  it('les cartes de vocabulaire ont un intervalle plafonné mais restent planifiées', () => {
    let c = { ...newCard('a', 0), reps: 10, interval: 80, ease: 2.5 }; c = review(c, 3, 0)
    expect(c.interval).toBe(MAX_INTERVAL); expect(c.due).toBe(MAX_INTERVAL * DAY)
  })
})

describe('calibration', () => {
  const a = (confident: boolean | undefined, correct: boolean, ref = 'x') => ({ ts: 0, skill: 's', correct, ref, confident })
  it('compte sûr/pas sûr, sur-confiance et sous-confiance, hors pré-tests', () => {
    const c = computeCalibration([a(true, true), a(true, false), a(false, true), a(false, false), a(undefined, true), a(true, false, 'pre:1')])
    expect(c).toEqual({ n: 4, sureN: 2, sureOk: 1, unsureN: 2, unsureOk: 1, overconfident: 1, underconfident: 1 })
  })
  it('pas assez de données → pas de conclusion', () => { expect(calibrationAdvice(computeCalibration([a(true, true)]))).toContain('Pas encore assez') })
  it('détecte la sur-confiance', () => {
    const rows = [...Array(6)].map((_, i) => a(true, i < 3)).concat([...Array(5)].map(() => a(false, true)))
    expect(calibrationAdvice(computeCalibration(rows))).toContain('surestimes')
  })
  it('détecte la sous-confiance', () => {
    const rows = [...Array(6)].map(() => a(true, true)).concat([...Array(5)].map(() => a(false, true)))
    expect(calibrationAdvice(computeCalibration(rows))).toContain('sous-estimes')
  })
  it('écart de prédiction', () => {
    expect(predictionGap(8, 5, 10)).toContain('surestimé de 3'); expect(predictionGap(3, 5, 10)).toContain('sous-estimé de 2'); expect(predictionGap(5, 5, 10)).toContain('exacte')
  })
})

describe('messages de feedback', () => {
  it('l\'erreur est présentée comme utile, jamais comme un manque de talent', () => {
    for (const c of [true, false, undefined]) for (const ok of [true, false]) { const m = feedbackMessage(ok, c as boolean | undefined); expect(m.length).toBeGreaterThan(20); expect(m.toLowerCase()).not.toMatch(/nul|stupide|talent|intelligen/) }
    expect(feedbackMessage(false, true)).toContain('forte confiance')
  })
})

describe('session entrelacée', () => {
  const pools = {
    lessons: MODULES.slice(0, 3).map((m) => ({ key: `lesson:${m.lessons[0].id}`, lesson: m.lessons[0] })),
    grammar: GRAMMAR.slice(0, 2).map((g) => ({ key: `grammar:${g.id}`, topic: g })),
    vocab: VOCAB, errors: [{ key: 'k', count: 2, last: 0, type: 'grammaire', original: 'I am agree', fix: 'I agree' }],
  }
  it('mélange plusieurs sources sans enchaîner deux fois la même', () => {
    const s = buildMixedSession(pools, 14)
    expect(s).toHaveLength(14); expect(new Set(s.map((x) => x.src)).size).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < s.length; i++) expect(s[i].src).not.toBe(s[i - 1].src)
  })
  it('inclut les erreurs de l\'utilisateur et du vocabulaire de production', () => {
    const s = buildMixedSession(pools, 20)
    expect(s.some((x) => x.src === 'errors')).toBe(true); expect(s.some((x) => x.ex.id.startsWith('v:'))).toBe(true)
  })
  it('reste correct avec une seule source', () => { expect(buildMixedSession({ lessons: [pools.lessons[0]], grammar: [], vocab: [], errors: [] }, 4).length).toBe(4) })
  it('reproductible avec un générateur donné et sans pool → vide', () => {
    expect(buildMixedSession({ lessons: [], grammar: [], vocab: [], errors: [] })).toEqual([])
    let x = 1; const rng = () => (x = (x * 16807) % 2147483647) / 2147483647
    const a = buildMixedSession(pools, 8, rng); x = 1; const b = buildMixedSession(pools, 8, rng)
    expect(a.map((i) => i.ex.id)).toEqual(b.map((i) => i.ex.id))
  })
  it('les exercices de vocabulaire sont corrigeables avec leur propre réponse', () => {
    for (const v of VOCAB) for (const cloze of [false, true]) { const e = vocabToExercise(v, cloze); for (const ans of e.answers) expect(checkExercise(e, ans), e.id).toBe(true) }
  })
})

describe('statistiques : pré-tests exclus', () => {
  it('le pré-test (avant la leçon) ne fausse pas le taux de réussite', () => {
    const s = computeStats([], [{ ts: 1, skill: 'g', correct: false, ref: 'pre:a' }, { ts: 2, skill: 'g', correct: true, ref: 'a' }])
    expect(s.successRate).toBe(100); expect(s.bySkill.g).toEqual({ ok: 1, n: 1 })
  })
})

describe('persistance des nouvelles données', () => {
  it('planifie une révision, enregistre réflexion, prédiction et confiance', async () => {
    const due = await scheduleReview('lesson:x', 0.9, 0)
    expect(due).toBe(DAY); expect((await db.reviews.get('lesson:x'))?.stage).toBe(0)
    expect(await scheduleReview('lesson:x', 0.9, DAY)).toBe(DAY + 3 * DAY)
    await saveReflection('lesson', 'a', 'b', 'c'); await savePrediction('lesson', 'x', 4, 3, 5); await logAttempt('g', true, 'q', false)
    expect(await db.reflections.count()).toBe(1); expect((await db.predictions.toArray())[0]).toMatchObject({ predicted: 4, actual: 3 })
    expect((await db.attempts.toArray()).at(-1)?.confident).toBe(false)
  })
  it('export/import inclut les nouvelles tables et accepte une ancienne sauvegarde (v1)', async () => {
    const a = new AppDB('new-a'), b = new AppDB('new-b')
    await a.reviews.put({ key: 'lesson:z', stage: 2, due: 5, last: 1, ratio: 1 }); await a.reflections.add({ ts: 1, kind: 'k', worked: 'w', failed: 'f', change: 'c' })
    await importAll(b, JSON.parse(JSON.stringify(await exportAll(a))))
    expect((await b.reviews.get('lesson:z'))?.stage).toBe(2); expect(await b.reflections.count()).toBe(1)
    await importAll(b, { app: 'english-hse-coach', version: 1, exportedAt: '', data: { sessions: [{ date: 'd', ts: 1, minutes: 2, kind: 'k' }] } })
    expect(await b.sessions.count()).toBe(1); expect(await b.reviews.count()).toBe(0)
  })
})
