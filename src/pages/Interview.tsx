import { useState } from 'react'
import { AnswerBox, CoachView, PageHead, Pill, Speak } from '../components/shared'
import { INTERVIEW } from '../data/exercises/interview'
import { useApp } from '../app/AppContext'
import { coachTurn } from '../services/ai/coach'
import { aiErrorMessage } from '../services/ai/provider'
import { addHistory, learnFromCoach, logSession } from '../services/storage/repo'
import { normalize } from '../utils/text'
import type { CoachResult } from '../types'

export default function Interview() {
  const { ai, aiReady, settings } = useApp()
  const [i, setI] = useState(0)
  const [a, setA] = useState('')
  const [shown, setShown] = useState(false)
  const [fb, setFb] = useState<CoachResult | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const q = INTERVIEW[i]
  const used = q.phrases.filter((p) => { const core = normalize(p.replace(/…/g, '')).split(' ').slice(0, 3).join(' '); return core && normalize(a).includes(core) })

  const go = (n: number) => { setI(n); setA(''); setShown(false); setFb(null); setErr('') }
  const submit = async () => {
    await addHistory('interview', q.q, a); await logSession('interview', 2); setShown(true)
    if (aiReady && ai) { setBusy(true); try { const r = await coachTurn(ai, { kind: 'job interview answer', profile: settings.profile, level: settings.level, userContent: `Interview question: ${q.q}\nAnswer: ${a.slice(0, 2000)}` }); await learnFromCoach(r); setFb(r) } catch (e) { setErr(aiErrorMessage(e)) } setBusy(false) }
  }
  return (
    <div>
      <PageHead title="Préparation aux entretiens" sub={`Question ${i + 1} / ${INTERVIEW.length}. ${aiReady ? 'Ta réponse sera commentée par le coach IA.' : 'Sans IA : réponse modèle et expressions utiles.'}`} />
      <div className="card">
        <p className="mt-0 text-xl" style={{ color: 'var(--acc)' }}>{q.q} <Speak text={q.q} label="Écouter" /></p>
        <p className="muted">{q.tip}</p>
        <AnswerBox value={a} onChange={setA} rows={5} placeholder="Ta réponse en anglais…" />
        <div className="mt-2 flex flex-wrap gap-2"><button className="btn btn-primary" disabled={!a.trim() || busy} onClick={submit} data-testid="itw-submit">{busy ? 'Analyse…' : 'Valider ma réponse'}</button>
          <button className="btn" onClick={() => go((i + INTERVIEW.length - 1) % INTERVIEW.length)}>Précédente</button><button className="btn" onClick={() => go((i + 1) % INTERVIEW.length)}>Suivante</button></div>
        {shown && (<div className="mt-3" data-testid="itw-feedback">
          <p><b>Expressions utiles :</b> {q.phrases.map((p) => <span key={p} className={`pill ${used.includes(p) ? 'ok' : ''}`}>{p}</span>)}</p>
          <p className="muted text-sm">Les expressions en vert ont été repérées dans ta réponse (repérage simple du début de l'expression).</p>
          <p><b>Réponse modèle :</b> {q.model} <Speak text={q.model} label="Écouter" /></p>
          {err && <p><Pill kind="no">IA indisponible</Pill> {err}</p>}{fb && <CoachView r={fb} />}</div>)}
      </div>
    </div>
  )
}
