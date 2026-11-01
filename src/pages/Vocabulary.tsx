import { Flag, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageHead, Pill, Speak } from '../components/shared'
import { VOCAB, VOCAB_CATEGORIES } from '../data/vocabulary/bank'
import { useDb } from '../hooks/useDb'
import { db, type CardRec } from '../services/storage/db'
import { getCard, logAttempt, logSession, putCard } from '../services/storage/repo'
import { isDue, newCard, review, type Grade } from '../services/stats/srs'
import { normalize } from '../utils/text'
import { useApp } from '../app/AppContext'
import type { VocabItem } from '../types'

type Mode = 'list' | 'review' | 'translate' | 'cloze' | 'dictation'

export default function Vocabulary() {
  const [mode, setMode] = useState<Mode>('list')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [filter, setFilter] = useState<'all' | 'fav' | 'hard'>('all')
  const [shown, setShown] = useState(40)
  const cards = useDb(() => db.cards.toArray(), [])
  const custom = useDb(() => db.customWords.toArray(), [])
  const cmap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards])
  const all: VocabItem[] = useMemo(() => [...VOCAB, ...custom.map((w) => ({ id: `c:${w.en}`, en: w.en, fr: w.fr, ex: '', cat: 'Coach' }))], [custom])
  const cats = useMemo(() => [...new Set([...VOCAB_CATEGORIES, ...(custom.length ? ['Coach'] : [])])], [custom.length])

  const toggle = async (v: VocabItem, k: 'fav' | 'hard') => { const c: CardRec = (await getCard(v.id)) ?? newCard(v.id); await putCard({ ...c, [k]: !c[k] }) }

  const list = all.filter((v) => {
    const nq = normalize(q)
    if (nq && !normalize(`${v.en} ${v.fr}`).includes(nq)) return false
    if (cat && v.cat !== cat) return false
    const c = cmap.get(v.id)
    return filter === 'all' || (filter === 'fav' ? c?.fav : c?.hard)
  })

  return (
    <div>
      <PageHead title="Vocabulaire technique" sub={`${all.length} mots et expressions. Traductions indicatives : vérifie les termes techniques dans tes documents officiels.`} />
      <div className="tabs" role="tablist">
        {([['list', 'Dictionnaire'], ['review', 'Révision espacée'], ['translate', 'Traduction'], ['cloze', 'Phrases à compléter'], ['dictation', 'Dictée']] as [Mode, string][]).map(([m, l]) => (
          <button key={m} role="tab" aria-selected={mode === m} className="tab" onClick={() => setMode(m)} data-testid={`vmode-${m}`}>{l}</button>))}
      </div>
      {mode === 'list' && (<>
        <div className="mb-3 flex flex-wrap gap-2">
          <input className="field" style={{ flex: 1, minWidth: 200, width: 'auto' }} placeholder="Rechercher en anglais ou en français" aria-label="Recherche" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field" style={{ width: 'auto' }} aria-label="Catégorie" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Toutes catégories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="field" style={{ width: 'auto' }} aria-label="Filtre" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">Tous</option><option value="fav">Favoris</option><option value="hard">Mots difficiles</option></select>
        </div>
        <p className="panel-note mb-2">{list.length} mot{list.length > 1 ? 's' : ''}{list.length > shown ? ` · ${Math.min(shown, list.length)} affichés` : ''}</p>
        <div className="list" data-testid="vocab-list">
          {list.length === 0 ? <div className="row"><span className="muted">Aucun mot pour ce filtre.</span></div> : list.slice(0, shown).map((v) => { const c = cmap.get(v.id); return (
            <div key={v.id} className="row">
              <div className="row-main"><b>{v.en}</b> — {v.fr} <Pill>{v.cat}</Pill>{v.ex && <div className="row-sub">{v.ex}</div>}</div>
              <div className="row-actions vocab-actions"><Speak text={v.en} label="Audio" />
                <button className="btn btn-sm" aria-pressed={!!c?.fav} onClick={() => toggle(v, 'fav')}><Star size={14} strokeWidth={1.75} fill={c?.fav ? 'currentColor' : 'none'} aria-hidden="true" />Favori</button>
                <button className="btn btn-sm" aria-pressed={!!c?.hard} onClick={() => toggle(v, 'hard')}><Flag size={14} strokeWidth={1.75} fill={c?.hard ? 'currentColor' : 'none'} aria-hidden="true" />Difficile</button></div>
            </div>) })}
        </div>
        {list.length > shown && <div className="more"><button className="btn" onClick={() => setShown((n) => n + 40)} data-testid="vocab-more">Afficher 40 mots de plus</button></div>}
      </>)}
      {mode === 'review' && <Review all={all} cmap={cmap} />}
      {mode === 'translate' && <Quiz kind="translate" all={all} />}
      {mode === 'cloze' && <Quiz kind="cloze" all={all} />}
      {mode === 'dictation' && <Quiz kind="dictation" all={all} />}
    </div>
  )
}

