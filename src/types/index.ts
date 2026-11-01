export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export type Skill = 'grammaire' | 'vocabulaire' | 'vocabulaire pro' | 'lecture' | 'ecoute' | 'ecriture' | 'oral'

export interface VocabItem {
  id: string
  en: string
  fr: string
  ex: string
  cat: string
}

export type ExerciseType = 'mcq' | 'fill' | 'translate'

export interface Exercise {
  id: string
  type: ExerciseType
  prompt: string
  options?: string[]
  /** Réponses acceptées (comparaison sans casse ni ponctuation pour fill/translate). */
  answers: string[]
  explanation: string
  skill: Skill
}

export interface Lesson {
  id: string
  title: string
  goals: string[]
  vocab: VocabItem[]
  examples: string[]
  exercises: Exercise[]
}

export interface Module {
  id: number
  title: string
  level: Level
  summary: string
  lessons: Lesson[]
}

export interface PlacementQuestion {
  id: string
  level: Level
  skill: Skill
  prompt: string
  /** Texte à lire (compréhension écrite) ou à écouter (compréhension orale). */
  passage?: string
  listen?: boolean
  options: string[]
  answer: number
  explanation: string
}

export interface Scenario {
  id: string
  title: string
  level: string
  objective: string
  context: string
  userRole: string
  partnerRole: string
  vocab: string[]
  opening: string
  /** Répliques préconstruites pour le mode sans IA. */
  script: { partner: string; hint: string; keywords: string[] }[]
  phrases: string[]
}

export interface CoachResult {
  corrected: string
  natural: string
  explanation_fr: string
  errors: { type: string; original: string; fix: string }[]
  vocab: { en: string; fr: string }[]
  drill: string
  followup: string
}
