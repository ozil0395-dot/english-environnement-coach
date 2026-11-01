import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import { BookA, BriefcaseBusiness, ChartColumn, ClipboardCheck, LayoutDashboard, Menu, MessageSquare, Mic, Moon, PenLine, Route as RouteIcon, Settings, SpellCheck, Sun, Theater, X, type LucideIcon } from 'lucide-react'
import { AppProvider, useApp } from './AppContext'
import { ROUTES, useRoute, type RouteId } from './router'
import signatureLight from '../assets/signature.png'
import signatureDark from '../assets/signature-dark.png'
import { applyUpdate, onUpdateAvailable } from './updates'
import type { ReactNode } from 'react'

type PageProps = { go: (r: RouteId) => void }
const loaders: Record<RouteId, () => Promise<{ default: ComponentType<PageProps> }>> = {
  dashboard: () => import('../pages/Dashboard'), test: () => import('../pages/PlacementTest'), path: () => import('../pages/Path'),
  conversation: () => import('../pages/Conversation'), voice: () => import('../pages/Voice'), scenarios: () => import('../pages/Scenarios'),
  vocabulary: () => import('../pages/Vocabulary'), grammar: () => import('../pages/Grammar'), writing: () => import('../pages/Writing'),
  interview: () => import('../pages/Interview'), progress: () => import('../pages/Progress'), settings: () => import('../pages/SettingsPage'),
}
const PAGES = Object.fromEntries(Object.entries(loaders).map(([k, l]) => [k, lazy(l)])) as unknown as Record<RouteId, ComponentType<PageProps>>

/** Une fois la page affichée, on charge les autres écrans en arrière-plan : le service worker les met en cache pour le mode hors connexion. */
function preloadAll() {
  const run = () => Object.values(loaders).forEach((l) => { l().catch(() => { /* hors ligne : réessayé au prochain chargement */ }) })
  // Délai maximal de 300 ms : même si le navigateur reste occupé, les écrans sont demandés tout de suite après l'affichage (sinon, couper le réseau trop tôt laisse des écrans non mis en cache).
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 300 }); else setTimeout(run, 300)
}

/** iPhone/iPad dans un onglet Safari (pas encore ajouté à l'écran d'accueil) : on explique comment l'installer pour le mode hors connexion. */
function isIosBrowserTab() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  return ios && !standalone
}

const ICONS: Record<RouteId, LucideIcon> = {
  dashboard: LayoutDashboard, test: ClipboardCheck, path: RouteIcon, conversation: MessageSquare, voice: Mic, scenarios: Theater,
  vocabulary: BookA, grammar: SpellCheck, writing: PenLine, interview: BriefcaseBusiness, progress: ChartColumn, settings: Settings,
}

/** Regroupement de la navigation par intention (le parcours reste le même, seul l'ordre visuel change). */
const GROUPS: { label: string; ids: RouteId[] }[] = [
  { label: 'Aujourd’hui', ids: ['dashboard'] },
  { label: 'Apprendre', ids: ['test', 'path', 'vocabulary', 'grammar'] },
  { label: 'Pratiquer', ids: ['conversation', 'voice', 'scenarios', 'writing', 'interview'] },
  { label: 'Suivre', ids: ['progress', 'settings'] },
]
const LABEL = Object.fromEntries(ROUTES.map((r) => [r.id, r.label])) as Record<RouteId, string>

/** Les cinq destinations de tous les jours, dans la barre du bas sur téléphone (le reste est dans le menu). */
const TABS: { id: RouteId; label: string }[] = [
  { id: 'dashboard', label: 'Accueil' }, { id: 'path', label: 'Parcours' }, { id: 'vocabulary', label: 'Vocabulaire' },
  { id: 'conversation', label: 'Parler' }, { id: 'progress', label: 'Progrès' },
]

