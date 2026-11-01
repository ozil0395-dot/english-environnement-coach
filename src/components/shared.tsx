import { GRAMMAR } from '../data/exercises/grammar'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CoachResult, Exercise } from '../types'
import { checkExercise } from '../services/stats/exercises'
import { logAttempt } from '../services/storage/repo'
import { feedbackMessage } from '../services/stats/feedback'
import { startDictation, speak, type Dictation } from '../services/speech/speech'
import { useApp } from '../app/AppContext'

export function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (<div className="page-head"><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>)
}

export const Pill = ({ kind, children }: { kind?: 'ok' | 'wa' | 'no'; children: ReactNode }) => <span className={`pill ${kind ?? ''}`}>{children}</span>

export function Speak({ text, rate, label = 'Écouter' }: { text: string; rate?: number; label?: string }) {
  const { caps } = useApp()
  const [msg, setMsg] = useState('')
  if (!caps.synthesis) return null
  return (<><button type="button" className="btn btn-sm" aria-label={`${label} : ${text}`} onClick={() => setMsg(speak(text, rate).message ?? '')}>{label}</button>{msg && <span className="muted ml-2 text-sm">{msg}</span>}</>)
}

/** Zone de réponse avec saisie écrite et dictée facultative (avec gestion des erreurs micro). */
export function AnswerBox({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  const { caps } = useApp()
  const [rec, setRec] = useState(false)
  const [note, setNote] = useState('')
  const d = useRef<Dictation | null>(null)
  useEffect(() => () => d.current?.stop(), [])
  const start = () => {
    setNote('')
    d.current = startDictation({ onText: onChange, onError: (m) => { setNote(m); setRec(false) }, onEnd: () => setRec(false) })
    if (d.current) { setRec(true); setNote('Écoute… L\'audio est traité par un service externe de Chrome (Internet requis). Corrige le texte avant d\'envoyer.') }
  }
  return (
    <div>
      <textarea className="field" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label="Ta réponse en anglais" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm" disabled={rec} onClick={start}>{caps.recognition ? 'Enregistrer' : 'Enregistrer (indisponible)'}</button>
        <button type="button" className="btn btn-sm" disabled={!rec} onClick={() => d.current?.stop()}>Arrêter</button>
      </div>
      {note && <p className="muted mt-1 mb-0 text-sm" role="status">{note}</p>}
    </div>
  )
}

export function CoachView({ r, hideCorrection = false }: { r: CoachResult; hideCorrection?: boolean }) {
  const [show, setShow] = useState(!hideCorrection)
  return (
    <div className="fade">
      {r.errors.length > 0 && (<ul className="my-2 pl-5">{r.errors.map((e, i) => (<li key={i}><span className="pill">{e.type}</span><del>{e.original}</del> → <ins>{e.fix}</ins></li>))}</ul>)}
      {r.explanation_fr && <p className="my-2">{r.explanation_fr}</p>}
      {!show && <button type="button" className="btn" onClick={() => setShow(true)}>Voir la correction complète</button>}
      {show && (<>
        {r.corrected && <p className="my-2"><b>Corrigé :</b> <ins>{r.corrected}</ins></p>}
        {r.natural && <p className="my-2"><b>Version plus naturelle et professionnelle :</b> {r.natural}</p>}
      </>)}
      {r.vocab.length > 0 && <p className="my-2"><b>Vocabulaire :</b> {r.vocab.map((v, i) => <span key={i} className="pill">{v.en} = {v.fr}</span>)}</p>}
      {r.drill && <p className="my-2"><b>À répéter à voix haute :</b> {r.drill} <Speak text={r.drill} /></p>}
    </div>
  )
}

/** Un QCM à blanc dont la réponse tient en 3 mots peut être posé SANS les choix (production > reconnaissance). */
export const isProducible = (ex: Exercise): boolean => ex.type === 'mcq' && ex.prompt.includes('___') && ex.answers[0].trim().split(/\s+/).length <= 3

/** Après une erreur sur un exercice de grammaire : rappel de la règle du point concerné, repliable. */
function RuleRecall({ exId }: { exId: string }) {
  const topic = GRAMMAR.find((g) => exId.startsWith(`${g.id}-`) || exId.startsWith(`pre:${g.id}-`))
  if (!topic) return null
  return (
    <details className="rule" data-testid="rule-recall">
      <summary>Revoir la règle : {topic.title}</summary>
      <ul>{topic.explanation.map((l) => <li key={l}>{l}</li>)}</ul>
      {topic.examples.length > 0 && <p className="muted mb-0">Exemples : {topic.examples.join(' · ')}</p>}
    </details>
  )
}

interface RunnerProps {
  exercises: Exercise[]
  onFinish: (score: number, total: number, results: boolean[]) => void
  /** Préfixe de référence des tentatives (« pre: » pour un pré-test, exclu du taux de réussite). */
  refPrefix?: string
  production?: boolean
  calibrate?: boolean
  showToggles?: boolean
}

/** Enchaîne des exercices un par un : réponse AVANT correction, confiance déclarée, feedback, enregistrement. */
export function ExerciseRunner({ exercises, onFinish, refPrefix = '', production = true, calibrate = true, showToggles = true }: RunnerProps) {
  const [i, setI] = useState(0)
  const [sel, setSel] = useState('')
  const [given, setGiven] = useState('')
  const [checked, setChecked] = useState<null | { ok: boolean; conf?: boolean }>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [prod, setProd] = useState(production)
  const [calib, setCalib] = useState(calibrate)
  const ex = exercises[i]
  if (!ex) return null
  const asText = ex.type !== 'mcq' || (prod && isProducible(ex))
  const value = asText ? given : sel
  const submit = async (conf?: boolean) => {
    if (checked !== null || !value.trim()) return
    const ok = checkExercise(ex, value)
    setChecked({ ok, conf }); setResults((r) => [...r, ok])
    await logAttempt(ex.skill, ok, refPrefix + ex.id, calib ? conf : undefined)
  }
  const next = () => {
    if (i + 1 >= exercises.length) { onFinish(results.filter(Boolean).length, exercises.length, results); return }
    setI(i + 1); setSel(''); setGiven(''); setChecked(null)
  }
  return (
    <div className="card fade" aria-live="polite">
      {showToggles && (
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          <label><input type="checkbox" checked={prod} onChange={(e) => setProd(e.target.checked)} data-testid="toggle-production" /> Sans les choix quand c'est possible (plus difficile, mieux retenu)</label>
          <label><input type="checkbox" checked={calib} onChange={(e) => setCalib(e.target.checked)} data-testid="toggle-calibrate" /> Indiquer ma confiance</label>
        </div>
      )}
      <div className="muted mb-2 text-sm">Exercice {i + 1} / {exercises.length}</div>
      <div className="meter mb-4" role="presentation"><i style={{ transform: `scaleX(${(i + (checked !== null ? 1 : 0)) / exercises.length})` }} /></div>
      <p className="q-prompt">{ex.prompt}</p>
      {!asText ? (
        <div className="flex flex-col gap-2">
          {ex.options!.map((o) => (
            <button key={o} type="button" className="btn text-left" disabled={checked !== null} onClick={() => setSel(o)} aria-pressed={sel === o}>{o}</button>
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (!calib) submit(undefined) }}>
          <input className="field" style={{ maxWidth: 420 }} value={given} onChange={(e) => setGiven(e.target.value)} disabled={checked !== null} aria-label="Ta réponse" autoFocus placeholder="Écris ta réponse" />
        </form>
      )}
      {checked === null && (
        <div className="mt-3 flex flex-wrap gap-2">
          {calib ? (<>
            <button type="button" className="btn btn-primary" data-testid="submit-sure" disabled={!value.trim()} onClick={() => submit(true)}>Valider — sûr de moi</button>
            <button type="button" className="btn" data-testid="submit-unsure" disabled={!value.trim()} onClick={() => submit(false)}>Valider — pas sûr</button>
          </>) : <button type="button" className="btn btn-primary" data-testid="submit-sure" disabled={!value.trim()} onClick={() => submit(undefined)}>Valider</button>}
        </div>
      )}
      {checked !== null && (
        <div className={`feedback ${checked.ok ? 'ok' : 'no'} mt-3`} role="status">
          <Pill kind={checked.ok ? 'ok' : 'no'}>{checked.ok ? 'Correct' : 'Incorrect'}</Pill>
          {!checked.ok && <span> Réponse attendue : <b>{ex.answers[0]}</b></span>}
          <p className="muted my-2">{ex.explanation}</p>
          {!checked.ok && <RuleRecall exId={ex.id} />}
          <p className="my-2" data-testid="feedback-msg">{feedbackMessage(checked.ok, calib ? checked.conf : undefined)}</p>
          <button className="btn btn-primary" style={{ minHeight: 46 }} type="button" onClick={next} data-testid="next">{i + 1 >= exercises.length ? 'Terminer' : 'Suivant'}</button>
        </div>
      )}
    </div>
  )
}
