import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { geminiProvider, setGeminiKey, listGeminiModels } from '../../src/services/ai/gemini'
import { checkOllama, ollamaProvider } from '../../src/services/ai/ollama'
import { AIError, aiErrorMessage, parseJSONObject } from '../../src/services/ai/provider'
import { coachTurn, normalizeCoach, roleTurn, evaluateScenario } from '../../src/services/ai/coach'
import { detectSpeech, startDictation } from '../../src/services/speech/speech'

const okJSON = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { 'content-type': 'application/json' } })
const gem = (text: string) => okJSON({ candidates: [{ content: { parts: [{ text }] } }] })
const req = { system: 's', messages: [{ role: 'user' as const, content: 'hi' }], json: true }

beforeEach(() => { setGeminiKey('') })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Gemini', () => {
  it('refuse sans clé ni consentement et sans aucun appel réseau', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    await expect(geminiProvider({ model: 'm', consent: true }).complete(req)).rejects.toMatchObject({ code: 'NOKEY' })
    setGeminiKey('K'); await expect(geminiProvider({ model: 'm', consent: false }).complete(req)).rejects.toMatchObject({ code: 'NOCONSENT' })
    expect(f).not.toHaveBeenCalled()
  })
  it('envoie la clé en en-tête (pas dans l\'URL) et lit la réponse', async () => {
    setGeminiKey('K'); const f = vi.fn(async () => gem('{"a":1}')); vi.stubGlobal('fetch', f)
    expect(await geminiProvider({ model: 'gemini-x', consent: true }).complete(req)).toBe('{"a":1}')
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/models/gemini-x:generateContent'); expect(url).not.toContain('K')
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('K')
    expect(JSON.parse(init.body as string).generationConfig.responseMimeType).toBe('application/json')
  })
  it('traduit les erreurs HTTP en messages clairs', async () => {
    setGeminiKey('K')
    for (const [s, txt] of [[429, 'Quota'], [403, 'Clé refusée'], [404, 'Modèle introuvable'], [400, 'Requête refusée']] as const) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'm' } }), { status: s })))
      const e = await geminiProvider({ model: 'm', consent: true }).complete(req).catch((x) => x)
      expect(e).toBeInstanceOf(AIError); expect(aiErrorMessage(e)).toContain(txt)
    }
  })
  it('gère réseau indisponible, réponse vide et délai dépassé', async () => {
    setGeminiKey('K')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('x') }))
    await expect(geminiProvider({ model: 'm', consent: true }).complete(req)).rejects.toMatchObject({ code: 'NETWORK' })
    vi.stubGlobal('fetch', vi.fn(async () => okJSON({ candidates: [] })))
    await expect(geminiProvider({ model: 'm', consent: true }).complete(req)).rejects.toMatchObject({ code: 'EMPTY' })
    vi.stubGlobal('fetch', vi.fn((_u: string, init: RequestInit) => new Promise((_r, rej) => { init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('a'), { name: 'AbortError' }))) })))
    await expect(geminiProvider({ model: 'm', consent: true, timeoutMs: 20 }).complete(req)).rejects.toMatchObject({ code: 'TIMEOUT' })
  })
  it('liste uniquement les modèles gemini compatibles', async () => {
    setGeminiKey('K')
    vi.stubGlobal('fetch', vi.fn(async () => okJSON({ models: [{ name: 'models/gemini-a', supportedGenerationMethods: ['generateContent'] }, { name: 'models/embed', supportedGenerationMethods: ['embedContent'] }, { name: 'models/other', supportedGenerationMethods: ['generateContent'] }] })))
    expect(await listGeminiModels()).toEqual(['gemini-a'])
  })
})

