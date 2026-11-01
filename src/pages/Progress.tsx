import { PageHead, Pill } from '../components/shared'
import { useDb } from '../hooks/useDb'
import { db } from '../services/storage/db'
import { computeStats } from '../services/stats/stats'
import { predictionGap } from '../services/stats/calibration'
import { weeklyReview } from '../services/stats/weekly'
import type { RouteId } from '../app/router'

const SK: Record<string, string> = { grammaire: 'Grammaire', vocabulaire: 'Vocabulaire', 'vocabulaire pro': 'Vocabulaire pro', lecture: 'Lecture', ecoute: 'Écoute', ecriture: 'Écriture', oral: 'Oral' }
const Empty = ({ children }: { children: string }) => <p className="muted m-0">{children}</p>

export default function Progress({ go }: { go?: (r: RouteId) => void }) {
  const d = useDb(async () => ({ s: await db.sessions.toArray(), a: await db.attempts.toArray(), h: await db.history.orderBy('ts').reverse().limit(10).toArray(), t: await db.tests.orderBy('ts').reverse().toArray(), p: await db.predictions.orderBy('ts').reverse().limit(6).toArray(), r: await db.reflections.orderBy('ts').reverse().limit(5).toArray(), rv: await db.reviews.orderBy('due').toArray(), e: await db.errors.toArray() }), { s: [], a: [], h: [], t: [], p: [], r: [], rv: [], e: [] })
  const st = computeStats(d.s, d.a)
  const wk = weeklyReview(d.a, d.s, d.e)
  const skills = Object.entries(st.bySkill).map(([k, v]) => ({ name: SK[k] ?? k, pct: Math.round((100 * v.ok) / v.n), n: v.n })).sort((a, b) => b.pct - a.pct)
  const days = st.last7.map((x, i, arr) => ({ day: x.day.slice(5), minutes: x.minutes, today: i === arr.length - 1 }))
  const max = Math.max(4, ...days.map((x) => x.minutes))
  const total = days.reduce((a, x) => a + x.minutes, 0)
  return (
    <div>
      <PageHead title="Historique et progression" sub="Minutes de pratique active par jour. L'ouverture de l'application ne compte pas." />
      <div className="grid12">
        <section className="panel span-6" data-testid="weekly-review"><div className="panel-head"><h2>Bilan de la semaine</h2></div>
          {wk.answers === 0 && wk.minutes === 0 ? (
            <div className="flex flex-1 flex-col gap-3"><p className="muted m-0">Rien d’enregistré ces 7 derniers jours. Une session de 10 minutes suffit pour démarrer.</p>{go && <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onClick={() => go('dashboard')}>Voir le plan du jour</button>}</div>
          ) : (
            <ul className="plainlist fill">
              <li>{wk.activeDays} jour(s) de pratique, {wk.minutes} min au total, {wk.answers} réponse(s) enregistrée(s).</li>
              {wk.rate !== null && <li>Réussite : {wk.rate} %{wk.prevRate !== null ? ` (semaine précédente : ${wk.prevRate} %)` : ''}.</li>}
              {wk.best && wk.weakest && wk.best.skill !== wk.weakest.skill && <li>Le plus solide : {SK[wk.best.skill] ?? wk.best.skill} ({wk.best.pct} %). À travailler en priorité : {SK[wk.weakest.skill] ?? wk.weakest.skill} ({wk.weakest.pct} %).</li>}
              {wk.topErrors.map((e) => <li key={e.original}>Erreur à corriger : « {e.original} » devient « {e.fix} » (vue {e.count} fois).</li>)}
            </ul>
          )}
        </section>

        <section className="panel span-6" data-testid="week-chart"><div className="panel-head"><h2>7 derniers jours</h2><span className="panel-note">{total} min au total</span></div>
          <div className="daychart" style={total === 0 ? { height: 110 } : undefined} role="img" aria-label={`Minutes par jour : ${days.map((x) => `${x.day} ${x.minutes}`).join(', ')}`}>
            {days.map((x) => (
              <div key={x.day} className={`wk-col${x.today ? ' today' : ''}`}>
                <span className="wk-val" aria-hidden="true">{x.minutes > 0 ? x.minutes : '—'}</span>
                <div className="wk-bar"><i style={{ transform: `scaleY(${x.minutes > 0 ? Math.max(0.05, x.minutes / max) : 0})` }} /></div>
                <span className="wk-day" aria-hidden="true">{x.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel" style={{ gridColumn: 'span 12' }}><div className="panel-head"><h2>Progression par compétence</h2><span className="panel-note">taux de réussite sur tes réponses enregistrées</span></div>
          {skills.length === 0 ? <Empty>Aucune réponse enregistrée pour l’instant. Réponds à quelques exercices (Parcours, Grammaire ou Vocabulaire) et ce graphique se remplit.</Empty> : (
            <div className="stack" style={{ gap: 12 }}>
              {skills.map((x) => (
                <div key={x.name} className="skillrow">
                  <span>{x.name}</span>
                  <div className="meter" role="presentation"><i style={{ transform: `scaleX(${x.pct / 100})` }} /></div>
                  <span>{x.pct} %</span>
                </div>
              ))}
            </div>)}
        </section>

        <section className="panel span-6"><div className="panel-head"><h2>Tests de niveau</h2></div>
          {d.t.length === 0 ? <Empty>Aucun test passé. Le test de niveau règle la suite du parcours.</Empty> : <ul className="plainlist">{d.t.map((x) => <li key={x.id}>{new Date(x.ts).toLocaleDateString('fr-FR')} — niveau estimé <b>{x.level}</b> ({x.correct}/{x.total}) <Pill kind="wa">estimation</Pill></li>)}</ul>}</section>
        <section className="panel span-6" data-testid="review-schedule"><div className="panel-head"><h2>Calendrier de révision</h2></div>
          {d.rv.length === 0 ? <Empty>Aucune leçon planifiée : termine une leçon ou un point de grammaire.</Empty> : <ul className="plainlist">{d.rv.slice(0, 8).map((x) => <li key={x.key}>{x.key.replace('lesson:', 'Leçon ').replace('grammar:', 'Grammaire ')} — {new Date(x.due).toLocaleDateString('fr-FR')} {x.due <= Date.now() && <Pill kind="wa">à réviser</Pill>}</li>)}</ul>}</section>
        <section className="panel span-6"><div className="panel-head"><h2>Mes prédictions</h2></div>
          {d.p.length === 0 ? <Empty>Aucune prédiction enregistrée.</Empty> : <ul className="plainlist">{d.p.map((x) => <li key={x.id}>{new Date(x.ts).toLocaleDateString('fr-FR')} — {predictionGap(x.predicted, x.actual, x.total)}</li>)}</ul>}</section>
        <section className="panel span-6"><div className="panel-head"><h2>Mes réflexions</h2></div>
          {d.r.length === 0 ? <Empty>Aucune réflexion enregistrée.</Empty> : <ul className="plainlist">{d.r.map((x) => <li key={x.id}>{new Date(x.ts).toLocaleDateString('fr-FR')} ({x.kind}) — {x.worked && <>bien : {x.worked}. </>}{x.failed && <>difficile : {x.failed}. </>}{x.change && <>à changer : {x.change}</>}</li>)}</ul>}</section>
        <section className="panel" style={{ gridColumn: 'span 12' }}><div className="panel-head"><h2>Derniers échanges</h2></div>
          {d.h.length === 0 ? <Empty>Aucun échange enregistré.</Empty> : <ul className="plainlist">{d.h.map((x) => <li key={x.id}>{new Date(x.ts).toLocaleString('fr-FR')} — {x.kind} : « {x.a.slice(0, 80)} »</li>)}</ul>}</section>
      </div>
    </div>
  )
}
