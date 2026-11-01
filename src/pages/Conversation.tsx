import { useRef, useState } from 'react'
import { AnswerBox, CoachView, PageHead, Pill, Speak } from '../components/shared'
import { useApp } from '../app/AppContext'
import { coachTurn } from '../services/ai/coach'
import { aiErrorMessage } from '../services/ai/provider'
import { localCheck } from '../services/ai/localRules'
import { addHistory, bumpError, learnFromCoach, logSession } from '../services/storage/repo'
import { speak } from '../services/speech/speech'
import type { CoachResult } from '../types'

const QUESTIONS = ['Hello! Please introduce yourself and your job.', 'What are your main responsibilities on site?', 'How do you manage hazardous waste?', 'Describe a pollution risk you found recently.', 'What would you do if you found a fuel leak?']

const TOPICS = [
  { label: 'Se présenter', q: QUESTIONS[0] }, { label: 'Mes responsabilités sur site', q: QUESTIONS[1] }, { label: 'Gérer les déchets dangereux', q: QUESTIONS[2] },
  { label: 'Décrire un risque de pollution', q: QUESTIONS[3] }, { label: 'Réagir à une fuite de carburant', q: QUESTIONS[4] },
]

type Msg = { who: 'coach' | 'me' | 'sys'; text: string; coach?: CoachResult; local?: { corrected: string; notes: string[] }; err?: string; preset?: boolean }

