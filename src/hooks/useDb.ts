import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/** Lit des données Dexie et se met à jour automatiquement quand elles changent. */
export function useDb<T>(query: () => Promise<T>, initial: T, deps: unknown[] = []): T {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    const sub = liveQuery(query).subscribe({ next: setValue, error: () => { /* base indisponible : on garde la valeur initiale */ } })
    return () => sub.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}
