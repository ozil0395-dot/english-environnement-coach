import Dexie, { type Table } from 'dexie'

export interface SessionRec { id?: number; date: string; ts: number; minutes: number; kind: string }
export interface AttemptRec { id?: number; ts: number; skill: string; correct: boolean; ref: string; confident?: boolean }
export interface CardRec { id: string; due: number; interval: number; ease: number; reps: number; lapses: number; fav: boolean; hard: boolean; seen: boolean }
export interface ErrorRec { key: string; count: number; last: number; type: string; original: string; fix: string }
export interface CustomWord { en: string; fr: string; ts: number }
export interface HistoryRec { id?: number; ts: number; kind: string; q: string; a: string }
export interface LessonDone { lessonId: string; score: number; total: number; ts: number }
export interface TestResult { id?: number; ts: number; level: string; correct: number; total: number; bySkill: Record<string, { ok: number; n: number }> }
export interface ReviewRec { key: string; stage: number; due: number; last: number; ratio: number }
export interface ReflectionRec { id?: number; ts: number; kind: string; worked: string; failed: string; change: string }
export interface PredictionRec { id?: number; ts: number; kind: string; ref: string; predicted: number; actual: number; total: number }
export interface SettingRec { key: string; value: unknown }

export class AppDB extends Dexie {
  sessions!: Table<SessionRec, number>
  attempts!: Table<AttemptRec, number>
  cards!: Table<CardRec, string>
  errors!: Table<ErrorRec, string>
  customWords!: Table<CustomWord, string>
  history!: Table<HistoryRec, number>
  lessonsDone!: Table<LessonDone, string>
  tests!: Table<TestResult, number>
  settings!: Table<SettingRec, string>
  reviews!: Table<ReviewRec, string>
  reflections!: Table<ReflectionRec, number>
  predictions!: Table<PredictionRec, number>

  constructor(name = 'english-hse-coach') {
    super(name)
    this.version(1).stores({
      sessions: '++id, date, ts',
      attempts: '++id, ts, skill',
      cards: 'id, due, fav, hard',
      errors: 'key, count',
      customWords: 'en',
      history: '++id, ts',
      lessonsDone: 'lessonId',
      tests: '++id, ts',
      settings: 'key',
    })
    this.version(2).stores({ reviews: 'key, due', reflections: '++id, ts', predictions: '++id, ts' })
  }
}

export const db = new AppDB()
export const TABLES = ['sessions', 'attempts', 'cards', 'errors', 'customWords', 'history', 'lessonsDone', 'tests', 'settings', 'reviews', 'reflections', 'predictions'] as const
