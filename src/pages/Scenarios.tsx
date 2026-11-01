import { useRef, useState } from 'react'
import { AnswerBox, PageHead, Pill, Speak } from '../components/shared'
import { SCENARIOS } from '../data/scenarios/scenarios'
import { useApp } from '../app/AppContext'
import { evaluateScenario, roleTurn, type Evaluation } from '../services/ai/coach'
import { aiErrorMessage, type AIMessage } from '../services/ai/provider'
import { logSession } from '../services/storage/repo'
import { db } from '../services/storage/db'
import { normalize } from '../utils/text'
import type { Scenario } from '../types'

type Line = { who: 'partner' | 'me' | 'note'; text: string }

function Play({ sc, onBack }: { sc: Scenario; onBack: () => void }) {
  const { ai, aiReady, settings } = useApp()
  const [log, setLog] = useState<Line[]>([{ who: 'partner', text: sc.opening }])
  const [ans, setAns] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [ev, setEv] = useState<Evaluation | null>(null)
  const [msg, setMsg] = useState('')
  const turns = useRef<AIMessage[]>([{ role: 'user', content: '(start the scenario)' }, { role: 'assistant', content: sc.opening }])
  const n = useRef(0)
  const finished = !aiReady && step >= sc.script.length

  const send = async () => {
    const t = ans.trim(); if (!t || busy) return
    setBusy(true); setMsg('')
    if (aiReady && ai) {
      turns.current.push({ role: 'user', content: t.slice(0, 1500) })
      try {
        const r = await roleTurn(ai, sc, settings.profile, settings.level, turns.current.slice(-13))
        if (!r.reply) throw new Error('empty')
        const add: Line[] = [{ who: 'me', text: t }]
        if (r.correction) add.push({ who: 'note', text: `${r.correction.corrected}${r.correction.note_fr ? ` — ${r.correction.note_fr}` : ''}` })
        add.push({ who: 'partner', text: r.reply })
        setLog((l) => [...l, ...add]); turns.current.push({ role: 'assistant', content: r.reply }); n.current++
        await logSession('scenario', 1); setAns('')
      } catch (e) { turns.current.pop(); setMsg(`Échec : ${e instanceof Error && e.message === 'empty' ? 'réponse vide' : aiErrorMessage(e)} Ton texte est conservé, tu peux renvoyer.`) }
    } else {
      const cur = sc.script[step]
      const hit = cur.keywords.filter((k) => normalize(t).includes(normalize(k)))
      const add: Line[] = [{ who: 'me', text: t }, { who: 'note', text: hit.length ? `Bien : tu as utilisé « ${hit.join(', ')} ».` : `Essaie d'utiliser : ${cur.keywords.slice(0, 3).join(', ')}.` }]
      const nxt = sc.script[step + 1]
      if (nxt) add.push({ who: 'partner', text: nxt.partner })
      setLog((l) => [...l, ...add]); setStep(step + 1); n.current++
      await logSession('scenario', 1); setAns('')
    }
    setBusy(false)
  }

  const evaluate = async () => {
    if (!aiReady || !ai) return
    if (!n.current) { setMsg('Réponds au moins une fois avant l\'évaluation.'); return }
    setBusy(true); setMsg('')
    try {
      const tr = turns.current.slice(1).map((x) => `${x.role === 'user' ? 'Learner' : 'Partner'}: ${x.content}`).join('\n')
      const r = await evaluateScenario(ai, sc.title, tr); setEv(r)
      for (const x of r.expressions.slice(0, 10)) await db.customWords.put({ en: x.en.slice(0, 80), fr: x.fr.slice(0, 120), ts: Date.now() })
    } catch (e) { setMsg(aiErrorMessage(e)) }
    setBusy(false)
  }

  return (
    <div>
      <PageHead title={`${sc.id}. ${sc.title}`} sub={`Niveau ${sc.level} · ${sc.objective}`} />
      <div className="card mb-3">
        <b>Contexte :</b> {sc.context}<br /><b>Ton rôle :</b> {sc.userRole} · <b>Interlocuteur :</b> {sc.partnerRole}
        <p className="my-2"><b>Vocabulaire conseillé :</b> {sc.vocab.map((v) => <span key={v} className="pill">{v}</span>)}</p>
        <span className="muted text-sm">Traductions indicatives : vérifie les termes techniques.</span>
        {!aiReady && <p className="my-2"><Pill kind="wa">Mode sans IA</Pill> L'interlocuteur suit un dialogue préconstruit en 3 étapes. Avec une IA (Paramètres), il réagit à tes réponses.</p>}
      </div>
      <div className="card mb-3" aria-live="polite" data-testid="scn-log">
        {log.map((l, i) => (<div key={i} className="my-2">
          {l.who === 'me' && <div className="bubble me">{l.text}</div>}
          {l.who === 'partner' && <div className="bubble"><b>{sc.partnerRole} :</b> {l.text} <Speak text={l.text} label="Audio" /></div>}
          {l.who === 'note' && <div className="muted max-w-[90%] text-sm"><Pill kind="wa">Retour</Pill>{l.text}</div>}
        </div>))}
      </div>
      {!aiReady && !finished && <p className="muted"><b>Indice :</b> {sc.script[step].hint}</p>}
      {!finished && (<div className="card"><AnswerBox value={ans} onChange={setAns} placeholder="Ta réponse en anglais…" />
        <div className="mt-2 flex flex-wrap gap-2"><button className="btn" disabled={busy || !ans.trim()} onClick={send}>{busy ? '…' : 'Envoyer'}</button>
          {aiReady && <button className="btn" disabled={busy} onClick={evaluate}>Terminer et évaluer</button>}
          <button className="btn" onClick={onBack}>Retour aux scénarios</button></div></div>)}
      {finished && (<div className="card" data-testid="scn-end"><b>Scénario terminé.</b><p>Expressions professionnelles à retenir :</p><ul className="pl-5">{sc.phrases.map((p) => <li key={p}>{p} <Speak text={p} label="Audio" /></li>)}</ul>
        <p className="muted text-sm">Sans IA, il n'y a pas d'évaluation détaillée : seuls les mots-clés attendus sont repérés.</p><button className="btn" onClick={onBack}>Retour aux scénarios</button></div>)}
      {msg && <p role="status"><Pill kind="no">Attention</Pill> {msg}</p>}
      {ev && (<div className="card mt-3" data-testid="scn-eval"><b>Évaluation finale</b> <Pill kind="wa">estimation pédagogique, pas une certification</Pill><p>{ev.summary_fr}</p><p><b>Niveau estimé :</b> {ev.level_estimate} (basé sur {n.current} réponse(s))</p>
        {ev.strengths.length > 0 && <><b>Points forts</b><ul className="pl-5">{ev.strengths.map((s) => <li key={s}>{s}</li>)}</ul></>}
        {ev.to_improve.length > 0 && <><b>À améliorer</b><ul className="pl-5">{ev.to_improve.map((s) => <li key={s.point}>{s.point}{s.example && <> — <i>{s.example}</i></>}</li>)}</ul></>}
        {ev.expressions.length > 0 && <><b>Expressions à retenir</b><p>{ev.expressions.map((x) => <span key={x.en} className="pill">{x.en} = {x.fr}</span>)}</p></>}</div>)}
    </div>
  )
}

export default function Scenarios() {
  const [sel, setSel] = useState<Scenario | null>(null)
  if (sel) return <Play sc={sel} onBack={() => setSel(null)} />
  return (
    <div>
      <PageHead title="Simulations professionnelles" sub="15 scénarios jouables. Avec une IA, l'interlocuteur réagit à tes réponses ; sans IA, il suit un dialogue préconstruit." />
      <div className="list">
        {SCENARIOS.map((s) => (<div key={s.id} className="row"><div className="row-main"><span className="row-title">{s.id}. {s.title}</span> <Pill>{s.level}</Pill><div className="row-sub">{s.objective}</div></div><button className="btn" data-testid={`scn-${s.id}`} onClick={() => setSel(s)}>Ouvrir</button></div>))}
      </div>
    </div>
  )
}
