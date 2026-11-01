import { beforeEach, describe, expect, it } from 'vitest'
import { AppDB } from '../../src/services/storage/db'
import { clearAll, exportAll, importAll, validateBackup } from '../../src/services/export/backup'
import { setGeminiKey } from '../../src/services/ai/gemini'
import { db } from '../../src/services/storage/db'
import { loadSettings, logSession, saveSetting, DEFAULT_SETTINGS, bumpError, learnFromCoach } from '../../src/services/storage/repo'

let n = 0
const fresh = () => new AppDB(`t-${++n}-${Math.random()}`)

describe('sauvegarde et restauration', () => {
  it('export puis import restaure toutes les données', async () => {
    const a = fresh()
    await a.sessions.add({ date: '2026-10-30', ts: 1, minutes: 7, kind: 'lesson' })
    await a.lessonsDone.put({ lessonId: 'm1-l1', score: 4, total: 5, ts: 2 })
    await a.cards.put({ id: 'v1', due: 5, interval: 1, ease: 2.5, reps: 1, lapses: 0, fav: true, hard: false, seen: true })
    await a.customWords.put({ en: 'to agree', fr: 'être d\'accord', ts: 3 })
    const backup = JSON.parse(JSON.stringify(await exportAll(a)))
    const b = fresh()
    await importAll(b, backup)
    expect(await b.sessions.toArray()).toHaveLength(1)
    expect((await b.lessonsDone.get('m1-l1'))?.score).toBe(4)
    expect((await b.cards.get('v1'))?.fav).toBe(true)
    expect(await b.customWords.count()).toBe(1)
  })
  it('l\'import remplace les données existantes', async () => {
    const a = fresh(), b = fresh()
    await a.sessions.add({ date: 'd', ts: 1, minutes: 1, kind: 'k' })
    await b.sessions.bulkAdd([{ date: 'x', ts: 1, minutes: 9, kind: 'k' }, { date: 'y', ts: 2, minutes: 9, kind: 'k' }])
    await importAll(b, JSON.parse(JSON.stringify(await exportAll(a))))
    expect(await b.sessions.count()).toBe(1)
  })
  it('refuse les fichiers invalides sans rien modifier', async () => {
    const b = fresh(); await b.sessions.add({ date: 'x', ts: 1, minutes: 9, kind: 'k' })
    for (const bad of [null, 'x', {}, { app: 'autre', version: 1, data: {} }, { app: 'english-hse-coach', version: 99, data: {} }, { app: 'english-hse-coach', version: 1, data: { sessions: 'nope' } }]) {
      await expect(importAll(b, bad)).rejects.toThrow()
    }
    expect(await b.sessions.count()).toBe(1)
    expect(() => validateBackup({ app: 'english-hse-coach', version: 1, data: {} })).not.toThrow()
  })
  it('l\'export ne contient jamais la clé API', async () => {
    setGeminiKey('SECRET-KEY-123')
    const a = fresh(); await a.settings.put({ key: 'geminiModel', value: 'm' })
    expect(JSON.stringify(await exportAll(a))).not.toContain('SECRET-KEY-123')
    setGeminiKey('')
  })
  it('effacer vide toutes les tables', async () => {
    const a = fresh(); await a.sessions.add({ date: 'x', ts: 1, minutes: 1, kind: 'k' }); await clearAll(a)
    expect(await a.sessions.count()).toBe(0)
  })
})

describe('persistance (repo)', () => {
  beforeEach(async () => { await clearAll(db) })
  it('les réglages sont enregistrés et relus', async () => {
    expect((await loadSettings()).dailyGoal).toBe(DEFAULT_SETTINGS.dailyGoal)
    await saveSetting('dailyGoal', 25); await saveSetting('provider', 'ollama')
    const s = await loadSettings(); expect(s.dailyGoal).toBe(25); expect(s.provider).toBe('ollama')
  })
  it('crée et sauvegarde une séance', async () => {
    await logSession('lesson', 4); const all = await db.sessions.toArray()
    expect(all).toHaveLength(1); expect(all[0].minutes).toBe(4)
  })
  it('compte les erreurs répétées', async () => {
    await bumpError('grammaire', 'I am agree', 'I agree'); await bumpError('grammaire', 'I am agree', 'I agree')
    expect((await db.errors.toArray())[0].count).toBe(2)
  })
  it('apprend le vocabulaire proposé par le coach', async () => {
    await learnFromCoach({ corrected: '', natural: '', explanation_fr: '', errors: [{ type: 'grammaire', original: 'a', fix: 'b' }], vocab: [{ en: 'spill', fr: 'déversement' }], drill: '', followup: '' })
    expect(await db.customWords.count()).toBe(1); expect(await db.errors.count()).toBe(1)
  })
})
