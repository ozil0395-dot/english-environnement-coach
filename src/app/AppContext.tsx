import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, loadSettings, saveSetting, type Settings } from '../services/storage/repo'
import { geminiProvider, getGeminiKey } from '../services/ai/gemini'
import { checkOllama, ollamaProvider, type OllamaStatus } from '../services/ai/ollama'
import type { AIProvider } from '../services/ai/provider'
import { detectSpeech, type SpeechCaps } from '../services/speech/speech'

interface Ctx {
  settings: Settings
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => Promise<void>
  ai: AIProvider | null
  aiReady: boolean
  online: boolean
  caps: SpeechCaps
  ollama: OllamaStatus | null
  refreshOllama: () => Promise<OllamaStatus>
  keyVersion: number
  bumpKey: () => void
  ready: boolean
}

const AppCtx = createContext<Ctx | null>(null)
export const useApp = (): Ctx => {
  const c = useContext(AppCtx)
  if (!c) throw new Error('AppProvider manquant')
  return c
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [ollama, setOllama] = useState<OllamaStatus | null>(null)
  const [keyVersion, setKeyVersion] = useState(0)
  const caps = useMemo(() => detectSpeech(), [])

  useEffect(() => {
    loadSettings().then((s) => setSettings(s)).catch(() => { /* IndexedDB indisponible : valeurs par défaut */ }).finally(() => setReady(true))
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => { document.documentElement.classList.toggle('dark', settings.theme === 'dark') }, [settings.theme])

  const set = useCallback(async <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }))
    try { await saveSetting(k, v) } catch { /* non bloquant */ }
  }, [])

  const refreshOllama = useCallback(async () => { const r = await checkOllama(); setOllama(r); return r }, [])

  const ai = useMemo<AIProvider | null>(() => {
    if (settings.provider === 'gemini') return geminiProvider({ model: settings.geminiModel, consent: settings.geminiConsent })
    if (settings.provider === 'ollama') return ollamaProvider({ model: settings.ollamaModel })
    return null
    // keyVersion force le recalcul quand la clé change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.provider, settings.geminiModel, settings.geminiConsent, settings.ollamaModel, keyVersion])

  const aiReady = settings.provider === 'gemini'
    ? !!getGeminiKey() && settings.geminiConsent && online
    : settings.provider === 'ollama' ? !!settings.ollamaModel : false

  const value: Ctx = { settings, set, ai, aiReady, online, caps, ollama, refreshOllama, keyVersion, bumpKey: () => setKeyVersion((v) => v + 1), ready }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