describe('Ollama (indisponibilité du modèle IA)', () => {
  it('détecte un serveur arrêté', async () => { vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('refused') })); expect(await checkOllama()).toEqual({ state: 'down' }) })
  it('liste les modèles installés', async () => { vi.stubGlobal('fetch', vi.fn(async () => okJSON({ models: [{ name: 'llama3.2:3b' }] }))); expect(await checkOllama()).toEqual({ state: 'ok', models: ['llama3.2:3b'] }) })
  it('refuse sans modèle sélectionné', async () => { await expect(ollamaProvider({ model: '' }).complete(req)).rejects.toMatchObject({ code: 'NOMODEL' }) })
  it('erreur réseau claire quand le serveur ne répond pas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('x') }))
    const e = await ollamaProvider({ model: 'm' }).complete(req).catch((x) => x); expect(aiErrorMessage(e)).toContain('Connexion impossible')
  })
  it('borne la longueur de sortie et lit la réponse', async () => {
    const f = vi.fn(async () => okJSON({ message: { content: 'ok' } })); vi.stubGlobal('fetch', f)
    expect(await ollamaProvider({ model: 'm' }).complete({ ...req, maxTokens: 5000 })).toBe('ok')
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body.options.num_predict).toBeLessThanOrEqual(700); expect(body.stream).toBe(false)
  })
})

describe('coach', () => {
  it('parse du JSON entouré de ```', () => { expect(parseJSONObject('```json\n{"a":1}\n```')).toEqual({ a: 1 }) })
  it('rejette un JSON invalide', () => { expect(() => parseJSONObject('pas du json')).toThrow(AIError); expect(() => parseJSONObject('[1]')).toThrow(AIError) })
  it('tolère les champs manquants ou mal typés', () => {
    const r = normalizeCoach({ corrected: 5, errors: [{ original: 'a' }, null, { type: 't', original: '', fix: 'x' }], vocab: [{ en: 'a' }, { en: 'b', fr: 'c' }] })
    expect(r.corrected).toBe(''); expect(r.errors).toEqual([{ type: 'formulation', original: 'a', fix: '' }]); expect(r.vocab).toEqual([{ en: 'b', fr: 'c' }])
  })
  it('coachTurn renvoie un résultat normalisé', async () => {
    const seen: string[] = []
    const p = { id: 'ollama' as const, label: 'x', external: false, complete: async (r: { system: string }) => { seen.push(r.system); return '{"corrected":"I agree","followup":"Next?"}' } }
    const r = await coachTurn(p, { kind: 'chat', profile: '', level: 'B1', userContent: 'I am agree' })
    expect(r.corrected).toBe('I agree'); expect(r.followup).toBe('Next?')
    expect(seen[0]).toContain('exactly ONE short question')
  })
  it('roleTurn et evaluateScenario', async () => {
    const sc = { title: 't', context: 'c', userRole: 'u', partnerRole: 'p' }
    const p1 = { id: 'gemini' as const, label: 'x', external: true, complete: vi.fn(async () => '{"reply":" Hello ","correction":{"corrected":"x","note_fr":"y"}}') }
    expect(await roleTurn(p1, sc, '', '', [{ role: 'user', content: 'hi' }])).toEqual({ reply: 'Hello', correction: { corrected: 'x', note_fr: 'y' } })
    const p2 = { ...p1, complete: vi.fn(async () => '{"summary_fr":"ok","level_estimate":"B1","strengths":["a"],"to_improve":[{"point":"p","example":"e"}],"expressions":[{"en":"a","fr":"b"}]}') }
    expect((await evaluateScenario(p2, 't', 'Learner: hi')).level_estimate).toBe('B1')
  })
})

describe('voix : fonctions indisponibles', () => {
  it('détecte l\'absence de reconnaissance et de synthèse', () => { const c = detectSpeech(); expect(c.recognition).toBe(false); expect(c.synthesis).toBe(false) })
  it('dictée indisponible → message d\'erreur et saisie écrite possible', () => {
    const onError = vi.fn(); expect(startDictation({ onText: vi.fn(), onError, onEnd: vi.fn() })).toBeNull(); expect(onError.mock.calls[0][0]).toContain('saisie écrite')
  })
  it('erreurs micro traduites (permission refusée, pas de micro)', () => {
    class SR { lang = ''; interimResults = false; continuous = false; onresult = null; onerror: ((e: { error: string }) => void) | null = null; onend = null; start() { setTimeout(() => this.onerror?.({ error: 'not-allowed' }), 0) } stop() {} }
    vi.stubGlobal('webkitSpeechRecognition', SR)
    return new Promise<void>((done) => { startDictation({ onText: vi.fn(), onEnd: vi.fn(), onError: (m) => { expect(m).toContain('Permission du micro refusée'); done() } }) })
  })
})
