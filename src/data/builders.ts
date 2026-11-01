import type { Exercise, Skill, VocabItem } from '../types'

export const V = (id: string, en: string, fr: string, ex: string, cat: string): VocabItem => ({ id, en, fr, ex, cat })

export const mcq = (id: string, prompt: string, options: string[], answerIdx: number, explanation: string, skill: Skill = 'grammaire'): Exercise =>
  ({ id, type: 'mcq', prompt, options, answers: [options[answerIdx]], explanation, skill })

export const fill = (id: string, prompt: string, answers: string[], explanation: string, skill: Skill = 'grammaire'): Exercise =>
  ({ id, type: 'fill', prompt, answers, explanation, skill })

export const tr = (id: string, prompt: string, answers: string[], explanation: string, skill: Skill = 'vocabulaire pro'): Exercise =>
  ({ id, type: 'translate', prompt, answers, explanation, skill })
