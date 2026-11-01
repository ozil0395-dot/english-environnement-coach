import { useMemo, useState } from 'react'
import { AnswerBox, PageHead, Pill, Speak } from '../components/shared'
import { SCENARIOS } from '../data/scenarios/scenarios'
import { INTERVIEW } from '../data/exercises/interview'
import { wordMatch } from '../utils/wordMatch'
import { logAttempt, logSession } from '../services/storage/repo'

export default function Voice() {
  const sentences = useMemo(() => [...SCENARIOS.flatMap((s) => s.phrases), ...INTERVIEW.flatMap((i) => i.phrases.filter((p) => p.length > 24))], [])
  const [idx, setIdx] = useState(0)
  const [spoken, setSpoken] = useState('')
  const [res, setRes] = useState<null | { pct: number; missing: string[] }>(null)
  const target = sentences[idx]
  const compare = async () => {
    const r = wordMatch(target, spoken); setRes(r)
    await logAttempt('oral', r.pct >= 80, `voice:${idx}`); await logSession('voice', 1)
  }
  return (
    <div>
      <PageHead title="Entraînement vocal" sub="Écoute, répète, puis compare le TEXTE reconnu avec la phrase cible. Ce n'est pas une analyse de prononciation." />
      <div className="card">
        <p className="mt-0 text-sm muted">Phrase {idx + 1} / {sentences.length}</p>
        <p className="text-xl" style={{ color: 'var(--acc)' }} data-testid="voice-target">{target}</p>
        <div className="flex flex-wrap gap-2"><Speak text={target} rate={0.95} label="Écouter" /><Speak text={target} rate={0.6} label="Écouter lentement" />
          <button className="btn" onClick={() => { setIdx((idx + 1) % sentences.length); setSpoken(''); setRes(null) }}>Phrase suivante</button></div>
        <div className="mt-3"><AnswerBox value={spoken} onChange={setSpoken} rows={2} placeholder="Dis la phrase (dictée) ou écris ce que tu as dit…" /></div>
        <button className="btn btn-primary mt-2" disabled={!spoken.trim()} onClick={compare}>Comparer le texte</button>
        {res && (<p className="mt-3" role="status"><Pill kind={res.pct >= 80 ? 'ok' : 'wa'}>{res.pct} % des mots retrouvés</Pill>{res.missing.length > 0 && <span> Mots non retrouvés : <b>{res.missing.join(', ')}</b></span>}</p>)}
        <p className="muted mb-0 mt-3 text-sm">Un mot non retrouvé peut venir d'une erreur de reconnaissance autant que de ta prononciation : aucune note de prononciation n'est donnée.</p>
      </div>
    </div>
  )
}