export default function Conversation() {
  const { ai, aiReady, settings } = useApp()
  const [q, setQ] = useState(QUESTIONS[0])
  const [log, setLog] = useState<Msg[]>([{ who: 'coach', text: QUESTIONS[0], preset: true }])
  const [ans, setAns] = useState('')
  const [busy, setBusy] = useState(false)
  const [rate, setRate] = useState(0.9)
  const [detail, setDetail] = useState('')
  const qi = useRef(0)
  const lastSpeech = useRef(QUESTIONS[0])

  const reset = () => { qi.current = 0; setQ(QUESTIONS[0]); setLog([{ who: 'coach', text: QUESTIONS[0], preset: true }]); setAns(''); setDetail('') }

  const pick = (question: string) => { setQ(question); lastSpeech.current = question; setLog((l) => [...l, { who: 'coach', text: question, preset: true }]); setAns(''); setDetail('') }

  const send = async () => {
    const t = ans.trim(); if (!t || busy) return
    setBusy(true)
    const mine: Msg = { who: 'me', text: t }
    let reply: Msg; let next: string | null = null
    if (aiReady && ai) {
      try {
        const r = await coachTurn(ai, { kind: 'chat', profile: settings.profile, level: settings.level, userContent: `Question asked: ${q}\nLearner's answer: ${t.slice(0, 1500)}` })
        await learnFromCoach(r)
        reply = { who: 'coach', text: '', coach: r }
        lastSpeech.current = r.natural || r.corrected || t
        next = r.followup.trim() || null
      } catch (e) {
        const lc = localCheck(t); for (const n of lc.notes) await bumpError(n.type, t.slice(0, 80), lc.corrected.slice(0, 80))
        reply = { who: 'coach', text: '', err: aiErrorMessage(e), local: { corrected: lc.corrected, notes: lc.notes.map((n) => n.why) } }
      }
    } else {
      const lc = localCheck(t); for (const n of lc.notes) await bumpError(n.type, t.slice(0, 80), lc.corrected.slice(0, 80))
      reply = { who: 'coach', text: '', local: { corrected: lc.corrected, notes: lc.notes.map((n) => n.why) } }
    }
    await addHistory('conversation', q, t)
    await logSession('conversation', 1)
    const wasPreset = !next
    if (next) { setQ(next) } else { qi.current += 1; next = QUESTIONS[qi.current % QUESTIONS.length]; setQ(next) }
    setLog((l) => [...l, mine, reply, { who: 'coach', text: next!, preset: wasPreset }])
    setAns(''); setBusy(false); setDetail('')
  }

  const explain = async () => {
    if (!ai || !aiReady) return
    const last = [...log].reverse().find((m) => m.coach)?.coach; if (!last) return
    setDetail('Analyse…')
    try {
      const t = await ai.complete({ system: 'You are an English teacher for a French-speaking learner. Explain in French, in at most 8 short sentences, the mistakes below in more detail, with two examples in English related to environmental work on a pipeline site. Do not mention pronunciation.', messages: [{ role: 'user', content: JSON.stringify(last.errors.length ? last.errors : { corrected: last.corrected }) }], maxTokens: 800 })
      setDetail(t)
    } catch (e) { setDetail(aiErrorMessage(e)) }
  }

  return (
    <div>
      <PageHead title="Conversation avec le coach" sub={aiReady ? 'Coach IA actif. Messages texte (dictée possible), pas de conversation vocale en temps réel.' : 'Mode sans IA : questions préconstruites et règles de correction locales très limitées. Active une IA dans Paramètres pour une vraie correction.'} />
      {aiReady && settings.provider === 'gemini' && <p><Pill kind="wa">Chaque envoi transmet ton texte à Google</Pill></p>}
      <div className="grid12">
      <div className="span-9 flex flex-col gap-4">
      <div className="panel" data-testid="conv-log" aria-live="polite" style={{ gap: 10 }}>
        {log.map((m, i) => (
          <div key={i} className="flex flex-col" style={{ gap: 6 }}>
            {m.who === 'me' && <div className="bubble me">{m.text}</div>}
            {m.who === 'coach' && (
              <div className="bubble">
                {m.coach && <CoachView r={m.coach} />}
                {m.err && <p className="m-0"><Pill kind="no">IA indisponible</Pill> {m.err}</p>}
                {m.local && (m.local.notes.length
                  ? <div><p className="my-1"><b>Corrigé :</b> <ins>{m.local.corrected}</ins></p><ul className="my-1 pl-5">{m.local.notes.map((n) => <li key={n}>{n}</li>)}</ul></div>
                  : <p className="my-1 muted">Aucune erreur détectée par les règles locales (elles sont peu nombreuses). Pour une vraie correction, active une IA dans Paramètres.</p>)}
                {m.text && <p className="my-1"><b>Coach{m.preset ? ' (question préconstruite)' : ''} :</b> {m.text}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="panel">
        <AnswerBox value={ans} onChange={setAns} placeholder="Écris ta réponse en anglais ou utilise la dictée…" />
        <button className="btn btn-primary" style={{ alignSelf: 'stretch', minHeight: 46 }} onClick={send} disabled={busy || !ans.trim()}>{busy ? 'Analyse…' : 'Envoyer'}</button>
        <div className="flex flex-wrap items-center gap-2">
          <Speak text={q} rate={rate} label="Écouter la question" />
          <button className="btn btn-sm" onClick={() => speak(q, rate)}>Répéter</button>
          <button className="btn btn-sm" onClick={() => speak(lastSpeech.current, rate)}>Écouter la correction</button>
          <label className="lbl inline" style={{ margin: 0, fontSize: 13 }}>Vitesse <select className="field" style={{ width: 'auto', minHeight: 32, padding: '2px 8px' }} value={rate} onChange={(e) => setRate(+e.target.value)}><option value={0.7}>Lente</option><option value={0.9}>Normale</option><option value={1.1}>Rapide</option></select></label>
          {aiReady && <button className="btn btn-sm" onClick={explain}>Explication plus détaillée</button>}
          <button className="btn btn-sm btn-ghost" onClick={reset}>Recommencer</button>
        </div>
        {detail && <p className="m-0 whitespace-pre-wrap">{detail}</p>}
      </div>
      </div>
      <aside className="panel span-3" aria-label="Thèmes de conversation">
        <div className="panel-head"><h2>Changer de question</h2></div>
        <div className="rows">
          {TOPICS.map((t) => <button key={t.q} type="button" className="btn text-left" style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '10px 14px', lineHeight: 1.35 }} onClick={() => pick(t.q)}>{t.label}</button>)}
        </div>
      </aside>
      </div>
    </div>
  )
}
