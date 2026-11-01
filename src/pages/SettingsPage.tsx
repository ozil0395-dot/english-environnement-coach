import { useEffect, useState } from 'react'
import { PageHead, Pill } from '../components/shared'
import { useApp } from '../app/AppContext'
import { db } from '../services/storage/db'
import { backupFile, clearAll, exportAll, importAll } from '../services/export/backup'
import { DEFAULT_GEMINI_MODEL, geminiProvider, getGeminiKey, listGeminiModels, setGeminiKey } from '../services/ai/gemini'
import { aiErrorMessage } from '../services/ai/provider'
import { DEFAULT_PROFILE } from '../services/ai/coach'

interface InstallEvt extends Event { prompt(): Promise<void> }

export default function SettingsPage() {
  const { settings, set, ollama, refreshOllama, bumpKey, online } = useApp()
  const [key, setKey] = useState('')
  const [hasKey, setHasKey] = useState(!!getGeminiKey())
  const [models, setModels] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [bmsg, setBmsg] = useState('')
  const [profile, setProfile] = useState(settings.profile || DEFAULT_PROFILE)
  const [inst, setInst] = useState<InstallEvt | null>(null)
  useEffect(() => { const f = (e: Event) => { e.preventDefault(); setInst(e as InstallEvt) }; window.addEventListener('beforeinstallprompt', f); return () => window.removeEventListener('beforeinstallprompt', f) }, [])

  const saveKey = () => { if (key.trim()) { setGeminiKey(key.trim()); setHasKey(true); setKey(''); bumpKey(); setMsg('Clé enregistrée dans ce navigateur.') } else setMsg('Colle d\'abord une clé.') }
  const delKey = () => { setGeminiKey(''); setHasKey(false); bumpKey(); setMsg('Clé supprimée de ce navigateur.') }
  const test = async () => {
    setMsg('Test en cours…')
    try { const t = await geminiProvider({ model: settings.geminiModel, consent: settings.geminiConsent }).complete({ system: 'Reply with the single word OK.', messages: [{ role: 'user', content: 'ping' }], maxTokens: 512 }); setMsg(`Connexion réussie. Réponse du modèle : ${t.trim().slice(0, 40)}`) }
    catch (e) { setMsg(`Échec : ${aiErrorMessage(e)}`) }
  }
  const list = async () => { setMsg('Recherche des modèles…'); try { const m = await listGeminiModels(); setModels(m); setMsg(m.length ? `${m.length} modèles disponibles.` : 'Aucun modèle Gemini compatible trouvé.') } catch (e) { setMsg(`Échec : ${aiErrorMessage(e)}`) } }

  const doExport = async () => {
    const b = await exportAll(db); const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' })); a.download = 'english-environnement-coach-sauvegarde.json'; a.click(); await set('lastExport', Date.now()); setBmsg('Sauvegarde exportée (sans la clé API).')
  }
  const canShareFiles = typeof navigator.canShare === 'function'
  const doShare = async () => {
    try {
      const f = await backupFile(db)
      if (!navigator.canShare?.({ files: [f] })) { setBmsg('Le partage de fichier n’est pas disponible ici : utilise « Exporter ».'); return }
      await navigator.share({ files: [f], title: 'Sauvegarde English-Environnement-Coach' })
      await set('lastExport', Date.now()); setBmsg('Sauvegarde envoyée (sans la clé API).')
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setBmsg('Partage impossible : utilise « Exporter ».') }
  }
  const doImport = async (f?: File) => { if (!f) return; try { await importAll(db, JSON.parse(await f.text())); setBmsg('Données importées. Recharge la page pour tout voir à jour.') } catch (e) { setBmsg(`Import annulé : ${e instanceof Error ? e.message : 'fichier invalide'}`) } }
  const doClear = async () => { if (window.confirm('Effacer définitivement tout l\'historique et les progrès locaux ? (La clé Gemini n\'est pas concernée.)')) { await clearAll(db); setBmsg('Données locales effacées. Recharge la page.') } }

  return (
    <div>
      <PageHead title="Paramètres, moteur IA et hors connexion" sub="L'application fonctionne sans IA. L'IA est facultative et gratuite à l'usage de base." />
      <div className="card mb-4"><h2 className="section">Objectifs</h2>
        <div className="flex flex-wrap gap-4">
          <label className="lbl">Objectif quotidien (min) <input className="field" style={{ width: 110 }} type="number" min={1} max={240} value={settings.dailyGoal} onChange={(e) => set('dailyGoal', Math.max(1, +e.target.value || 10))} /></label>
          <label className="lbl">Objectif hebdomadaire (min) <input className="field" style={{ width: 110 }} type="number" min={1} max={1680} value={settings.weeklyGoal} onChange={(e) => set('weeklyGoal', Math.max(1, +e.target.value || 60))} /></label>
        </div></div>

      <div className="card mb-4"><h2 className="section">Moteur IA</h2>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2" role="radiogroup" aria-label="Moteur IA">
          {([['none', 'Aucun (mode sans IA)'], ['gemini', 'Gemini (Google, clé personnelle)'], ['ollama', 'Ollama (local)']] as const).map(([v, l]) => (
            <label key={v}><input type="radio" name="prov" checked={settings.provider === v} onChange={() => set('provider', v)} data-testid={`prov-${v}`} /> {l}</label>))}
        </div></div>

      <div className="card mb-4"><h2 className="section">Gemini {hasKey ? <Pill kind="ok">clé enregistrée</Pill> : <Pill kind="wa">aucune clé</Pill>}</h2>
        <p className="muted text-sm">Colle ta clé API Gemini personnelle (Google AI Studio). Elle est stockée en clair dans ce navigateur, jamais dans le code ni dans l'export. Quiconque utilise ce profil du navigateur peut la lire : restreins la clé à l'API Gemini côté Google et surveille son quota (partagé si c'est la même clé qu'une autre application).</p>
        <div className="flex flex-wrap gap-2"><input className="field" style={{ maxWidth: 360 }} type="password" autoComplete="off" placeholder={hasKey ? 'Clé enregistrée (masquée)' : 'Colle ta clé ici'} aria-label="Clé API Gemini" value={key} onChange={(e) => setKey(e.target.value)} data-testid="gem-key" />
          <button className="btn btn-primary" onClick={saveKey} data-testid="gem-save">Enregistrer la clé</button><button className="btn btn-danger" onClick={delKey}>Supprimer la clé</button></div>
        <label className="lbl">Modèle <input className="field" style={{ maxWidth: 320 }} list="gml" value={settings.geminiModel} onChange={(e) => set('geminiModel', e.target.value)} placeholder={DEFAULT_GEMINI_MODEL} /></label><datalist id="gml">{[DEFAULT_GEMINI_MODEL, ...models].map((m) => <option key={m} value={m} />)}</datalist>
        <label className="check"><input type="checkbox" checked={settings.geminiConsent} onChange={(e) => set('geminiConsent', e.target.checked)} data-testid="gem-consent" /> J'accepte que le texte envoyé au coach (réponses, rédactions, répliques de jeu de rôle) soit transmis à Google.</label>
        <label className="lbl">Contexte professionnel envoyé au modèle (modifiable ; ni chiffres internes ni données confidentielles)<textarea className="field" rows={3} value={profile} onChange={(e) => { setProfile(e.target.value); set('profile', e.target.value === DEFAULT_PROFILE ? '' : e.target.value) }} /></label>
        <div className="mt-4 flex flex-wrap gap-2"><button className="btn" onClick={test} data-testid="gem-test" disabled={!online}>Tester la connexion</button><button className="btn" onClick={list} disabled={!hasKey || !online}>Lister les modèles</button></div>
        {msg && <p role="status" className="mb-0" data-testid="gem-msg">{msg}</p>}
        <p className="muted mb-0 mt-2 text-sm">Sur le palier gratuit, les conditions de Google peuvent autoriser l'usage des contenus envoyés pour améliorer leurs produits : vérifie les conditions en vigueur. Seul le texte nécessaire est envoyé, jamais l'historique complet.</p></div>

      <div className="card mb-4"><h2 className="section">Ollama (IA locale)</h2>
        <p className="muted text-sm">Installe Ollama et un modèle léger séparément (voir README). Le texte reste sur ton ordinateur. Le premier modèle peut être lent sur une machine modeste.</p>
        <button className="btn" onClick={refreshOllama} data-testid="ollama-check">Vérifier Ollama</button>
        {ollama?.state === 'down' && <p role="status"><Pill kind="no">Ollama introuvable</Pill> Le serveur ne répond pas sur http://localhost:11434, ou le navigateur est bloqué (variable OLLAMA_ORIGINS, voir README). L'application continue sans IA.</p>}
        {ollama?.state === 'ok' && (ollama.models.length === 0
          ? <p role="status"><Pill kind="wa">Aucun modèle installé</Pill> Exemple : <code>ollama pull llama3.2:3b</code></p>
          : <label className="lbl">Modèle à utiliser <select className="field" style={{ maxWidth: 320 }} value={settings.ollamaModel} onChange={(e) => set('ollamaModel', e.target.value)}><option value="">— choisir —</option>{ollama.models.map((m) => <option key={m}>{m}</option>)}</select></label>)}</div>

      <div className="card mb-4"><h2 className="section">Mode hors connexion et installation</h2>
        <ul className="pl-5"><li>Hors ligne : navigation, leçons, vocabulaire, exercices, révisions, progression, historique, export/import.</li><li>Nécessitent Internet : dictée Chrome, Gemini. Ollama fonctionne hors ligne s'il est installé et lancé.</li></ul>
        {inst ? <button className="btn" onClick={() => inst.prompt()}>Installer l'application</button> : <p className="muted mb-0 text-sm">Installation : menu Chrome (⋮) → « Installer English-Environnement-Coach ». Disponible après un premier chargement en ligne.</p>}</div>

      <div className="card"><h2 className="section">Sauvegarde et confidentialité</h2>
        <p className="muted mt-1 text-sm" data-testid="last-export">Dernière sauvegarde : {settings.lastExport ? new Date(settings.lastExport).toLocaleDateString('fr-FR') : 'jamais'}. Exporte une fois par semaine : Safari peut effacer les données d’un site après quelques semaines sans usage.</p>
        <div className="mt-3 flex flex-wrap gap-2">{canShareFiles && <button className="btn btn-primary" onClick={doShare} data-testid="share-backup">Enregistrer dans Fichiers / iCloud</button>}<button className="btn" onClick={doExport} data-testid="export">Exporter mes données (JSON)</button>
          <label className="btn cursor-pointer">Importer<input type="file" accept="application/json" hidden onChange={(e) => doImport(e.target.files?.[0])} data-testid="import" /></label>
          <button className="btn btn-danger" onClick={doClear}>Effacer l'historique local</button></div>
        {bmsg && <p role="status" className="mb-0">{bmsg}</p>}
        <ul className="muted mb-0 mt-3 pl-5 text-sm"><li>Les progrès restent dans ce navigateur (IndexedDB).</li><li>Sans clé ou sans consentement, aucun texte n'est envoyé à Google.</li><li>La dictée Chrome envoie l'audio à un service externe.</li><li>Permissions : microphone (dictée) et lecture audio, demandées à l'usage.</li><li>Ne saisis pas d'informations confidentielles d'entreprise.</li></ul></div>
    </div>
  )
}
