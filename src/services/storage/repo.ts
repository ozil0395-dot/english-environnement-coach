import { db, type CardRec, type ErrorRec } from './db'
import { todayKey } from '../../utils/text'
import { scheduleNext } from '../stats/schedule'
import type { CoachResult } from '../../types'

export interface Settings {
  theme: 'light' | 'dark'
  dailyGoal: number
  weeklyGoal: number
  provider: 'none' | 'gemini' | 'ollama'
  geminiModel: string
  geminiConsent: boolean
  ollamaModel: string
  profile: string
  level: string
  /** Date (ms) de la dernière sauvegarde exportée ; 0 = jamais. */
  lastExport: number
  installHintDismissed: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light', dailyGoal: 10, weeklyGoal: 60, provider: 'none',
  geminiModel: 'gemini-3.1-flash-lite', geminiConsent: false, ollamaModel: '', profile: '', level: '', lastExport: 0, installHintDismissed: false,
}

export async function loadSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) s[r.key] = r.value
  // Migration : l'ancien modèle par défaut est remplacé par le nouveau (un autre choix de l'utilisateur est conservé).
  if (s.geminiModel === 'gemini-2.5-flash') s.geminiModel = DEFAULT_SETTINGS.geminiModel
  return s as unknown as Settings
}

export const saveSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => db.settings.put({ key, value })

/** Enregistre du temps de pratique ACTIVE (jamais le simple temps d'ouverture de l'application). */
export function logSession(kind: string, minutes: number) {
  return db.sessions.add({ date: todayKey(), ts: Date.now(), minutes: Math.max(0, Math.round(minutes)), kind })
}

export const logAttempt = (skill: string, correct: boolean, ref: string, confident?: boolean) => db.attempts.add({ ts: Date.now(), skill, correct, ref, ...(confident === undefined ? {} : { confident }) })

export async function bumpError(type: string, original: string, fix: string) {
  const key = `${type}|${original.slice(0, 80)}|${fix.slice(0, 80)}`
  const cur = await db.errors.get(key)
  const rec: ErrorRec = { key, type, original: original.slice(0, 80), fix: fix.slice(0, 80), count: (cur?.count ?? 0) + 1, last: Date.now() }
  await db.errors.put(rec)
}

export async function learnFromCoach(r: CoachResult) {
  for (const e of r.errors) await bumpError(e.type, e.original, e.fix)
  const count = await db.customWords.count()
  for (const v of r.vocab) if (count < 500) await db.customWords.put({ en: v.en.slice(0, 80), fr: v.fr.slice(0, 120), ts: Date.now() })
}

export async function getCard(id: string): Promise<CardRec | undefined> { return db.cards.get(id) }
export const putCard = (c: CardRec) => db.cards.put(c)
export const addHistory = (kind: string, q: string, a: string) => db.history.add({ ts: Date.now(), kind, q, a })

export const saveReflection = (kind: string, worked: string, failed: string, change: string) => db.reflections.add({ ts: Date.now(), kind, worked: worked.slice(0, 600), failed: failed.slice(0, 600), change: change.slice(0, 600) })
export const savePrediction = (kind: string, ref: string, predicted: number, actual: number, total: number) => db.predictions.add({ ts: Date.now(), kind, ref, predicted, actual, total })

/** Planifie la prochaine révision d'une leçon ou d'un point de grammaire (J+1, J+3, J+7…). */
export async function scheduleReview(key: string, ratio: number, now = Date.now()) {
  const prev = await db.reviews.get(key)
  const { stage, due } = scheduleNext(prev?.stage, ratio, now)
  await db.reviews.put({ key, stage, due, last: now, ratio })
  return due
}
