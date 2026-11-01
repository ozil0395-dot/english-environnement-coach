import { useState } from 'react'
import { AnswerBox, CoachView, Pill } from './shared'
import { useApp } from '../app/AppContext'
import { coachTurn } from '../services/ai/coach'
import { aiErrorMessage } from '../services/ai/provider'
import { localCheck } from '../services/ai/localRules'
import { addHistory, learnFromCoach, saveReflection } from '../services/storage/repo'
import { normalize } from '../utils/text'
import type { CoachResult, VocabItem } from '../types'

/** Réflexion en 3 questions (« écrire pour apprendre »), enregistrée dans l'historique. */
export function Reflection({ kind, onDone }: { kind: string; onDone: () => void }) {
  const [w, setW] = useState(''), [f, setF] = useState(''), [c, setC] = useState('')
  const save = async () => { if (w.trim() || f.trim() || c.trim()) await saveReflection(kind, w, f, c); onDone() }
  const Q = ({ label, v, set }: { label: string; v: string; set: (x: string) => void }) => (<label className="mt-2 block">{label}<textarea className="field" rows={2} value={v} onChange={(e) => set(e.target.value)} /></label>)
  return (
    <div className="card fade" data-testid="reflection">
      <b>Réflexion (1 minute)</b>
      <p className="muted mt-1 text-sm">Écrire ce que tu as appris, avec tes mots, aide la mémoire à long terme. Facultatif.</p>
      {Q({ label: 'Qu\'est-ce qui a bien fonctionné ?', v: w, set: setW })}
      {Q({ label: 'Qu\'est-ce qui a échoué ou m\'a surpris ?', v: f, set: setF })}
      {Q({ label: 'Que vais-je faire différemment ?', v: c, set: setC })}
      <div className="mt-3 flex gap-2"><button className="btn" onClick={save} data-testid="reflect-save">Enregistrer</button><button className="btn" onClick={onDone} data-testid="reflect-skip">Passer</button></div>
    </div>
  )
}

const core = (en: string) => normalize(en.replace(/\(.*?\)/g, '').trim())

/** Élaboration : réutiliser un mot nouveau dans une phrase sur SON propre travail. */
export function Elaboration({ vocab, onDone }: { vocab: VocabItem[]; onDone: () => void }) {
  const { ai, aiReady, settings } = useApp()
  const [t, setT] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [local, setLocal] = useState<null | { corrected: string; notes: string[] }>(null)
  const [fb, setFb] = useState<CoachResult | null>(null)
  const [err, setErr] = useState('')
  const used = vocab.find((v) => core(v.en) && normalize(t).includes(core(v.en)))
  const submit = async () => {
    setBusy(true); setErr('')
    await addHistory('elaboration', 'Phrase avec un mot de la leçon', t)
    const lc = localCheck(t); setLocal({ corrected: lc.corrected, notes: lc.notes.map((n) => n.why) })
    if (aiReady && ai) { try { const r = await coachTurn(ai, { kind: 'sentence about the learner\'s own work using a new word', profile: settings.profile, level: settings.level, userContent: t.slice(0, 600) }); await learnFromCoach(r); setFb(r) } catch (e) { setErr(aiErrorMessage(e)) } }
    setBusy(false); setSent(true)
  }
  return (
    <div className="card fade" data-testid="elaboration">
      <b>Utilise-le dans ton travail</b>
      <p className="mt-1">Écris une phrase en anglais sur <i>ton propre chantier</i> avec un mot de la leçon : {vocab.slice(0, 6).map((v) => <span key={v.id} className="pill">{v.en}</span>)}</p>
      <AnswerBox value={t} onChange={setT} rows={2} placeholder="Ex. : On my site, we …" />
      {!sent ? (
        <div className="mt-2 flex gap-2"><button className="btn" disabled={!t.trim() || busy} onClick={submit} data-testid="elab-submit">{busy ? 'Analyse…' : 'Valider ma phrase'}</button><button className="btn" onClick={onDone} data-testid="elab-skip">Passer</button></div>
      ) : (
        <div className="mt-2">
          {used ? <Pill kind="ok">Tu as utilisé « {used.en} »</Pill> : <Pill kind="wa">Essaie d'inclure un mot de la leçon</Pill>}
          {local && local.notes.length > 0 && <p className="my-1"><b>Corrigé :</b> <ins>{local.corrected}</ins></p>}
          {err && <p className="my-1"><Pill kind="no">IA indisponible</Pill> {err}</p>}
          {fb && <CoachView r={fb} />}
          {!aiReady && <p className="muted my-1 text-sm">Sans IA, seules quelques règles locales sont vérifiées.</p>}
          <button className="btn mt-2" onClick={onDone} data-testid="elab-continue">Continuer</button>
        </div>
      )}
    </div>
  )
}
