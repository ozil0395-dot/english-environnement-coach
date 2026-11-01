import { useState } from 'react'
import { ExerciseRunner, PageHead, Pill, Speak } from '../components/shared'
import { Elaboration, Reflection } from '../components/learning'
import { MODULES } from '../data/curriculum/modules'
import { useDb } from '../hooks/useDb'
import { db } from '../services/storage/db'
import { logSession, savePrediction, scheduleReview } from '../services/storage/repo'
import { predictionGap } from '../services/stats/calibration'
import { usePracticeTimer } from '../hooks/usePracticeTimer'
import type { Lesson } from '../types'

type Phase = 'pretest' | 'learn' | 'predict' | 'practice' | 'elab' | 'reflect' | 'end'
const PRE_N = 3

export default function Path() {
  const [open, setOpen] = useState<Lesson | null>(null)
  const [phase, setPhase] = useState<Phase>('pretest')
  const [pre, setPre] = useState<boolean[] | null>(null)
  const [predicted, setPredicted] = useState(0)
  const [res, setRes] = useState<{ score: number; total: number; results: boolean[]; due: number }>({ score: 0, total: 0, results: [], due: 0 })
  const timer = usePracticeTimer()
  const done = useDb(() => db.lessonsDone.toArray(), [])
  const doneMap = new Map(done.map((d) => [d.lessonId, d]))
  const modulesDone = MODULES.filter((m) => m.lessons.every((l) => doneMap.has(l.id))).length
  const nextId = MODULES.find((m) => m.lessons.some((l) => !doneMap.has(l.id)))?.id

  const start = (l: Lesson) => { setOpen(l); setPhase('pretest'); setPre(null); setPredicted(Math.round(l.exercises.length * 0.6)) }
  const close = () => { setOpen(null); setPhase('pretest') }

  if (open) {
    const preEx = open.exercises.slice(0, PRE_N)
    return (
      <div>
        <PageHead title={open.title} sub={open.goals.join(' · ')} />
        {phase === 'pretest' && (
          <div>
            <div className="card mb-3" data-testid="pretest-intro">
              <b>Pré-test : avant de voir la leçon</b>
              <p className="mb-0">Tente {preEx.length} questions <i>avant</i> le cours. Tu vas probablement te tromper, et c'est voulu : essayer d'abord prépare ta mémoire à mieux retenir la correction. Ces réponses ne comptent pas dans ton taux de réussite.</p>
              <button className="btn mt-2" onClick={() => setPhase('learn')} data-testid="pretest-skip">Passer le pré-test</button>
            </div>
            <ExerciseRunner exercises={preEx} refPrefix="pre:" calibrate={false} showToggles={false} onFinish={(_s, _t, r) => { setPre(r); setPhase('learn') }} />
          </div>
        )}
        {phase === 'learn' && (
          <div className="card">
            {pre && <p className="mt-0"><Pill kind="wa">Pré-test : {pre.filter(Boolean).length}/{pre.length}</Pill> Garde ces questions en tête en lisant : tu les retrouveras après.</p>}
            <b>Vocabulaire</b>
            <div className="my-2 overflow-x-auto"><table className="w-full text-left"><tbody>
              {open.vocab.map((v) => (<tr key={v.id}><td className="py-1 pr-3"><b>{v.en}</b></td><td className="pr-3">{v.fr}</td><td className="muted pr-3">{v.ex}</td><td><Speak text={v.ex} label="Audio" /></td></tr>))}
            </tbody></table></div>
            <b>Exemples professionnels</b>
            <ul className="my-1 pl-5">{open.examples.map((e) => <li key={e}>{e} <Speak text={e} label="Audio" /></li>)}</ul>
            <p className="muted text-sm">Traductions indicatives : vérifie les termes techniques dans tes documents officiels. Ne te contente pas de relire : les exercices qui suivent sont l'étape qui fait retenir.</p>
            <button className="btn" onClick={() => setPhase('predict')} data-testid="learn-next">Passer aux exercices</button>{' '}
            <button className="btn" onClick={close}>Retour</button>
          </div>
        )}
        {phase === 'predict' && (
          <div className="card" data-testid="predict">
            <b>Prédiction</b>
            <p className="mt-1">Avant de commencer, combien de bonnes réponses penses-tu obtenir sur {open.exercises.length} ? (Se tester soi-même évite l'illusion de « je sais déjà ».)</p>
            <select className="field" style={{ width: 'auto' }} aria-label="Score prédit" value={predicted} onChange={(e) => setPredicted(+e.target.value)}>{Array.from({ length: open.exercises.length + 1 }, (_, k) => <option key={k} value={k}>{k}</option>)}</select>
            <button className="btn ml-2" data-testid="predict-go" onClick={() => { timer.reset(); setPhase('practice') }}>Commencer</button>
          </div>
        )}
        {phase === 'practice' && (
          <ExerciseRunner exercises={open.exercises} onFinish={async (score, total, results) => {
            await db.lessonsDone.put({ lessonId: open.id, score, total, ts: Date.now() })
            const due = await scheduleReview(`lesson:${open.id}`, total ? score / total : 0)
            await savePrediction('lesson', open.id, predicted, score, total)
            await logSession('lesson', timer.minutes())
            setRes({ score, total, results, due }); setPhase('elab')
          }} />
        )}
        {phase === 'elab' && <Elaboration vocab={open.vocab} onDone={() => setPhase('reflect')} />}
        {phase === 'reflect' && <Reflection kind={`lesson:${open.id}`} onDone={() => setPhase('end')} />}
        {phase === 'end' && (
          <div className="card" data-testid="lesson-end">
            <p className="mt-0 text-xl"><b>Score : {res.score}/{res.total}</b></p>
            <p>{predictionGap(predicted, res.score, res.total)}</p>
            {pre && <p>Pré-test : {pre.filter(Boolean).length}/{pre.length} → après la leçon, sur les mêmes questions : {res.results.slice(0, pre.length).filter(Boolean).length}/{pre.length}.</p>}
            <p className="muted">Prochaine révision de cette leçon : <b>{new Date(res.due).toLocaleDateString('fr-FR')}</b>. Elle apparaîtra dans « À réviser aujourd'hui » du Dashboard ; revenir au bon moment, quand tu as un peu oublié, est ce qui fixe la mémoire.</p>
            <button className="btn" onClick={close}>Retour au parcours</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHead title="Parcours d'apprentissage" sub="Chaque leçon : pré-test, vocabulaire, prédiction, exercices corrigés, phrase personnelle, réflexion, puis révisions espacées." />
      <div className="mb-4" data-testid="path-progress">
        <div className="mb-2 flex items-baseline justify-between gap-2"><b>{modulesDone} / {MODULES.length} modules terminés</b><span className="muted text-sm">{nextId ? `Prochain : module ${nextId}` : 'Parcours complet : refais un module pour consolider.'}</span></div>
        <div className="meter" role="presentation"><i style={{ transform: `scaleX(${modulesDone / MODULES.length})` }} /></div>
      </div>
      <div className="list">
        {MODULES.map((m) => {
          const next = m.id === nextId
          return (
            <div key={m.id} className="row">
              <div className="row-main"><span className="row-title">Module {m.id} — {m.title}</span> <Pill>{m.level}</Pill>{m.lessons.every((l) => doneMap.has(l.id)) && <Pill kind="ok">terminé</Pill>}{next && <Pill>à faire ensuite</Pill>}<div className="row-sub">{m.summary}</div></div>
              <div className="row-actions">{m.lessons.map((l) => { const d = doneMap.get(l.id); return (
                <button key={l.id} className={`btn${next && !d ? ' btn-primary' : ''}`} data-testid={`lesson-${l.id}`} onClick={() => start(l)}>{d ? `Refaire (${d.score}/${d.total})` : 'Commencer'}</button>) })}</div>
            </div>)
        })}
      </div>
    </div>
  )
}
