import { useEffect, useState } from 'react'
import { ExerciseRunner, PageHead, Pill } from './shared'
import { Reflection } from './learning'
import { ALL_LESSONS } from '../data/curriculum/modules'
import { GRAMMAR } from '../data/exercises/grammar'
import { VOCAB, VOCAB_BY_ID } from '../data/vocabulary/bank'
import { db } from '../services/storage/db'
import { logSession, putCard, scheduleReview } from '../services/storage/repo'
import { buildMixedSession, type Item, type Pools } from '../services/stats/mixed'
import { newCard, review } from '../services/stats/srs'
import { usePracticeTimer } from '../hooks/usePracticeTimer'

export type SessionKind = 'due' | 'mixed' | 'quick'

/** Construit les ensembles d'exercices : « du jour » (échéances atteintes) ou « mixte » (tout ce qui est étudié). */
export async function loadPools(kind: SessionKind): Promise<{ pools: Pools; dueCount: number }> {
  const now = Date.now()
  const [reviews, done, cards, errors] = await Promise.all([db.reviews.toArray(), db.lessonsDone.toArray(), db.cards.toArray(), db.errors.orderBy('count').reverse().limit(6).toArray()])
  const dueKeys = new Set(reviews.filter((r) => r.due <= now).map((r) => r.key))
  const doneIds = new Set(done.map((d) => d.lessonId))
  const seen = new Map(cards.map((c) => [c.id, c]))
  const dueCards = cards.filter((c) => c.seen && c.due <= now)
  const lessonsAll = ALL_LESSONS.filter((l) => doneIds.has(l.id)).map((l) => ({ key: `lesson:${l.id}`, lesson: l }))
  const grammarAll = GRAMMAR.filter((g) => reviews.some((r) => r.key === `grammar:${g.id}`)).map((g) => ({ key: `grammar:${g.id}`, topic: g }))
  const lessonsDue = lessonsAll.filter((l) => dueKeys.has(l.key)), grammarDue = grammarAll.filter((g) => dueKeys.has(g.key))
  const dueCount = lessonsDue.length + grammarDue.length + dueCards.length
  if ((kind === 'due' || kind === 'quick') && dueCount > 0) {
    const fresh = VOCAB.filter((v) => !seen.get(v.id)?.seen && lessonsAll.some((l) => l.lesson.vocab.some((x) => x.id === v.id))).slice(0, 4)
    return { pools: { lessons: lessonsDue, grammar: grammarDue, vocab: [...dueCards.map((c) => VOCAB_BY_ID.get(c.id)).filter((v) => !!v), ...fresh], errors }, dueCount }
  }
  // Session mixte : si rien n'a encore été étudié, on pioche dans tout le contenu pour ne jamais afficher un écran vide.
  const nothingYet = lessonsAll.length === 0 && grammarAll.length === 0
  return { pools: { lessons: nothingYet ? ALL_LESSONS.slice(0, 4).map((l) => ({ key: `lesson:${l.id}`, lesson: l })) : lessonsAll, grammar: nothingYet ? GRAMMAR.slice(0, 2).map((g) => ({ key: `grammar:${g.id}`, topic: g })) : grammarAll, vocab: VOCAB, errors }, dueCount }
}

export function Session({ kind, onExit }: { kind: SessionKind; onExit: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [phase, setPhase] = useState<'run' | 'reflect' | 'end'>('run')
  const [summary, setSummary] = useState({ score: 0, total: 0 })
  const timer = usePracticeTimer()
  useEffect(() => {
    let live = true
    loadPools(kind).then(({ pools }) => { if (live) { timer.reset(); setItems(buildMixedSession(pools, kind === 'quick' ? 6 : 12)) } })
    return () => { live = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const finish = async (score: number, total: number, results: boolean[]) => {
    const bySrc = new Map<string, { ok: number; n: number }>()
    items!.forEach((it, k) => { const b = bySrc.get(it.src) ?? { ok: 0, n: 0 }; b.n++; if (results[k]) b.ok++; bySrc.set(it.src, b) })
    for (const [src, b] of bySrc) {
      if (src.startsWith('lesson:') || src.startsWith('grammar:')) await scheduleReview(src, b.ok / b.n)
    }
    for (const [k, it] of items!.entries()) {
      if (!it.ex.id.startsWith('v:')) continue
      const id = it.ex.id.split(':')[1]
      const c = (await db.cards.get(id)) ?? newCard(id)
      await putCard(review(c, results[k] ? 2 : 0))
    }
    await logSession(kind === 'due' ? 'review-due' : kind === 'quick' ? 'review-quick' : 'review-mixed', timer.minutes())
    setSummary({ score, total }); setPhase('reflect')
  }

  if (!items) return <p>Préparation de la session…</p>
  if (items.length === 0) return (<div className="card"><p className="mt-0">Rien à réviser pour le moment.</p><button className="btn" onClick={onExit}>Retour</button></div>)
  return (
    <div data-testid="session">
      <PageHead title={kind === 'due' ? 'Session du jour' : kind === 'quick' ? 'Session 5 minutes' : 'Session mixte'} sub="Sujets mélangés exprès (entrelacement) : plus difficile sur le moment, mieux retenu ensuite. Réponds de mémoire, sans relire." />
      <p>{[...new Set(items.map((i) => i.src.split(':')[0]))].map((s) => <Pill key={s}>{s === 'lesson' ? 'leçons' : s === 'grammar' ? 'grammaire' : s === 'vocab' ? 'vocabulaire' : 'mes erreurs'}</Pill>)}</p>
      {phase === 'run' && <ExerciseRunner exercises={items.map((i) => i.ex)} onFinish={finish} />}
      {phase === 'reflect' && <Reflection kind="session" onDone={() => setPhase('end')} />}
      {phase === 'end' && (<div className="card" data-testid="session-end"><p className="mt-0 text-xl"><b>Score : {summary.score}/{summary.total}</b></p><p className="muted">Les éléments réussis reviennent à des intervalles plus longs ; les ratés reviennent bientôt. Aucun élément n'est jamais retiré.</p><button className="btn" onClick={onExit}>Retour au Dashboard</button></div>)}
    </div>
  )
}
