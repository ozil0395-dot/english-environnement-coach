import { useEffect, useState } from 'react'

export const ROUTES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'test', label: 'Test de niveau' },
  { id: 'path', label: 'Parcours' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'voice', label: 'Entraînement vocal' },
  { id: 'scenarios', label: 'Simulations' },
  { id: 'vocabulary', label: 'Vocabulaire' },
  { id: 'grammar', label: 'Grammaire' },
  { id: 'writing', label: 'Rédaction' },
  { id: 'interview', label: 'Entretiens' },
  { id: 'progress', label: 'Progression' },
  { id: 'settings', label: 'Paramètres / IA' },
] as const

export type RouteId = (typeof ROUTES)[number]['id']

const parse = (): RouteId => {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES.find((r) => r.id === h)?.id ?? 'dashboard') as RouteId
}

export function useRoute(): [RouteId, (r: RouteId) => void] {
  const [r, setR] = useState<RouteId>(parse())
  useEffect(() => {
    const f = () => setR(parse())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return [r, (id) => { window.location.hash = `/${id}` }]
}
