import { useState } from 'react'
import { ExerciseRunner, PageHead, Pill } from '../components/shared'
import { GRAMMAR, type GrammarTopic } from '../data/exercises/grammar'
import { useDb } from '../hooks/useDb'
import { db } from '../services/storage/db'
import { logSession, scheduleReview } from '../services/storage/repo'
import { Reflection } from '../components/learning'
import { usePracticeTimer } from '../hooks/usePracticeTimer'
import { fill } from '../data/builders'
import type { Exercise } from '../types'

export default function Grammar() {
  const [topic, setTopic] = useState<GrammarTopic | null>(null)
  const [mine, setMine] = useState<Exercise[] | null>(null)
  const [res, setRes] = useState<string>('')
  const [reflected, setReflected] = useState(false)
  const timer = usePracticeTimer()
  const errors = useDb(() => db.errors.orderBy('count').reverse().toArray(), [])

  const startMine = () => {
    const ex = errors.filter((e) => e.fix).slice(0, 8).map((e, i) => fill(`err-${i}`, `Corrige cette phrase ou expression : « ${e.original} »`, [e.fix], `Correction : ${e.fix} (erreur de type ${e.type}, vue ${e.count} fois).`, 'grammaire'))
    timer.reset(); setRes(''); setMine(ex)
  }

  if (mine) return (
    <div><PageHead title="Mes erreurs fréquentes" sub="Exercices générés à partir de tes erreurs réellement enregistrées." />
      {res ? <div className="card"><b>{res}</b><p><button className="btn" onClick={() => setMine(null)}>Retour</button></p></div>
        : <ExerciseRunner exercises={mine} onFinish={async (s, t) => { await logSession('grammar-errors', timer.minutes()); setRes(`Score : ${s}/${t}`) }} />}
    </div>)

  if (topic) return (
    <div><PageHead title={topic.title} />
      {res && !reflected ? <Reflection kind={`grammar:${topic.id}`} onDone={() => setReflected(true)} /> : res ? <div className="card" data-testid="grammar-end"><b>{res}</b><p className="muted">Elle reviendra dans « À réviser aujourd'hui » du Dashboard.</p><p><button className="btn" onClick={() => { setTopic(null); setRes(''); setReflected(false) }}>Retour aux leçons</button></p></div> : (<>
        <div className="card mb-3">{topic.explanation.map((l) => <p key={l} className="mt-0">{l}</p>)}<b>Exemples</b><ul className="pl-5">{topic.examples.map((e) => <li key={e}>{e}</li>)}</ul></div>
        <ExerciseRunner exercises={topic.exercises} onFinish={async (s, t) => { await logSession('grammar', timer.minutes()); const due = await scheduleReview(`grammar:${topic.id}`, t ? s / t : 0); setRes(`Score : ${s}/${t}. Prochaine révision : ${new Date(due).toLocaleDateString('fr-FR')}.`) }} /></>)}
    </div>)

  return (
    <div>
      <PageHead title="Grammaire" sub="8 leçons ciblées sur les besoins du travail, avec exercices corrigés." />
      <div className="list">
        {GRAMMAR.map((g) => <div key={g.id} className="row"><div className="row-main"><span className="row-title">{g.title}</span></div><button className="btn" data-testid={`gram-${g.id}`} onClick={() => { timer.reset(); setRes(''); setReflected(false); setTopic(g) }}>Ouvrir</button></div>)}
      </div>
      <div className="card mt-4"><b>Mes erreurs fréquentes</b>
        {errors.length === 0 ? <p className="muted mb-0">Aucune erreur enregistrée. Utilise Conversation ou Rédaction.</p> : (<>
          <ul className="my-2 pl-5">{errors.slice(0, 10).map((e) => <li key={e.key}><Pill>{e.type}</Pill><del>{e.original}</del> → <ins>{e.fix}</ins> <span className="muted">({e.count}×)</span></li>)}</ul>
          <button className="btn" onClick={startMine} data-testid="errors-quiz">Transformer mes erreurs en exercices</button></>)}
      </div>
    </div>
  )
}
