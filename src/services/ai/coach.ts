import type { CoachResult } from '../../types'
import { parseJSONObject, type AIProvider } from './provider'

export const DEFAULT_PROFILE =
  'an environmental engineer in a pipeline construction and maintenance company in the Algerian oil and gas sector. Needs English for site inspections, waste, water, soil and pollution topics, spills, PPE, ISO 14001, emails and reports, and for talking with foreign welders, supervisors and subcontractors.'

export type CoachKind = 'chat' | string

export function coachSystem(kind: CoachKind, profile: string, level: string): string {
  return (
    `You are "Coach", a patient English teacher for a French-speaking learner. Learner profile: ${profile || DEFAULT_PROFILE} Estimated level: ${level || 'unknown, infer it from the text'}.\n` +
    'Rules: reply ONLY with a JSON object. Be precise and brief. Write explanations in French and examples in English tied to real work (environment, waste, spills, inspections, PPE, pipelines). ' +
    'If the text is already correct, say so in explanation_fr and return an empty errors list: never invent errors. Classify each error as one of "grammaire", "vocabulaire", "formulation", "compréhension". ' +
    'You only see text: never comment on pronunciation. If a technical translation is uncertain, say so. Never ask for confidential company data.\n' +
    'JSON schema: {"corrected":string,"natural":string,"explanation_fr":string,"errors":[{"type":string,"original":string,"fix":string}],"vocab":[{"en":string,"fr":string}],"drill":string,"followup":string}\n' +
    (kind === 'chat'
      ? '"followup" must be exactly ONE short question in English that continues the conversation at the learner\'s level.'
      : `"followup" must be an empty string. The learner wrote a ${kind}: keep its meaning and do not add facts.`)
  )
}

const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : [])
const str = (x: unknown): string => (typeof x === 'string' ? x : '')

/** Normalise la réponse du modèle : champs manquants ou mal typés ne cassent pas l'affichage. */
export function normalizeCoach(o: Record<string, unknown>): CoachResult {
  return {
    corrected: str(o.corrected),
    natural: str(o.natural),
    explanation_fr: str(o.explanation_fr),
    errors: arr<Record<string, unknown>>(o.errors).filter((e) => e && str(e.original)).map((e) => ({ type: str(e.type) || 'formulation', original: str(e.original), fix: str(e.fix) })),
    vocab: arr<Record<string, unknown>>(o.vocab).filter((v) => v && str(v.en) && str(v.fr)).map((v) => ({ en: str(v.en), fr: str(v.fr) })),
    drill: str(o.drill),
    followup: str(o.followup),
  }
}

export async function coachTurn(p: AIProvider, opts: { kind: CoachKind; profile: string; level: string; userContent: string; maxTokens?: number }): Promise<CoachResult> {
  const text = await p.complete({
    system: coachSystem(opts.kind, opts.profile, opts.level),
    messages: [{ role: 'user', content: opts.userContent }],
    json: true,
    maxTokens: opts.maxTokens ?? 2048,
  })
  return normalizeCoach(parseJSONObject<Record<string, unknown>>(text))
}

export interface RoleReply { reply: string; correction: { corrected: string; note_fr: string } | null }

export function roleSystem(sc: { title: string; context: string; userRole: string; partnerRole: string }, profile: string, level: string): string {
  return (
    `You are role-playing "${sc.partnerRole}" in this scenario: ${sc.context} The learner plays: ${sc.userRole}. Learner profile: ${profile || DEFAULT_PROFILE} Estimated level: ${level || 'unknown'}.\n` +
    'Stay in character. Speak English in 1 to 3 short sentences, ask at most one question, react to what the learner actually said and adapt your vocabulary to their level. ' +
    'Do not invent company names, real data, figures or regulations; keep any numbers generic. If the learner made a notable language error, fill "correction" with {"corrected":string,"note_fr":string} (short, in French), otherwise null. Never comment on pronunciation.\n' +
    'Reply ONLY with JSON: {"reply":string,"correction":null or {"corrected":string,"note_fr":string}}'
  )
}

export async function roleTurn(p: AIProvider, sc: Parameters<typeof roleSystem>[0], profile: string, level: string, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<RoleReply> {
  const o = parseJSONObject<Record<string, unknown>>(await p.complete({ system: roleSystem(sc, profile, level), messages, json: true, maxTokens: 1024 }))
  const c = o.correction as Record<string, unknown> | null
  return { reply: str(o.reply).trim(), correction: c && str(c.corrected) ? { corrected: str(c.corrected), note_fr: str(c.note_fr) } : null }
}

export interface Evaluation { summary_fr: string; level_estimate: string; strengths: string[]; to_improve: { point: string; example: string }[]; expressions: { en: string; fr: string }[] }

export async function evaluateScenario(p: AIProvider, title: string, transcript: string): Promise<Evaluation> {
  const system =
    `You evaluate a role-play transcript for a French-speaking learner of professional English. Scenario: ${title}. Base every point only on what the learner actually wrote. If the learner wrote fewer than 3 messages, say that the estimate is unreliable. No pronunciation feedback. Feedback in French, examples in English.\n` +
    'Reply ONLY with JSON: {"summary_fr":string,"level_estimate":string,"strengths":[string],"to_improve":[{"point":string,"example":string}],"expressions":[{"en":string,"fr":string}]}'
  const o = parseJSONObject<Record<string, unknown>>(await p.complete({ system, messages: [{ role: 'user', content: transcript }], json: true }))
  return {
    summary_fr: str(o.summary_fr),
    level_estimate: str(o.level_estimate),
    strengths: arr<unknown>(o.strengths).map(str).filter(Boolean),
    to_improve: arr<Record<string, unknown>>(o.to_improve).map((x) => ({ point: str(x?.point), example: str(x?.example) })).filter((x) => x.point),
    expressions: arr<Record<string, unknown>>(o.expressions).map((x) => ({ en: str(x?.en), fr: str(x?.fr) })).filter((x) => x.en && x.fr),
  }
}
