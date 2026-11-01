import { useRef } from 'react'

/**
 * Mesure le temps de pratique active d'une activité (de son début à sa fin), plafonné à 15 min
 * pour ne pas compter une page laissée ouverte. Minimum 1 minute si l'utilisateur a réellement répondu.
 */
export function usePracticeTimer() {
  const start = useRef(Date.now())
  return {
    reset: () => { start.current = Date.now() },
    minutes: () => Math.min(15, Math.max(1, Math.round((Date.now() - start.current) / 60000))),
  }
}
