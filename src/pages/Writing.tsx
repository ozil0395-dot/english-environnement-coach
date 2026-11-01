import { useState } from 'react'
import { AnswerBox, CoachView, PageHead, Pill } from '../components/shared'
import { useApp } from '../app/AppContext'
import { coachTurn } from '../services/ai/coach'
import { aiErrorMessage } from '../services/ai/provider'
import { localCheck } from '../services/ai/localRules'
import { addHistory, bumpError, learnFromCoach, logSession } from '../services/storage/repo'
import type { CoachResult } from '../types'

const TYPES = ['email', 'inspection report', 'environmental observation', 'incident report', 'document request', 'meeting minutes', 'message to a supervisor', 'meeting preparation']
const LABELS = ['Email professionnel', 'Rapport d\'inspection', 'Observation environnementale', 'Signalement d\'incident', 'Demande de documents', 'Compte rendu de réunion', 'Message à un superviseur', 'Préparation de réunion']

export default function Writing() {
  const { ai, aiReady, settings } = useApp()
  const [t, setT] = useState('')
  const [type, setType] = useState(0)
  const [learn, setLearn] = useState(true)
  const [res, setRes] = useState<CoachResult | null>(null)
  const [simple, setSimple] = useState('')
  const [local, setLocal] = useState<null | { corrected: string; notes: string[] }>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const runLocal = async () => {
    if (!t.trim()) return
    const r = localCheck(t); for (const n of r.notes) await bumpError(n.type, t.slice(0, 80), r.corrected.slice(0, 80))
    setLocal({ corrected: r.corrected, notes: r.notes.map((n) => n.why) }); setRes(null); setErr(''); await addHistory('writing', LABELS[type], t); await logSession('writing', 2)
  }
  const runAI = async () => {
    if (!t.trim() || !ai) return
    setBusy(true); setErr(''); setLocal(null); setSimple('')
    try { const r = await coachTurn(ai, { kind: TYPES[type], profile: settings.profile, level: settings.level, userContent: t.slice(0, 4000), maxTokens: 3072 }); await learnFromCoach(r); setRes(r); await addHistory('writing', LABELS[type], t); await logSession('writing', 3) }
    catch (e) { setErr(aiErrorMessage(e)) }
    setBusy(false)
  }
  const makeSimple = async () => {
    if (!ai) return; setBusy(true); setErr('')
    try { setSimple(await ai.complete({ system: `Rewrite the learner's text in simpler English suitable for level ${settings.level || 'B1'}. Keep the meaning, do not add facts. Return only the rewritten text.`, messages: [{ role: 'user', content: t.slice(0, 4000) }], maxTokens: 1024 })) } catch (e) { setErr(aiErrorMessage(e)) }
    setBusy(false)
  }

  return (
    <div>
      <PageHead title="Rédaction professionnelle" sub={aiReady ? 'Coach IA actif : correction, explication des erreurs, reformulation, vocabulaire et exercice de réutilisation.' : 'Sans IA : vérification par règles locales (limitée). Active une IA dans Paramètres pour une vraie correction.'} />
      {aiReady && settings.provider === 'gemini' && <p><Pill kind="wa">Le texte est envoyé à Google quand tu cliques sur « Corriger avec l'IA »</Pill></p>}
      <div className="card">
        <select className="field mb-2" aria-label="Type de texte" value={type} onChange={(e) => setType(+e.target.value)}>{LABELS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select>
        <AnswerBox value={t} onChange={setT} rows={8} placeholder="Write your text in English…" />
        <label className="mt-2 block"><input type="checkbox" checked={learn} onChange={(e) => setLearn(e.target.checked)} /> Mode apprentissage : montrer les erreurs avant la correction complète</label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={runLocal} disabled={!t.trim()} data-testid="write-local">Vérifier (règles locales)</button>
          <button className="btn" onClick={runAI} disabled={!t.trim() || !aiReady || busy} data-testid="write-ai" title={aiReady ? '' : 'Configure une IA dans Paramètres'}>{busy ? 'Analyse…' : 'Corriger avec l\'IA'}</button>
          <button className="btn" onClick={makeSimple} disabled={!t.trim() || !aiReady || busy}>Version simplifiée</button>
        </div>
      </div>
      {err && <p role="status"><Pill kind="no">IA indisponible</Pill> {err}</p>}
      {local && <div className="card mt-3">{local.notes.length ? <><p className="mt-0"><b>Corrigé :</b> <ins>{local.corrected}</ins></p><ul className="pl-5">{local.notes.map((n) => <li key={n}>{n}</li>)}</ul></> : <p className="m-0 muted">Aucune erreur trouvée par les quelques règles locales. Cela ne prouve pas que le texte est correct.</p>}</div>}
      {res && <div className="card mt-3" data-testid="write-result"><CoachView r={res} hideCorrection={learn && res.errors.length > 0} /></div>}
      {simple && <div className="card mt-3"><b>Version simplifiée</b><p className="mb-0 whitespace-pre-wrap">{simple}</p></div>}
    </div>
  )
}
