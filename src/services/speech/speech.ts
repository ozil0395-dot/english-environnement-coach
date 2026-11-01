export interface SpeechCaps { recognition: boolean; synthesis: boolean; microphone: boolean }

type SRCtor = new () => SpeechRecognitionLike
export interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void
}

function getSR(): SRCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function detectSpeech(): SpeechCaps {
  return {
    recognition: !!getSR(),
    synthesis: 'speechSynthesis' in window,
    microphone: !!navigator.mediaDevices?.getUserMedia,
  }
}

export const SPEECH_ERRORS: Record<string, string> = {
  'not-allowed': 'Permission du micro refusée : autorise-la dans Chrome (icône à gauche de l\'adresse).',
  'service-not-allowed': 'Dictée refusée par le navigateur.',
  'no-speech': 'Aucune voix détectée. Réessaie.',
  network: 'Dictée Chrome : connexion Internet requise (service Google).',
  'audio-capture': 'Aucun micro détecté.',
}

export interface Dictation { stop(): void }

/** Démarre la dictée. L'audio est traité par un service externe de Chrome : à signaler à l'utilisateur. */
export function startDictation(handlers: { onText(t: string): void; onError(msg: string): void; onEnd(): void }): Dictation | null {
  const SR = getSR()
  if (!SR) { handlers.onError('Dictée indisponible ici : utilise la saisie écrite (Chrome sur ordinateur recommandé).'); return null }
  const rec = new SR()
  rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true
  rec.onresult = (e) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; handlers.onText(t) }
  rec.onerror = (e) => handlers.onError(SPEECH_ERRORS[e.error] ?? `Erreur micro : ${e.error}`)
  rec.onend = handlers.onEnd
  try { rec.start() } catch { handlers.onError('Impossible de démarrer le micro.'); return null }
  return { stop: () => rec.stop() }
}

/** Lecture audio. Renvoie un message si aucune voix anglaise n'est installée. */
export function speak(text: string, rate = 0.9): { ok: boolean; message?: string } {
  if (!('speechSynthesis' in window)) return { ok: false, message: 'Lecture audio indisponible dans ce navigateur.' }
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'; u.rate = rate
  const v = speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith('en'))
  if (v) u.voice = v
  speechSynthesis.cancel(); speechSynthesis.speak(u)
  return v ? { ok: true } : { ok: true, message: 'Aucune voix anglaise détectée : la voix par défaut est utilisée.' }
}
