import type { Exercise, Lesson, VocabItem } from '../../types'
import type { ErrorRec } from '../storage/db'
import type { GrammarTopic } from '../../data/exercises/grammar'
import { fill, tr } from '../../data/builders'
import { normalize } from '../../utils/text'

export interface Item { ex: Exercise; src: string }

const stripParens = (s: string) => s.replace(/\(.*?\)/g, '').trim()

/** Transforme un mot en exercice de PRODUCTION (traduction ou phrase à compléter). */
export function vocabToExercise(v: VocabItem, cloze: boolean): Exercise {
  const target = stripParens(v.en)
  if (cloze && v.ex && normalize(v.ex).includes(normalize(target))) {
    const re = new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    return fill(`v:${v.id}:c`, `Complète : ${v.ex.replace(re, '_____')}`, [target], `Réponse : ${target} (${v.fr}).`, 'vocabulaire')
  }
  return tr(`v:${v.id}:t`, `Traduis en anglais : « ${v.fr} »`, [target, v.en], `Réponse : ${v.en}.`, 'vocabulaire')
}

export const errorToExercise = (e: ErrorRec, i: number): Exercise =>
  fill(`err-${i}`, `Corrige : « ${e.original} »`, [e.fix], `Correction : ${e.fix} (erreur de type ${e.type}, vue ${e.count} fois).`, 'grammaire')

export interface Pools {
  lessons: { key: string; lesson: Lesson }[]
  grammar: { key: string; topic: GrammarTopic }[]
  vocab: VocabItem[]
  errors: ErrorRec[]
}

function shuffle<T>(a: T[], rng: () => number): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

/**
 * Session ENTRELACÉE : mélange des sources différentes (leçons, grammaire, vocabulaire, erreurs)
 * en évitant d'enchaîner deux exercices de la même source quand c'est possible.
 */
export function buildMixedSession(pools: Pools, n = 12, rng: () => number = Math.random): Item[] {
  const buckets = new Map<string, Exercise[]>()
  for (const l of pools.lessons) buckets.set(l.key, shuffle(l.lesson.exercises, rng))
  for (const g of pools.grammar) buckets.set(g.key, shuffle(g.topic.exercises, rng))
  const v = shuffle(pools.vocab, rng).slice(0, Math.max(4, Math.ceil(n / 3)))
  if (v.length) buckets.set('vocab', v.map((x, i) => vocabToExercise(x, i % 2 === 1)))
  const errs = pools.errors.filter((e) => e.fix).slice(0, 4)
  if (errs.length) buckets.set('errors', errs.map(errorToExercise))
  // Quotas : les petits ensembles (erreurs) gardent leur place ; leçons et grammaire se partagent le reste.
  const fixed = (buckets.get('vocab')?.length ?? 0) + (buckets.get('errors')?.length ?? 0)
  const shared = [...buckets.keys()].filter((k) => k !== 'vocab' && k !== 'errors')
  const quota = shared.length ? Math.ceil(Math.max(0, n - fixed) / shared.length) : 0
  for (const k of shared) buckets.set(k, buckets.get(k)!.slice(0, Math.max(1, quota)))
  const initial = new Map([...buckets.entries()].map(([k, a]) => [k, a.length]))
  const out: Item[] = []
  let last = ''
  while (out.length < n) {
    const alive = [...buckets.entries()].filter(([, a]) => a.length)
    if (!alive.length) break
    const others = alive.filter(([k]) => k !== last)
    const cand = others.length ? others : alive
    // On vide tous les ensembles au même rythme relatif : les erreurs de l'utilisateur apparaissent tôt.
    const frac = (k: string, a: Exercise[]) => a.length / initial.get(k)!
    const best = Math.max(...cand.map(([k, a]) => frac(k, a)))
    const top = cand.filter(([k, a]) => frac(k, a) === best)
    const [key, arr] = top[Math.floor(rng() * top.length)]
    out.push({ ex: arr.shift()!, src: key })
    last = key
  }
  return out
}
