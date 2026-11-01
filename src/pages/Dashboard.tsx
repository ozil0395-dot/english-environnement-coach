import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { todayKey } from '../utils/text'
import { PageHead, Pill, Speak } from '../components/shared'
import { useDb } from '../hooks/useDb'
import { db } from '../services/storage/db'
import { computeStats } from '../services/stats/stats'
import { ALL_LESSONS, MODULES } from '../data/curriculum/modules'
import { GRAMMAR } from '../data/exercises/grammar'
import { VOCAB } from '../data/vocabulary/bank'
import { useApp } from '../app/AppContext'
import type { RouteId } from '../app/router'
import { Session, type SessionKind } from '../components/Session'
import { calibrationAdvice, computeCalibration } from '../services/stats/calibration'

/** Chiffre clé : l'étiquette est au-dessus (CSS), le zéro s'affiche comme un zéro, l'absence de donnée comme un tiret grisé. */
const Stat = ({ v, label }: { v: string | number; label: string }) => (<div className="kpi"><b className={v === '—' ? 'na' : undefined}>{v}</b><span>{label}</span></div>)
const Meter = ({ pct }: { pct: number }) => (<div className="meter" role="presentation"><i style={{ transform: `scaleX(${Math.min(1, Math.max(0, pct / 100))})` }} /></div>)

