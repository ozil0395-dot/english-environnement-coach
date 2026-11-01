/** Mise à jour de l'application : le nouveau service worker attend, l'utilisateur choisit quand l'appliquer. */
type Listener = (available: boolean) => void
let waiting: ServiceWorker | null = null
let requested = false
const listeners = new Set<Listener>()
const notify = () => listeners.forEach((l) => l(waiting !== null))

export function onUpdateAvailable(l: Listener): () => void {
  listeners.add(l); l(waiting !== null)
  return () => { listeners.delete(l) }
}

export function applyUpdate() {
  if (!waiting) return
  requested = true
  waiting.postMessage({ type: 'SKIP_WAITING' })
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      const track = (sw: ServiceWorker | null) => {
        if (!sw) return
        sw.addEventListener('statechange', () => { if (sw.state === 'installed' && navigator.serviceWorker.controller) { waiting = sw; notify() } })
      }
      if (reg.waiting && navigator.serviceWorker.controller) { waiting = reg.waiting; notify() }
      reg.addEventListener('updatefound', () => track(reg.installing))
    }).catch(() => { /* hors ligne non disponible */ })
    // Rechargement uniquement si l'utilisateur a demandé la mise à jour (jamais à la première installation).
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!requested || reloaded) return; reloaded = true; window.location.reload() })
  })
}
