import { AIError, type AIProvider, type AIRequest } from './provider'

export const OLLAMA_URL = 'http://localhost:11434'

export type OllamaStatus = { state: 'ok'; models: string[] } | { state: 'down' }

/** Vérifie si le serveur local répond et liste les modèles installés. */
export async function checkOllama(timeoutMs = 2500): Promise<OllamaStatus> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctl.signal })
    if (!r.ok) return { state: 'down' }
    const j = await r.json()
    return { state: 'ok', models: (j.models ?? []).map((m: { name: string }) => m.name) }
  } catch {
    return { state: 'down' }
  } finally {
    clearTimeout(t)
  }
}

export function ollamaProvider(cfg: { model: string; timeoutMs?: number }): AIProvider {
  return {
    id: 'ollama',
    label: 'Ollama (local)',
    external: false,
    async complete(req: AIRequest): Promise<string> {
      if (!cfg.model) throw new AIError('NOMODEL')
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 120_000)
      let res: Response
      try {
        res = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: 'POST',
          signal: ctl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: cfg.model,
            stream: false,
            ...(req.json ? { format: 'json' } : {}),
            // Limites pour machines modestes : sortie et contexte bornés.
            options: { temperature: 0.4, num_predict: Math.min(req.maxTokens ?? 700, 700), num_ctx: 4096 },
            messages: [{ role: 'system', content: req.system }, ...req.messages],
          }),
        })
      } catch (e) {
        throw new AIError((e as Error).name === 'AbortError' ? 'TIMEOUT' : 'NETWORK')
      } finally {
        clearTimeout(timer)
      }
      if (!res.ok) {
        let detail = ''
        try { detail = (await res.json()).error ?? '' } catch { /* corps non JSON */ }
        throw new AIError(res.status === 404 ? 'NOMODEL' : 'HTTP', res.status, detail)
      }
      const j = await res.json()
      const text: string = j?.message?.content ?? ''
      if (!text.trim()) throw new AIError('EMPTY')
      return text
    },
  }
}
