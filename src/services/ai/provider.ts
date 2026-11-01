export type AIErrorCode = 'NOKEY' | 'NOCONSENT' | 'OFFLINE' | 'TIMEOUT' | 'NETWORK' | 'EMPTY' | 'BADJSON' | 'NOMODEL' | 'HTTP'

export class AIError extends Error {
  code: AIErrorCode
  status?: number
  detail?: string
  constructor(code: AIErrorCode, status?: number, detail?: string) {
    super(code)
    this.code = code
    this.status = status
    this.detail = detail
  }
}

export interface AIMessage { role: 'user' | 'assistant'; content: string }
export interface AIRequest { system: string; messages: AIMessage[]; json?: boolean; maxTokens?: number }

/** Interface indépendante du fournisseur : Gemini (externe) ou Ollama (local). */
export interface AIProvider {
  id: 'gemini' | 'ollama'
  label: string
  /** true = le texte quitte l'ordinateur. */
  external: boolean
  complete(req: AIRequest): Promise<string>
}

export function aiErrorMessage(e: unknown): string {
  if (!(e instanceof AIError)) return 'Erreur inconnue.'
  const d = e.detail ? ` — ${e.detail.slice(0, 160)}` : ''
  switch (e.code) {
    case 'NOKEY': return 'Aucune clé enregistrée (Paramètres).'
    case 'NOCONSENT': return 'Consentement d\'envoi à Google non coché (Paramètres).'
    case 'OFFLINE': return 'Hors ligne : ce moteur nécessite Internet.'
    case 'TIMEOUT': return 'Délai dépassé. Réessaie (une machine modeste peut être lente avec Ollama).'
    case 'NETWORK': return 'Connexion impossible (Internet, pare-feu, ou serveur local arrêté).'
    case 'EMPTY': return 'Réponse vide ou bloquée par les filtres du modèle.'
    case 'BADJSON': return 'Réponse illisible (format inattendu). Réessaie.'
    case 'NOMODEL': return 'Aucun modèle sélectionné ou installé. Voir Paramètres.'
    case 'HTTP': {
      const s = e.status ?? 0
      if (s === 400) return `Requête refusée (400) : vérifie la clé et le nom du modèle${d}`
      if (s === 401 || s === 403) return `Clé refusée (${s}) : clé invalide, restreinte ou API non activée${d}`
      if (s === 404) return `Modèle introuvable (404) : choisis-en un dans Paramètres${d}`
      if (s === 429) return `Quota dépassé (429) : attends un peu ou vérifie ton quota${d}`
      return `Erreur du service (${s})${d}`
    }
  }
}

/** Extrait et valide un objet JSON de la réponse (tolère les blocs ```json). */
export function parseJSONObject<T>(text: string): T {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  try {
    const o = JSON.parse(t)
    if (o === null || typeof o !== 'object' || Array.isArray(o)) throw new Error()
    return o as T
  } catch {
    throw new AIError('BADJSON')
  }
}