export default function Dashboard({ go }: { go: (r: RouteId) => void }) {
  const { settings } = useApp()
  const [session, setSession] = useState<SessionKind | null>(null)
  const data = useDb(async () => ({
    sessions: await db.sessions.toArray(), attempts: await db.attempts.toArray(),
    cards: await db.cards.toArray(), done: await db.lessonsDone.toArray(), words: await db.customWords.count(),
    reviews: await db.reviews.toArray(), errors: await db.errors.count(),
  }), { sessions: [], attempts: [], cards: [], done: [], words: 0, reviews: [], errors: 0 })
  const s = computeStats(data.sessions, data.attempts)
  const due = data.cards.filter((c) => c.due <= Date.now() && c.seen).length
  const learned = data.cards.filter((c) => c.reps >= 2).length
  const hard = data.cards.filter((c) => c.hard).length
  const now = Date.now()
  const dueLessons = data.reviews.filter((r) => r.key.startsWith('lesson:') && r.due <= now)
  const dueGrammar = data.reviews.filter((r) => r.key.startsWith('grammar:') && r.due <= now)
  const dueCards = data.cards.filter((c) => c.seen && c.due <= now).length
  const dueTotal = dueLessons.length + dueGrammar.length + dueCards
  const calib = computeCalibration(data.attempts)
  const nextDue = data.reviews.filter((r) => r.due > now).sort((a, b) => a.due - b.due)[0]
  const doneIds = new Set(data.done.map((d) => d.lessonId))
  const nextModule = MODULES.find((m) => m.lessons.some((l) => !doneIds.has(l.id)))
  if (session) return <Session kind={session} onExit={() => setSession(null)} />

  // Plan du jour : trois gestes courts, cochés d'après ce qui est réellement enregistré aujourd'hui.
  const today = todayKey()
  const kindsToday = new Set(data.sessions.filter((x) => x.date === today).map((x) => x.kind))
  const hasAny = (ks: string[]) => ks.some((k) => kindsToday.has(k))
  const steps: { id: string; title: string; detail: string; done: boolean; label: string; run: () => void }[] = [
    { id: 'review', title: 'Réviser', done: hasAny(['review-due', 'review-mixed', 'review-quick', 'review', 'translate', 'cloze', 'dictation']),
      detail: dueTotal > 0 ? `${dueTotal} élément(s) à réviser : c'est le bon moment.` : 'Rien d’échu : une session mixte entretient ce que tu sais.',
      label: dueTotal > 0 ? 'Réviser maintenant' : 'Session mixte', run: () => setSession(dueTotal > 0 ? 'due' : 'mixed') },
    { id: 'learn', title: settings.level ? 'Apprendre' : 'Faire le test de niveau', done: hasAny(settings.level ? ['lesson'] : ['test', 'lesson']),
      detail: settings.level ? (nextModule ? `Module ${nextModule.id} : ${nextModule.title}.` : 'Tous les modules sont faits : refais-en un pour consolider.') : 'Il règle la suite du parcours (environ 15 minutes).',
      label: settings.level ? 'Ouvrir le parcours' : 'Commencer le test', run: () => go(settings.level ? 'path' : 'test') },
    { id: 'speak', title: 'Parler ou écrire', done: hasAny(['voice', 'conversation', 'scenario', 'interview']),
      detail: '2 minutes : dis une phrase à voix haute ou réponds au coach.', label: 'Conversation', run: () => go('conversation') },
  ]
  // Tant que le niveau n'est pas connu, le test passe en premier : il règle tout le reste.
  if (!settings.level) steps.sort((x, y) => (x.id === 'learn' ? -1 : 0) - (y.id === 'learn' ? -1 : 0))
  const nextStep = steps.find((s) => !s.done)
  const dateLine = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  // Le titre dit le fait du jour, tiré des données ; la ligne dessous donne le geste et la date.
  const headline = dueTotal > 0 ? `${dueTotal} élément${dueTotal > 1 ? 's' : ''} à réviser aujourd’hui` : nextStep ? `Prochain geste : ${nextStep.title.toLowerCase()}` : 'Plan du jour terminé'
  const finding = nextStep ? `${dateLine[0].toUpperCase()}${dateLine.slice(1)}. ${nextStep.detail}` : `${dateLine[0].toUpperCase()}${dateLine.slice(1)}. Reviens demain : c’est la régularité qui fait progresser.`

  // Mot du jour : le même toute la journée, différent demain.
  const wordOfDay = VOCAB[[...today].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % VOCAB.length]
  const backupDue = data.sessions.length > 0 && now - settings.lastExport > 7 * 86400000

  const dayPct = (100 * s.todayMinutes) / settings.dailyGoal
  const weekPct = (100 * s.weekMinutes) / settings.weeklyGoal

  // Sept derniers jours (aujourd'hui à droite) : minutes de pratique active, à l'échelle de l'objectif du jour.
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = todayKey(d)
    return { key, today: i === 6, min: data.sessions.filter((x) => x.date === key).reduce((a, x) => a + x.minutes, 0), label: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }) }
  })
  const weekMax = Math.max(settings.dailyGoal, ...week.map((x) => x.min), 1)

  return (
    <div>
      <PageHead title={headline} sub={finding} />

      {backupDue && (
        <div className="notice" role="note" data-testid="backup-reminder">
          <span>Pense à sauvegarder tes progrès ({settings.lastExport ? `dernière sauvegarde le ${new Date(settings.lastExport).toLocaleDateString('fr-FR')}` : 'aucune sauvegarde pour l’instant'}). Safari peut effacer les données d’un site inutilisé.</span>
          <button className="btn btn-sm" onClick={() => go('settings')}>Sauvegarder</button>
        </div>
      )}

      <div className="grid12">
        <section className="panel span-9" aria-label="Plan du jour">
          <div className="panel-head"><h2>Plan du jour</h2><Pill kind={nextStep ? 'wa' : 'ok'}>{nextStep ? `${steps.filter((x) => x.done).length} / 3 faits` : 'terminé'}</Pill></div>
          <div className="rows" data-testid="daily-plan" role="list" aria-label="Plan du jour">
            {steps.map((x) => (
              <div key={x.id} className="row" role="listitem">
                <div className="row-main">
                  <span className="row-title">{x.done ? <Check size={15} strokeWidth={2.5} className="plan-check" aria-label="fait" /> : <span className="plan-num" aria-hidden="true" />}{x.title}</span>
                  <div className="row-sub">{x.done ? 'Fait aujourd’hui.' : x.detail}</div>
                </div>
                {!x.done && <button className={`btn${x === nextStep ? ' btn-primary' : ''}`} onClick={x.run} data-testid={`plan-${x.id}`}>{x.label}{x === nextStep && <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />}</button>}
              </div>
            ))}
          </div>
        </section>

        <section className="panel span-3" aria-label="Ta semaine">
          <div className="panel-head"><h2>Ta semaine</h2></div>
          <div className="weekstrip" role="img" aria-label={`Minutes de pratique active sur 7 jours : ${week.map((x) => x.min).join(', ')}`}>
            {week.map((x) => (
              <div key={x.key} className={`wk-col${x.today ? ' today' : ''}`}>
                <div className="wk-bar"><i className={x.min > 0 ? 'on' : ''} style={{ transform: `scaleY(${x.min > 0 ? Math.max(0.14, Math.min(1, x.min / weekMax)) : 0})` }} /></div>
                <span className="wk-day" aria-hidden="true">{x.label}</span>
              </div>
            ))}
          </div>
          <div className="goal">
            <div className="goal-top"><b>Objectif du jour</b><span>{s.todayMinutes} / {settings.dailyGoal} min</span></div>
            <Meter pct={dayPct} />
          </div>
          <div className="goal">
            <div className="goal-top"><b>Objectif de la semaine</b><span>{s.weekMinutes} / {settings.weeklyGoal} min</span></div>
            <Meter pct={weekPct} />
          </div>
        </section>

        <div className="kpis">
          <Stat v={s.sessions} label="Séances" />
          <Stat v={s.minutes} label="Minutes de pratique active" />
          <Stat v={data.done.length} label="Leçons terminées" />
          <Stat v={learned + data.words} label="Mots appris" />
          <Stat v={hard + due} label="Mots à revoir" />
          <Stat v={s.successRate === null ? '—' : `${s.successRate} %`} label="Réussite aux exercices" />
          <Stat v={s.streak} label="Jours de suite" />
          <Stat v={settings.level ? settings.level.split(' ')[0] : '—'} label="Niveau estimé (test)" />
        </div>

        <section className="panel span-6" data-testid="due-card">
          <div className="panel-head"><h2>À réviser aujourd'hui</h2>{dueTotal > 0 ? <Pill kind="wa">{dueTotal} élément(s)</Pill> : <Pill kind="ok">rien d'échu</Pill>}</div>
          <div className="duegrid" aria-label="Détail des éléments à réviser">
            <div><b>{dueLessons.length}</b><span>Leçons</span></div>
            <div><b>{dueGrammar.length}</b><span>Grammaire</span></div>
            <div><b>{dueCards}</b><span>Mots</span></div>
            <div><b>{data.errors}</b><span>Erreurs notées</span></div>
          </div>
          <p className="panel-note">
            {dueTotal === 0 && nextDue ? `Prochaine échéance : ${new Date(nextDue.due).toLocaleDateString('fr-FR')} (${nextDue.key.replace('lesson:', 'leçon ').replace('grammar:', 'grammaire ')}). ` : ''}
            Revenir quand tu as un peu oublié est ce qui fixe la mémoire : relire ne le fait pas.
          </p>
          <div className="flex flex-wrap gap-2 mt-auto">
            {dueTotal > 0
              ? <button className="btn" onClick={() => setSession('due')} data-testid="start-due">Session du jour</button>
              : <button className="btn" disabled data-testid="start-due">Session du jour</button>}
            <button className="btn" onClick={() => setSession('quick')} data-testid="start-quick">Session 5 minutes</button>
            <button className="btn" onClick={() => setSession('mixed')} data-testid="start-mixed">Session mixte ({ALL_LESSONS.length + GRAMMAR.length} thèmes entrelacés)</button>
          </div>
        </section>

        <div className="span-6 flex flex-col gap-4">
          <section className="panel" data-testid="calib-card">
            <div className="panel-head"><h2>Calibration : ta confiance vs la réalité</h2></div>
            <p className="m-0">{calibrationAdvice(calib)}</p>
            {calib.n > 0 && <p className="panel-note">Sûr : {calib.sureOk}/{calib.sureN} corrects · Pas sûr : {calib.unsureOk}/{calib.unsureN} corrects · erreurs avec forte confiance : {calib.overconfident}.</p>}
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Pratiquer maintenant</h2></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn" onClick={() => go('vocabulary')}>{due ? `Réviser ${due} mot(s)` : 'Vocabulaire'}</button>
              <button className="btn" onClick={() => go('conversation')}>Conversation</button>
              <button className="btn" onClick={() => go('scenarios')}>Simulations</button>
            </div>
          </section>
        </div>

        <section className="panel" style={{ gridColumn: 'span 12' }} aria-label="Mot du jour" data-testid="word-of-day">
          <div className="panel-head"><h2>Mot du jour</h2><Pill>{wordOfDay.cat}</Pill></div>
          <p className="m-0" style={{ fontSize: 20 }}><b style={{ fontWeight: 500 }}>{wordOfDay.en}</b> <span className="muted">— {wordOfDay.fr}</span></p>
          {wordOfDay.ex && <p className="panel-note">{wordOfDay.ex} <Speak text={wordOfDay.ex} label="Écouter" /></p>}
        </section>
      </div>
      <p className="muted mb-0 mt-4 text-sm">Chiffres calculés uniquement à partir de ta pratique enregistrée sur cet appareil.</p>
    </div>
  )
}