function TabBar({ route, go }: { route: RouteId; go: (r: RouteId) => void }) {
  return (
    <nav className="tabbar" aria-label="Navigation rapide">
      {TABS.map((t) => {
        const Icon = ICONS[t.id]
        return (
          <button key={t.id} type="button" data-testid={`tab-${t.id}`} className="tab-item" onClick={() => go(t.id)} aria-current={route === t.id ? 'page' : undefined}>
            <Icon size={22} strokeWidth={route === t.id ? 2 : 1.6} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

/** Marque du produit : une feuille posée sur une bulle de dialogue (apprendre l'anglais + environnement). */
function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--acc)" />
      <path d="M9 22.5c0-7 4.6-11.7 14-12.5-.4 8.6-4.9 13.3-11.6 13.3-.9 0-1.7-.2-2.4-.5V22.5z" fill="var(--acc-tx)" />
      <path d="M9.5 23.5c2.2-4.6 5.2-7.4 9-9.2" fill="none" stroke="var(--acc)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function Signature() {
  return (
    <div className="side-foot">
      <img className="signature signature-light" src={signatureLight} width={276} height={80} alt="Signature de Hicham, ingénieur environnement" />
      <img className="signature signature-dark" src={signatureDark} width={276} height={80} alt="" aria-hidden="true" />
      <p className="credit" data-testid="credit">Réalisé par FOUL Hicham</p>
    </div>
  )
}

function StatusBar() {
  const { online, caps, aiReady, settings, ollama } = useApp()
  const aiLabel = settings.provider === 'none' ? 'IA : non configurée' : aiReady ? (settings.provider === 'gemini' ? 'IA Gemini prête (texte envoyé à Google)' : 'IA locale disponible') : settings.provider === 'gemini' ? 'IA indisponible (clé, consentement ou connexion)' : 'IA locale indisponible'
  const D = ({ kind, children }: { kind: 'ok' | 'wa' | 'no'; children: ReactNode }) => <span className={`dot ${kind}`}>{children}</span>
  return (
    <div className="status" aria-live="polite" data-testid="status">
      <D kind={online ? 'ok' : 'wa'}>{online ? 'En ligne' : 'Hors ligne'}</D>
      <D kind={caps.microphone ? 'ok' : 'no'}>{caps.microphone ? 'Micro disponible' : 'Micro indisponible'}</D>
      <D kind={caps.recognition ? 'ok' : 'no'}>{caps.recognition ? 'Dictée disponible (Internet)' : 'Dictée indisponible'}</D>
      <D kind={caps.synthesis ? 'ok' : 'no'}>{caps.synthesis ? 'Lecture audio disponible' : 'Lecture audio indisponible'}</D>
      <D kind={aiReady ? 'ok' : 'wa'}>{aiLabel}</D>
      {settings.provider === 'ollama' && ollama?.state === 'down' && <D kind="no">Ollama arrêté</D>}
    </div>
  )
}

function NavList({ route, go, idPrefix = 'nav' }: { route: RouteId; go: (r: RouteId) => void; idPrefix?: string }) {
  return (
    <>
      {GROUPS.map((g) => (
        <div key={g.label} className="nav-group">
          <p className="nav-label">{g.label}</p>
          {g.ids.map((id) => {
            const Icon = ICONS[id]
            return (
              <button key={id} type="button" data-testid={`${idPrefix}-${id}`} className="nav-item" onClick={() => go(id)} aria-current={route === id ? 'page' : undefined}>
                <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                <span>{LABEL[id]}</span>
              </button>
            )
          })}
        </div>
      ))}
    </>
  )
}

function Shell() {
  const [route, go] = useRoute()
  const { settings, set, ready } = useApp()
  const [menu, setMenu] = useState(false)
  const Page = PAGES[route]
  const dark = settings.theme === 'dark'

  const mainRef = useRef<HTMLElement>(null)
  const first = useRef(true)
  const [update, setUpdate] = useState(false)
  useEffect(() => onUpdateAvailable(setUpdate), [])
  useEffect(() => { if (ready) preloadAll() }, [ready])
  useEffect(() => {
    setMenu(false); window.scrollTo(0, 0)
    // Après un changement d'écran, le focus revient au contenu (lecteurs d'écran et clavier) ; pas au tout premier affichage.
    if (first.current) { first.current = false; return }
    mainRef.current?.focus({ preventScroll: true })
  }, [route])
  useEffect(() => {
    if (!menu) return
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [menu])

  if (!ready) return <p className="p-6 muted">Chargement…</p>
  const ThemeBtn = (
    <button type="button" className="icon-btn" onClick={() => set('theme', dark ? 'light' : 'dark')} aria-label="Changer le thème clair ou sombre" title={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}>
      {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  )
  return (
    <div className="app-shell">
      <a href="#contenu" className="skip-link" onClick={(e) => { e.preventDefault(); mainRef.current?.focus() }}>Aller au contenu</a>
      <nav aria-label="Navigation principale" className="side">
        <div className="brand">
          <Mark />
          <div><p className="brand-name m-0">English-<span style={{ whiteSpace: 'nowrap' }}>Environnement-Coach</span></p><div className="brand-sub">Anglais pour l’environnement et le HSE</div></div>
        </div>
        <NavList route={route} go={go} />
        <Signature />
      </nav>

      <div className="main">
        <header className="topbar">
          <Mark />
          <span className="topbar-title">{LABEL[route]}</span>
          {ThemeBtn}
          <button type="button" className="icon-btn" onClick={() => setMenu(true)} aria-label="Ouvrir le menu" aria-expanded={menu}><Menu size={20} strokeWidth={1.75} /></button>
        </header>

        {menu && (
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Menu de navigation">
            <div className="flex items-center justify-between pb-3">
              <div className="brand p-0"><Mark /><span className="brand-name">English-Environnement-Coach</span></div>
              <button type="button" className="icon-btn" onClick={() => setMenu(false)} aria-label="Fermer le menu"><X size={20} strokeWidth={1.75} /></button>
            </div>
            <NavList route={route} go={(r) => { setMenu(false); go(r) }} idPrefix="menu" />
            <Signature />
          </div>
        )}

        {!settings.installHintDismissed && isIosBrowserTab() && (
          <div className="update-bar" role="note">
            <span>Pour l’avoir hors ligne : touche <b>Partager</b>, puis <b>Sur l’écran d’accueil</b>.</span>
            <button type="button" className="btn btn-sm" onClick={() => set('installHintDismissed', true)}>Compris</button>
          </div>
        )}

        {update && (
          <div className="update-bar" role="status">
            <span>Une nouvelle version est prête.</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={applyUpdate}>Mettre à jour</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUpdate(false)}>Plus tard</button>
          </div>
        )}
        <main id="contenu" className="canvas" ref={mainRef} tabIndex={-1}>
          <div className="status-row">
            <StatusBar />
            <span className="desk-only">{ThemeBtn}</span>
          </div>
          <section key={route} className="fade"><Suspense fallback={<p className="muted" role="status">Chargement…</p>}><Page go={go} /></Suspense></section>
        </main>
        <TabBar route={route} go={go} />
      </div>
    </div>
  )
}

export default function App() {
  return (<AppProvider><Shell /></AppProvider>)
}
