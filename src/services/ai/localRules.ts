/** Correction sans IA : quelques règles pédagogiques locales (très limitées, volontairement). */
export interface LocalRule { re: RegExp; fix: string; why: string; type: 'grammaire' | 'vocabulaire' | 'formulation' }

export const LOCAL_RULES: LocalRule[] = [
  { re: /\bI am agree\b/gi, fix: 'I agree', why: '« agree » est un verbe : pas de « am ».', type: 'grammaire' },
  { re: /\bdiscuss about\b/gi, fix: 'discuss', why: '« discuss » n\'est pas suivi de « about ».', type: 'grammaire' },
  { re: /\bpeoples\b/gi, fix: 'people', why: '« people » est déjà un pluriel.', type: 'grammaire' },
  { re: /\bthe informations\b/gi, fix: 'the information', why: '« information » est indénombrable.', type: 'grammaire' },
  { re: /\bI work in ENAC\b/gi, fix: 'I work at ENAC', why: 'On travaille « at » une entreprise.', type: 'grammaire' },
  { re: /\bsince (\d+) years\b/gi, fix: 'for $1 years', why: '« for » + durée ; « since » + date.', type: 'grammaire' },
  { re: /\bI have (\d+) years old\b/gi, fix: 'I am $1 years old', why: 'Pour l\'âge : « I am … years old ».', type: 'grammaire' },
  { re: /\bI am (\d+) years of experience\b/gi, fix: 'I have $1 years of experience', why: 'Pour l\'expérience : « I have … years of experience ».', type: 'grammaire' },
  { re: /\bmake a pollution\b/gi, fix: 'cause pollution', why: 'On dit « cause pollution » ; « pollution » est ici indénombrable.', type: 'vocabulaire' },
  { re: /\bthe wastes\b/gi, fix: 'the waste', why: '« waste » est le plus souvent indénombrable.', type: 'grammaire' },
  { re: /\bI am responsible of\b/gi, fix: 'I am responsible for', why: 'On dit « responsible for ».', type: 'grammaire' },
  { re: /\bI have worked since (\d+) months\b/gi, fix: 'I have worked for $1 months', why: '« for » + durée.', type: 'grammaire' },
]

export interface LocalResult { corrected: string; notes: { why: string; type: string }[] }

export function localCheck(text: string): LocalResult {
  let out = text
  const notes: LocalResult['notes'] = []
  for (const r of LOCAL_RULES) {
    const re = new RegExp(r.re.source, r.re.flags)
    if (re.test(out)) {
      out = out.replace(new RegExp(r.re.source, r.re.flags), r.fix)
      notes.push({ why: r.why, type: r.type })
    }
  }
  return { corrected: out, notes }
}