function Review({ all, cmap }: { all: VocabItem[]; cmap: Map<string, CardRec> }) {
  const [flip, setFlip] = useState(false)
  const [done, setDone] = useState(0)
  const [tally, setTally] = useState<number[]>([0, 0, 0, 0])
  const [queue] = useState(() => {
    const now = Date.now()
    const due = all.filter((v) => { const c = cmap.get(v.id); return c && c.seen && isDue(c, now) })
    const fresh = all.filter((v) => !cmap.get(v.id)?.seen).slice(0, 10)
    return [...due, ...fresh].slice(0, 20)
  })
  const cur = queue[done]
  const grade = async (g: Grade) => {
    if (!cur) return
    const c = cmap.get(cur.id) ?? newCard(cur.id)
    await putCard(review(c, g)); await logAttempt('vocabulaire', g >= 2, cur.id)
    if (done + 1 >= queue.length) await logSession('review', Math.max(1, Math.round(queue.length / 6)))
    setTally((tt) => tt.map((n, k) => (k === g ? n + 1 : n)))
    setDone(done + 1); setFlip(false)
  }
  // Raccourcis : Espace ou Entrée retourne la carte ; 1 à 4 notent (Oublié, Difficile, Bien, Facile).
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (!flip && (e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON') { e.preventDefault(); setFlip(true) }
      if (flip && ['1', '2', '3', '4'].includes(e.key)) grade((Number(e.key) - 1) as Grade)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })
  if (!cur) {
    return (
      <div className="card" data-testid="review-empty">
        <p className="m-0">{queue.length ? 'Révision terminée. Reviens demain pour les prochains mots.' : 'Aucun mot à réviser pour le moment : tout est à jour. Essaie « Traduction » ou « Dictée » pour t’entraîner quand même.'}</p>
        {queue.length > 0 && <p className="muted mb-0 mt-2 text-sm">Oubliés : {tally[0]} · Difficiles : {tally[1]} · Bien : {tally[2]} · Faciles : {tally[3]}. Les mots oubliés reviennent bientôt, les faciles plus tard.</p>}
      </div>
    )
  }
  return (
    <div aria-live="polite">
      <div className="mb-2 flex items-center justify-between text-sm"><span className="muted">Carte {done + 1} / {queue.length}</span><span className="muted">Espace : retourner · 1 à 4 : noter</span></div>
      <div className="meter mb-3" role="presentation"><i style={{ transform: `scaleX(${done / queue.length})` }} /></div>
      <button type="button" className="flashcard" onClick={() => setFlip(!flip)} data-testid="card" aria-label="Retourner la carte">
        {flip
          ? <span><span className="flash-main">{cur.fr}</span>{cur.ex && <small className="flash-sub">{cur.ex}</small>}</span>
          : <span className="flash-main">{cur.en}</span>}
      </button>
      <div className="mt-3"><Speak text={cur.ex || cur.en} label="Écouter" /></div>
      {flip ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-danger" onClick={() => grade(0)}>Oublié</button>
          <button className="btn" onClick={() => grade(1)}>Difficile</button>
          <button className="btn btn-primary" onClick={() => grade(2)} data-testid="grade-good">Bien</button>
          <button className="btn" onClick={() => grade(3)}>Facile</button>
        </div>
      ) : <p className="muted mb-0 mt-3 text-sm">Essaie de répondre à voix haute, puis retourne la carte.</p>}
    </div>
  )
}

function Quiz({ kind, all }: { kind: 'translate' | 'cloze' | 'dictation'; all: VocabItem[] }) {
  const { caps } = useApp()
  const pool = useMemo(() => (kind === 'cloze' ? all.filter((v) => v.ex && normalize(v.ex).includes(normalize(v.en.replace(/\(.*?\)/g, '').trim()))) : all).sort(() => Math.random() - 0.5).slice(0, 8), [all, kind])
  const [i, setI] = useState(0)
  const [val, setVal] = useState('')
  const [ok, setOk] = useState<null | boolean>(null)
  const [score, setScore] = useState(0)
  const v = pool[i]
  if (!v) return <div className="card"><p className="m-0">{pool.length ? `Terminé : ${score}/${pool.length}.` : 'Pas assez de mots pour cet exercice.'}</p></div>
  const target = v.en.replace(/\(.*?\)/g, '').trim()
  const prompt = kind === 'dictation' ? 'Écoute le mot, puis écris-le en anglais.' : kind === 'translate' ? `Traduis en anglais : « ${v.fr} »` : v.ex.replace(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '_____')
  const check = async () => {
    const good = normalize(val) === normalize(target)
    setOk(good); if (good) setScore((s) => s + 1)
    await logAttempt('vocabulaire', good, `${kind}:${v.id}`)
  }
  const next = async () => { if (i + 1 >= pool.length) await logSession(kind, 2); setI(i + 1); setVal(''); setOk(null) }
  return (
    <div className="card" aria-live="polite">
      <p className="muted mt-0 text-sm">{i + 1} / {pool.length}</p>
      <p className="text-lg">{prompt}</p>
      {kind === 'dictation' && (caps.synthesis ? <div className="mb-3 flex gap-2"><Speak text={target} label="Écouter" /><Speak text={target} rate={0.6} label="Écouter lentement" /></div> : <p className="muted">La lecture audio n’est pas disponible sur cet appareil : utilise « Traduction ».</p>)}
      <form onSubmit={(e) => { e.preventDefault(); if (ok === null) check() }} className="flex flex-wrap gap-2"><input className="field" style={{ maxWidth: 380 }} value={val} onChange={(e) => setVal(e.target.value)} disabled={ok !== null} aria-label="Ta réponse" /><button className="btn" type="submit" disabled={ok !== null || !val.trim()}>Vérifier</button></form>
      {ok !== null && (<div className="mt-3"><Pill kind={ok ? 'ok' : 'no'}>{ok ? 'Correct' : 'Incorrect'}</Pill>{!ok && <span> Réponse : <b>{target}</b></span>}<div className="mt-2"><button className="btn" onClick={next}>{i + 1 >= pool.length ? 'Terminer' : 'Suivant'}</button></div></div>)}
    </div>
  )
}
