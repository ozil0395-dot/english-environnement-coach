import { useMemo, useState } from 'react'
import { AnswerBox, CoachView, PageHead, Pill, Speak } from '../components/shared'
import { PLACEMENT } from '../data/exercises/placement'
import { MODULES } from '../data/curriculum/modules'
import { estimateLevel, LEVELS, nextLevel } from '../utils/level'
import { db } from '../services/storage/db'
import { addHistory, learnFromCoach, logAttempt, logSession, savePrediction } from '../services/storage/repo'
import { predictionGap } from '../services/stats/calibration'
import { useApp } from '../app/AppContext'
import { coachTurn } from '../services/ai/coach'
import { aiErrorMessage } from '../services/ai/provider'
import type { CoachResult, Level, PlacementQuestion } from '../types'
import { usePracticeTimer } from '../hooks/usePracticeTimer'

type Phase = 'intro' | 'mcq' | 'writing' | 'done'
const SKILL_LABEL: Record<string, string> = { grammaire: 'Grammaire', vocabulaire: 'Vocabulaire général', 'vocabulaire pro': 'Vocabulaire professionnel', lecture: 'Compréhension écrite', ecoute: 'Compréhension orale', ecriture: 'Expression écrite', oral: 'Expression orale' }

export default function PlacementTest() {
  const { caps, set, ai, aiReady, settings } = useApp()
  const timer = usePracticeTimer()
  // Sans synthèse vocale, les questions d'écoute s'affichent en texte et comptent comme « compréhension écrite ».
  const qs = useMemo<PlacementQuestion[]>(() => PLACEMENT.map((q) => (q.listen && !caps.synthesis ? { ...q, listen: false, skill: 'lecture' as const } : q)), [caps.synthesis])
  const [phase, setPhase] = useState<Phase>('intro')
  const [predicted, setPredicted] = useState(15)
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [text, setText] = useState('')
  const [spoken, setSpoken] = useState('')
  const [fb, setFb] = useState<CoachResult | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<null | { level: Level; byLevel: Record<string, { ok: number; n: number }>; bySkill: Record<string, { ok: number; n: number }>; wrong: PlacementQuestion[]; total: number; correct: number }>(null)

  const finishMcq = async (ans: number[]) => {
    const byLevel: Record<string, { ok: number; n: number }> = {}, bySkill: Record<string, { ok: number; n: number }> = {}
    const wrong: PlacementQuestion[] = []
    let correct = 0
    qs.forEach((q, k) => {
      const ok = ans[k] === q.answer
      for (const [m, key] of [[byLevel, q.level], [bySkill, q.skill]] as const) { const b = (m[key] ??= { ok: 0, n: 0 }); b.n++; if (ok) b.ok++ }
      if (ok) correct++; else wrong.push(q)
    })
    const level = estimateLevel(byLevel)
    await db.tests.add({ ts: Date.now(), level, correct, total: qs.length, bySkill })
    for (const [k, q] of qs.entries()) await logAttempt(q.skill, ans[k] === q.answer, q.id)
    await logSession('test', timer.minutes())
    await savePrediction('test', 'placement', predicted, correct, qs.length)
    await set('level', `${level} (estimation d'après le test)`)
    setResult({ level, byLevel, bySkill, wrong, total: qs.length, correct })
    setPhase('writing')
  }

  const submitWriting = async () => {
    setBusy(true); setErr('')
    if (text.trim()) await addHistory('test-writing', 'Expression écrite (test de niveau)', text)
    if (spoken.trim()) await addHistory('test-oral', 'Expression orale (test de niveau)', spoken)
    if (aiReady && ai && text.trim()) {
      try { const r = await coachTurn(ai, { kind: 'writing sample', profile: settings.profile, level: result?.level ?? '', userContent: text.slice(0, 3000) }); await learnFromCoach(r); setFb(r) } catch (e) { setErr(aiErrorMessage(e)) }
    }
    setBusy(false); setPhase('done')
  }

  if (phase === 'intro') return (
    <div>
      <PageHead title="Test de niveau" sub="Estimation pédagogique inspirée du CECRL (A1 à C1), pas une certification officielle." />
      <div className="panel">
        <div className="duegrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div><b>{qs.length}</b><span>questions</span></div><div><b>≈ 15</b><span>minutes</span></div><div><b>A1 à C1</b><span>niveaux</span></div>
        </div>
        <p className="m-0">Grammaire, vocabulaire général et professionnel, compréhension écrite{caps.synthesis ? ' et orale' : ''}. Puis un court texte à écrire et une phrase à dire (facultatifs).</p>
        <p className="panel-note">Le résultat s'affiche uniquement à la fin. {!caps.synthesis && 'Lecture audio indisponible : la compréhension orale n\'est pas évaluée (les passages sont affichés en texte).'}</p>
        <div className="lbl inline" style={{ margin: 0, flexWrap: 'wrap' }}>Avant de commencer : combien de bonnes réponses penses-tu obtenir sur {qs.length} ? <select className="field" style={{ width: 'auto' }} aria-label="Score prédit" value={predicted} onChange={(e) => setPredicted(+e.target.value)}>{Array.from({ length: qs.length + 1 }, (_, k) => <option key={k} value={k}>{k}</option>)}</select></div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start', minHeight: 46, paddingInline: 22 }} onClick={() => { timer.reset(); setPhase('mcq') }}>Commencer</button>
      </div>
    </div>
  )

  if (phase === 'mcq') {
    const q = qs[i]
    const pick = async (k: number) => {
      const ans = [...answers, k]
      setAnswers(ans)
      if (i + 1 >= qs.length) await finishMcq(ans); else setI(i + 1)
    }
    return (
      <div>
        <PageHead title="Test de niveau" />
        <div className="card" aria-live="polite">
          <div className="mb-3 h-2 overflow-hidden rounded" style={{ background: 'var(--line)' }}><div className="h-full" style={{ width: `${(100 * i) / qs.length}%`, background: 'var(--acc)' }} /></div>
          <p className="mt-0"><b>Question {i + 1} / {qs.length}</b> <span className="pill">{SKILL_LABEL[q.skill]}</span></p>
          {q.listen ? <p><Speak text={q.passage!} label="Écouter l'audio" /> <Speak text={q.passage!} rate={0.7} label="Écouter lentement" /></p> : q.passage && <blockquote className="muted my-2">{q.passage}</blockquote>}
          <p className="text-lg">{q.prompt}</p>
          <div className="flex flex-col gap-2">{q.options.map((o, k) => <button key={o} className="btn text-left" onClick={() => pick(k)}>{o}</button>)}</div>
        </div>
      </div>
    )
  }

  if (phase === 'writing') return (
    <div>
      <PageHead title="Expression écrite et orale (facultatif)" sub={aiReady ? 'Ton texte sera corrigé par le coach IA (il sera envoyé au moteur choisi).' : 'Sans IA, ces productions sont enregistrées mais non notées.'} />
      <div className="card">
        <p className="mt-0">Écris 3 à 5 phrases : <i>Introduce yourself and describe your job.</i></p>
        <AnswerBox value={text} onChange={setText} rows={5} />
        <p>Dis une phrase à voix haute et vérifie qu'elle s'affiche : <i>"I work on pipeline projects and I am responsible for environmental monitoring."</i></p>
        <AnswerBox value={spoken} onChange={setSpoken} rows={2} />
        <p className="muted text-sm">Le texte reconnu n'est pas une analyse de ta prononciation.</p>
        <button className="btn" disabled={busy} onClick={submitWriting}>{busy ? 'Analyse…' : 'Voir mon résultat'}</button>
      </div>
    </div>
  )

  const r = result!
  const rec = MODULES.filter((m) => LEVELS.indexOf(m.level) <= LEVELS.indexOf(nextLevel(r.level)))
  const weak = Object.entries(r.bySkill).filter(([, b]) => b.ok < b.n).map(([k]) => SKILL_LABEL[k])
  const strong = Object.entries(r.bySkill).filter(([, b]) => b.ok === b.n).map(([k]) => SKILL_LABEL[k])
  return (
    <div data-testid="test-result">
      <PageHead title="Résultat du test" />
      <div className="card">
        <p className="mt-0 text-xl"><b>Niveau estimé : {r.level}</b> <Pill kind="wa">estimation pédagogique, pas une certification</Pill></p>
        <p>Score : {r.correct}/{r.total}. Un test de {r.total} questions donne une indication, pas une mesure précise.</p>
        <p>{predictionGap(predicted, r.correct, r.total)}</p>
        <p><b>Points forts :</b> {strong.join(', ') || '—'}<br /><b>Difficultés :</b> {weak.join(', ') || '—'}<br /><b>Non évalué automatiquement :</b> expression écrite{fb ? ' (commentaire IA ci-dessous)' : ''} et orale.</p>
        {r.wrong.length > 0 && (<><b>Vocabulaire et points à travailler</b><ul className="my-1 pl-5">{r.wrong.map((q) => <li key={q.id}>{q.explanation}</li>)}</ul></>)}
        <p><b>Parcours recommandé :</b> {rec.map((m) => `Module ${m.id}`).join(', ')}. <b>Objectifs hebdomadaires proposés :</b> 4 séances de 15 minutes, 1 scénario et 10 mots révisés.</p>
        {err && <p><Pill kind="no">IA indisponible</Pill> {err}</p>}
        {fb && <CoachView r={fb} />}
      </div>
    </div>
  )
}
