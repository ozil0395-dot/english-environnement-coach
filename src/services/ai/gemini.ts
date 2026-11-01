import { AIError, type AIProvider, type AIRequest } from './provider'

export const GEMINI_KEY = 'ehc_gemini_key'
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export const getGeminiKey = (): string => { try { return localStorage.getItem(GEMINI_KEY) ?? '' } catch { return '' } }
export const setGeminiKey = (k: string): void => { try { k ? localStorage.setItem(GEMINI_KEY, k) : localStorage.removeItem(GEMINI_KEY) } catch { /* stockage indisponible */ } }

export interface GeminiConfig { model: string; consent: boolean; timeoutMs?: number }

export function geminiProvider(cfg: GeminiConfig): AIProvider {
  return {
    id: 'gemini',
    label: 'Gemini (Google)',
    external: true,
    async complete(req: AIRequest): Promise<string> {
      const key = getGeminiKey()
      if (!key) throw new AIError('NOKEY')
      if (!cfg.consent) throw new AIError('NOCONSENT')
      if (typeof navigator !== 'undefined' && !navigator.onLine) throw new AIError('OFFLINE')
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), cfg.timeoutMs ?? 30_000)
      let res: Response
      try {
        res = await fetch(`${BASE}/models/${encodeURIComponent(cfg.model || DEFAULT_GEMINI_MODEL)}:generateContent`, {
          method: 'POST',
          signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.system }] },
            contents: req.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            generationConfig: { temperature: 0.4, maxOutputTokens: req.maxTokens ?? 2048, ...(req.json ? { responseMimeType: 'application/json' } : {}) },
          }),
        })
      } catch (e) {
        throw new AIError((e as Error).name === 'AbortError' ? 'TIMEOUT' : 'NETWORK')
      } finally {
        clearTimeout(timer)
      }
      if (!res.ok) {
        let detail = ''
        try { detail = (await res.json()).error?.message ?? '' } catch { /* corps non JSON */ }
        throw new AIError('HTTP', res.status, detail)
      }
      const j = await res.json()
      const parts: { text?: string }[] = j?.candidates?.[0]?.content?.parts ?? []
      const text = parts.map((p) => p.text ?? '').join('')
      if (!text.trim()) throw new AIError('EMPTY')
      return text
    },
  }
}

/** Liste les modèles Gemini compatibles generateContent pour la clé enregistrée. */
export async function listGeminiModels(): Promise<string[]> {
  const key = getGeminiKey()
  if (!key) throw new AIError('NOKEY')
  let res: Response
  try { res = await fetch(`${BASE}/models?pageSize=100`, { headers: { 'x-goog-api-key': key } }) } catch { throw new AIError('NETWORK') }
  if (!res.ok) throw new AIError('HTTP', res.status)
  const j = await res.json()
  return (j.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m: { name: string }) => m.name.replace(/^models\//, ''))
    .filter((n: string) => n.startsWith('gemini'))
}
