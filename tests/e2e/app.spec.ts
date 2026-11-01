import { expect, test, type Page, type Route } from '@playwright/test'
import fs from 'node:fs'

const ROUTES = ['dashboard', 'test', 'path', 'conversation', 'voice', 'scenarios', 'vocabulary', 'grammar', 'writing', 'interview', 'progress', 'settings']

function watchErrors(page: Page) {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  return errs
}

/** Répond à tous les exercices affichés (au besoin faux) jusqu'à l'apparition d'un des écrans de fin donnés. */
async function runExercises(page: Page, endIds: string[] = ['elaboration', 'reflection', 'lesson-end', 'grammar-end', 'session-end', 'pretest-done']) {
  const counter = page.getByText(/Exercice \d+ \/ \d+/)
  let ended = page.getByTestId(endIds[0])
  for (const id of endIds.slice(1)) ended = ended.or(page.getByTestId(id))
  for (let k = 0; k < 30; k++) {
    await expect(counter.or(ended).first()).toBeVisible()
    if (await ended.first().isVisible()) return
    const before = await counter.textContent()
    const opt = page.locator('.card .btn.text-left').first()
    if (await opt.isVisible()) await opt.click()
    else await page.getByLabel('Ta réponse', { exact: true }).fill('x')
    await page.getByTestId('submit-sure').click()
    await page.getByTestId('next').click()
    await expect(async () => {
      if (await ended.first().isVisible()) return
      // Le compteur peut disparaître pile pendant la lecture (passage à l'écran suivant) : on le lit sans attendre.
      const now = await counter.textContent({ timeout: 500 }).catch(() => null)
      if (now === null) { expect(await ended.first().isVisible()).toBe(true); return }
      expect(now).not.toBe(before)
    }).toPass({ timeout: 8000 })
  }
}

/** Parcourt une leçon : (pré-test passé) → cours → prédiction → exercices → phrase → réflexion → écran final. */
async function completeLesson(page: Page, id = 'm1-l1', opts: { reflection?: string; sentence?: string } = {}) {
  await page.getByTestId('nav-path').click()
  await page.getByTestId(`lesson-${id}`).click()
  await page.getByTestId('pretest-skip').click()
  await page.getByTestId('learn-next').click()
  await page.getByTestId('predict-go').click()
  await runExercises(page)
  if (opts.sentence) { await page.getByLabel('Ta réponse en anglais').fill(opts.sentence); await page.getByTestId('elab-submit').click(); await expect(page.getByTestId('elaboration')).toContainText(/Tu as utilisé|Essaie d'inclure/); await page.getByTestId('elab-continue').click() }
  else await page.getByTestId('elab-skip').click()
  if (opts.reflection) { await page.getByLabel('Qu\'est-ce qui a bien fonctionné ?').fill(opts.reflection); await page.getByTestId('reflect-save').click() }
  else await page.getByTestId('reflect-skip').click()
  await expect(page.getByTestId('lesson-end')).toBeVisible()
}

const gemini = (text: string) => ({ candidates: [{ content: { parts: [{ text }] } }] })
const COACH = { corrected: 'I agree with you.', natural: 'I fully agree.', explanation_fr: '« agree » est un verbe.', errors: [{ type: 'grammaire', original: 'I am agree', fix: 'I agree' }], vocab: [{ en: 'to agree', fr: 'être d\'accord' }], drill: 'I agree.', followup: 'What waste do you manage?' }

async function mockGemini(page: Page, handler?: (route: Route, body: { systemInstruction?: { parts: { text: string }[] } }) => Promise<boolean | void>) {
  const calls: { key: string | undefined }[] = []
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    const req = route.request()
    calls.push({ key: req.headers()['x-goog-api-key'] })
    let body: { systemInstruction?: { parts: { text: string }[] } } = {}
    try { body = JSON.parse(req.postData() || '{}') } catch { /* GET */ }
    if (handler && (await handler(route, body))) return
    const sys = body.systemInstruction?.parts[0].text ?? ''
    const json = (o: unknown) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(gemini(typeof o === 'string' ? o : JSON.stringify(o))) })
    if (sys.includes('single word OK')) return json('OK')
    if (sys.includes('role-playing')) return json({ reply: 'Sure, I can show you the area.', correction: { corrected: 'I am here to inspect.', note_fr: 'Ajoute le verbe.' } })
    if (sys.includes('evaluate a role-play')) return json({ summary_fr: 'Bon échange.', level_estimate: 'B1', strengths: ['clarté'], to_improve: [{ point: 'articles', example: 'the waste' }], expressions: [{ en: 'spill kit', fr: 'kit anti-déversement' }] })
    return json(COACH)
  })
  return calls
}

async function configureGemini(page: Page) {
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('prov-gemini').check()
  await page.getByTestId('gem-key').fill('TESTKEY123')
  await page.getByTestId('gem-save').click()
  await page.getByTestId('gem-consent').check()
}

test.beforeEach(async ({ page }) => { await page.goto('/') })

test('navigation : les 12 pages s\'affichent sans erreur de console', async ({ page }) => {
  const errs = watchErrors(page)
  for (const r of ROUTES) {
    await page.getByTestId(`nav-${r}`).click()
    await expect(page.locator('main h1').first()).toBeVisible()
  }
  expect(errs).toEqual([])
})

test('crédit affiché : réalisé par FOUL Hicham', async ({ page }) => {
  await expect(page.getByTestId('credit')).toHaveText('Réalisé par FOUL Hicham')
  const sig = page.getByRole('img', { name: /Signature de Hicham/ })
  await expect(sig).toBeVisible()
  await expect.poll(() => sig.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0)
})

test('fonctionne sans IA : conversation avec correction locale et mode sans IA signalé', async ({ page }) => {
  await page.getByTestId('nav-conversation').click()
  await expect(page.getByTestId('status')).toContainText('IA : non configurée')
  await page.getByLabel('Ta réponse en anglais').fill('I am agree with you')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByTestId('conv-log')).toContainText('I agree with you')
  await expect(page.getByTestId('conv-log')).toContainText('question préconstruite')
})

test('leçon complète : prédiction, score, révision planifiée, persistance après rechargement et statistiques', async ({ page }) => {
  await completeLesson(page)
  await expect(page.getByTestId('lesson-end')).toContainText('Score :')
  await expect(page.getByTestId('lesson-end')).toContainText('Prochaine révision')
  await expect(page.getByTestId('lesson-end')).toContainText(/prédit|Prédiction exacte/)
  await page.reload()
  await page.getByTestId('nav-dashboard').click()
  await expect(page.locator('main').getByText('Leçons terminées').locator('..')).toContainText('1')
  await expect(page.locator('main').getByText('Séances').locator('..')).toContainText('1')
  await expect(page.getByTestId('due-card')).toContainText("rien d'échu")
  await page.getByTestId('nav-path').click()
  await expect(page.getByTestId('lesson-m1-l1')).toContainText('Refaire')
  await page.getByTestId('nav-progress').click()
  await expect(page.getByTestId('review-schedule')).toContainText('Leçon m1-l1')
})

test('pré-test avant la leçon : questions avant le cours, gain affiché à la fin, exclu du taux de réussite', async ({ page }) => {
  await page.getByTestId('nav-path').click(); await page.getByTestId('lesson-m1-l1').click()
  await expect(page.getByTestId('pretest-intro')).toContainText('Pré-test')
  await expect(page.locator('main').getByText('Vocabulaire', { exact: true })).toHaveCount(0)
  await runExercises(page, ['learn-next'])
  await expect(page.getByText(/Pré-test : \d\/3/).first()).toBeVisible()
  await page.getByTestId('learn-next').click(); await page.getByTestId('predict-go').click()
  await runExercises(page); await page.getByTestId('elab-skip').click(); await page.getByTestId('reflect-skip').click()
  await expect(page.getByTestId('lesson-end')).toContainText(/Pré-test : \d\/3 → après la leçon/)
  const pre = await page.evaluate(() => new Promise<number>((res) => { const r = indexedDB.open('english-hse-coach'); r.onsuccess = () => { const q = r.result.transaction('attempts').objectStore('attempts').getAll(); q.onsuccess = () => res((q.result as { ref: string }[]).filter((a) => a.ref.startsWith('pre:')).length) } }))
  expect(pre).toBe(3)
})

test('confiance déclarée : feedback sur une erreur avec forte confiance, et mode « sans les choix »', async ({ page }) => {
  await page.getByTestId('nav-path').click(); await page.getByTestId('lesson-m1-l1').click()
  await page.getByTestId('pretest-skip').click(); await page.getByTestId('learn-next').click(); await page.getByTestId('predict-go').click()
  await expect(page.getByLabel('Ta réponse', { exact: true })).toBeVisible() // QCM à blanc posé en production
  await page.getByLabel('Ta réponse', { exact: true }).fill('is')
  await page.getByTestId('submit-sure').click()
  await expect(page.getByTestId('feedback-msg')).toContainText('forte confiance')
  await page.getByTestId('next').click()
  await page.getByTestId('toggle-production').uncheck()
  await page.getByTestId('toggle-calibrate').uncheck()
  await expect(page.getByTestId('submit-unsure')).toHaveCount(0)
})

test('session mixte entrelacée, puis calibration et réflexion enregistrée', async ({ page }) => {
  await page.getByTestId('start-mixed').click()
  await expect(page.getByTestId('session')).toBeVisible()
  await runExercises(page, ['reflection'])
  await page.getByLabel('Qu\'est-ce qui a échoué ou m\'a surpris ?').fill('les articles')
  await page.getByTestId('reflect-save').click()
  await expect(page.getByTestId('session-end')).toContainText('Score')
  await page.getByRole('button', { name: 'Retour au Dashboard' }).click()
  await expect(page.getByTestId('calib-card')).not.toContainText('Pas encore assez')
  await page.getByTestId('nav-progress').click()
  await expect(page.getByText('les articles')).toBeVisible()
})

test('session de 5 minutes, mot du jour et rappel de sauvegarde', async ({ page }) => {
  await expect(page.getByTestId('word-of-day')).toBeVisible()
  await page.getByTestId('start-quick').click()
  await expect(page.getByTestId('session')).toContainText('Session 5 minutes')
  await runExercises(page, ['reflection']); await page.getByTestId('reflect-skip').click()
  await expect(page.getByTestId('session-end')).toContainText('Score')
  await page.getByRole('button', { name: 'Retour au Dashboard' }).click()
  await expect(page.getByTestId('backup-reminder')).toBeVisible()
  await page.getByTestId('nav-settings').click()
  await expect(page.getByTestId('last-export')).toContainText('jamais')
  await page.getByTestId('export').click()
  await expect(page.getByTestId('last-export')).not.toContainText('jamais')
})

test('file « À réviser aujourd\'hui » : une leçon échue déclenche la session du jour puis est replanifiée', async ({ page }) => {
  await completeLesson(page)
  await page.evaluate(() => new Promise<void>((res) => { const r = indexedDB.open('english-hse-coach'); r.onsuccess = () => { const tx = r.result.transaction('reviews', 'readwrite'); const st = tx.objectStore('reviews'); const g = st.getAll(); g.onsuccess = () => { for (const x of g.result) st.put({ ...x, due: 1 }); tx.oncomplete = () => res() } } }))
  await page.reload(); await page.getByTestId('nav-dashboard').click()
  await expect(page.getByTestId('due-card')).toContainText('1 élément')
  await expect(page.getByTestId('start-due')).toBeEnabled()
  await page.getByTestId('start-due').click()
  await runExercises(page, ['reflection']); await page.getByTestId('reflect-skip').click()
  await expect(page.getByTestId('session-end')).toBeVisible()
  await page.getByRole('button', { name: 'Retour au Dashboard' }).click()
  await expect(page.getByTestId('due-card')).toContainText("rien d'échu")
})

test('élaboration : phrase personnelle avec un mot de la leçon, et réflexion visible dans la progression', async ({ page }) => {
  await completeLesson(page, 'm1-l1', { sentence: 'My colleague works on the pipeline site.', reflection: 'refaire les verbes' })
  await page.getByTestId('nav-progress').click()
  await expect(page.getByText('refaire les verbes')).toBeVisible()
})

test('test de niveau complet : résultat seulement à la fin, avec avertissement', async ({ page }) => {
  await page.getByTestId('nav-test').click()
  await page.getByLabel('Score prédit').selectOption('20')
  await page.getByRole('button', { name: 'Commencer' }).click()
  for (let i = 0; i < 30; i++) {
    await expect(page.getByTestId('test-result')).toHaveCount(0)
    await page.locator('.card .btn.text-left').first().click()
  }
  await page.getByRole('button', { name: 'Voir mon résultat' }).click()
  await expect(page.getByTestId('test-result')).toContainText('Niveau estimé')
  await expect(page.getByTestId('test-result')).toContainText('pas une certification')
  await expect(page.getByTestId('test-result')).toContainText('Tu avais prédit 20/30')
  await page.reload(); await page.getByTestId('nav-dashboard').click()
  await expect(page.locator('main').getByText('Niveau estimé (test)').locator('..')).not.toContainText('—')
})

test('vocabulaire : révision espacée, favoris persistants', async ({ page }) => {
  await page.getByTestId('nav-vocabulary').click()
  await page.getByRole('button', { name: 'Favori', pressed: false }).first().click()
  await expect(page.getByRole('button', { name: 'Favori', pressed: true })).toHaveCount(1)
  await page.reload(); await page.getByTestId('nav-vocabulary').click()
  await expect(page.getByRole('button', { name: 'Favori', pressed: true })).toHaveCount(1)
  await page.getByTestId('vmode-review').click()
  await page.getByTestId('card').click(); await page.getByTestId('grade-good').click()
  await expect(page.getByText('Carte 2 /')).toBeVisible()
})

test('scénario sans IA jouable de bout en bout', async ({ page }) => {
  await page.getByTestId('nav-scenarios').click()
  await expect(page.locator('[data-testid^="scn-"]').filter({ hasText: 'Ouvrir' })).toHaveCount(15)
  await page.getByTestId('scn-K').click()
  for (const [t, expected] of [['You must wear a helmet and gloves', 'Do I need gloves too?'], ['Yes, for waste handling', 'Where can I get them?'], ['Ask the supervisor in the store', 'Bien']] as const) {
    await page.getByLabel('Ta réponse en anglais').fill(t)
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByTestId('scn-log')).toContainText(expected)
  }
  await expect(page.getByTestId('scn-end')).toBeVisible()
})

test('Gemini : sans consentement aucun appel, puis coach IA, évaluation de scénario et erreur 429', async ({ page }) => {
  const calls = await mockGemini(page)
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('prov-gemini').check()
  await page.getByTestId('gem-key').fill('TESTKEY123'); await page.getByTestId('gem-save').click()
  await page.getByTestId('gem-test').click()
  await expect(page.getByTestId('gem-msg')).toContainText('Consentement')
  expect(calls).toHaveLength(0)
  await page.getByTestId('gem-consent').check()
  await page.getByTestId('gem-test').click()
  await expect(page.getByTestId('gem-msg')).toContainText('Connexion réussie')
  expect(calls[0].key).toBe('TESTKEY123')
  await page.getByTestId('nav-conversation').click()
  await expect(page.getByTestId('status')).toContainText('IA Gemini prête')
  await page.getByLabel('Ta réponse en anglais').fill('I am agree with you')
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByTestId('conv-log')).toContainText('I fully agree')
  await expect(page.getByTestId('conv-log')).toContainText('What waste do you manage?')
  await page.getByTestId('nav-grammar').click()
  await expect(page.getByText('I am agree').first()).toBeVisible()
  await page.getByTestId('nav-scenarios').click(); await page.getByTestId('scn-B').click()
  await page.getByLabel('Ta réponse en anglais').fill('I here for inspekt'); await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByTestId('scn-log')).toContainText('Sure, I can show you the area.')
  await page.getByRole('button', { name: 'Terminer et évaluer' }).click()
  await expect(page.getByTestId('scn-eval')).toContainText('pas une certification')
  await page.unroute('https://generativelanguage.googleapis.com/**')
  await page.route('https://generativelanguage.googleapis.com/**', (r) => r.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"error":{"message":"quota"}}' }))
  await page.getByTestId('nav-conversation').click()
  await page.getByLabel('Ta réponse en anglais').fill('I am agree again'); await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByTestId('conv-log')).toContainText('Quota dépassé')
  await expect(page.getByTestId('conv-log')).toContainText('I agree again')
})

test('IA locale indisponible (Ollama arrêté) : message clair et l\'application continue', async ({ page }) => {
  await page.route('http://localhost:11434/**', (r) => r.abort())
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('ollama-check').click()
  await expect(page.getByText('Ollama introuvable')).toBeVisible()
  await page.getByTestId('nav-writing').click()
  await page.getByLabel('Ta réponse en anglais').fill('I am agree')
  await page.getByTestId('write-local').click()
  await expect(page.getByText('I agree', { exact: false }).first()).toBeVisible()
})

test('micro : permission refusée affichée clairement, saisie écrite toujours possible', async ({ page, context }) => {
  await context.addInitScript(() => {
    class SR { lang = ''; interimResults = false; continuous = false; onresult: unknown = null; onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null; start() { setTimeout(() => { this.onerror?.({ error: 'not-allowed' }); this.onend?.() }, 10) } stop() { /* noop */ } }
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = SR
  })
  await page.reload()
  await page.getByTestId('nav-conversation').click()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Permission du micro refusée')).toBeVisible()
  await page.getByLabel('Ta réponse en anglais').fill('Hello, I am an engineer.')
  await expect(page.getByRole('button', { name: 'Envoyer' })).toBeEnabled()
})

test('fonctions vocales indisponibles : indicateurs et message, l\'application reste utilisable', async ({ page, context }) => {
  await context.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    delete w.webkitSpeechRecognition; delete w.SpeechRecognition; delete w.speechSynthesis
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  })
  await page.reload()
  await expect(page.getByTestId('status')).toContainText('Dictée indisponible')
  await expect(page.getByTestId('status')).toContainText('Lecture audio indisponible')
  await expect(page.getByTestId('status')).toContainText('Micro indisponible')
  await page.getByTestId('nav-conversation').click()
  await page.getByRole('button', { name: /Enregistrer/ }).click()
  await expect(page.getByText('Dictée indisponible ici')).toBeVisible()
  await page.getByLabel('Ta réponse en anglais').fill('I work at ENAC'); await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByTestId('conv-log')).toContainText('I work at ENAC')
})

test('mode hors connexion : indicateur, et l\'application se recharge sans réseau grâce au service worker', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  await expect(page.getByTestId('status')).toContainText('Hors ligne')
  await page.reload()
  await expect(page.getByTestId('status')).toContainText('Hors ligne')
  await page.getByTestId('nav-vocabulary').click()
  await expect(page.getByTestId('vocab-list')).toBeVisible()
  await context.setOffline(false)
})

test('export puis import restaure la progression ; la clé API n\'est pas exportée', async ({ page }) => {
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('gem-key').fill('SECRET-KEY-XYZ'); await page.getByTestId('gem-save').click()
  await completeLesson(page)
  await page.getByTestId('nav-settings').click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export').click()])
  const file = await dl.path()
  expect(fs.readFileSync(file, 'utf8')).not.toContain('SECRET-KEY-XYZ')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Effacer l\'historique local' }).click()
  await expect(page.getByText('Données locales effacées')).toBeVisible()
  await page.reload(); await page.getByTestId('nav-path').click()
  await expect(page.getByTestId('lesson-m1-l1')).toContainText('Commencer')
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('import').setInputFiles(file)
  await expect(page.getByText('Données importées')).toBeVisible()
  await page.reload(); await page.getByTestId('nav-path').click()
  await expect(page.getByTestId('lesson-m1-l1')).toContainText('Refaire')
  await page.getByTestId('nav-settings').click()
  await page.getByTestId('import').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"foo":1}') })
  await expect(page.getByText('Import annulé')).toBeVisible()
})

test('responsive : aucune page ne déborde à 375 px de large', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  for (const r of ROUTES) {
    // Sur téléphone, la navigation est dans le menu (bouton en haut à droite).
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
    await page.getByTestId(`menu-${r}`).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('main h1').first()).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, r).toBeLessThanOrEqual(1)
  }
})

test('rédaction avec IA : correction affichée en mode apprentissage', async ({ page }) => {
  await mockGemini(page)
  await configureGemini(page)
  await page.getByTestId('nav-writing').click()
  await page.getByLabel('Ta réponse en anglais').fill('I am agree')
  await page.getByTestId('write-ai').click()
  await expect(page.getByTestId('write-result')).toContainText('I agree')
  await expect(page.getByTestId('write-result')).toContainText('Voir la correction complète')
})

test('parcours utilisateur complet : progression et graphique', async ({ page }) => {
  await page.getByTestId('nav-grammar').click(); await page.getByTestId('gram-g1').click(); await runExercises(page)
  await page.getByTestId('reflect-skip').click()
  await expect(page.getByTestId('grammar-end')).toContainText('Prochaine révision')
  await page.getByTestId('nav-progress').click()
  await expect(page.getByTestId('week-chart')).toBeVisible()
  await expect(page.getByText('Grammaire').first()).toBeVisible()
})

test('plan du jour : trois gestes, le premier mène à une session de révision', async ({ page }) => {
  const plan = page.getByTestId('daily-plan')
  await expect(plan).toBeVisible()
  await expect(plan.getByRole('listitem')).toHaveCount(3)
  await page.getByTestId('plan-review').click()
  await expect(page.getByTestId('session')).toBeVisible()
})

test('erreur de grammaire : la règle du point est rappelée', async ({ page }) => {
  await page.getByTestId('nav-grammar').click(); await page.getByTestId('gram-g1').click()
  const opt = page.locator('.card .btn.text-left').first()
  if (await opt.isVisible()) await opt.click(); else await page.getByLabel('Ta réponse', { exact: true }).fill('zzz')
  await page.getByTestId('submit-sure').click()
  // La première question de g1 : « check / checks / is check » → l'option 1 est la bonne, on se trompe volontairement si besoin.
  if (!(await page.getByTestId('rule-recall').isVisible())) {
    await page.getByTestId('next').click()
    const o2 = page.locator('.card .btn.text-left').nth(2)
    if (await o2.isVisible()) await o2.click(); else await page.getByLabel('Ta réponse', { exact: true }).fill('zzz')
    await page.getByTestId('submit-sure').click()
  }
  await expect(page.getByTestId('rule-recall')).toBeVisible()
  await expect(page.getByTestId('rule-recall')).toContainText('Présent simple ou présent continu')
})

test('vocabulaire : le mode Dictée est proposé', async ({ page }) => {
  await page.getByTestId('nav-vocabulary').click()
  await page.getByTestId('vmode-dictation').click()
  await expect(page.getByText('Écoute le mot, puis écris-le en anglais.')).toBeVisible()
})

test('parcours : la progression globale est affichée', async ({ page }) => {
  await page.getByTestId('nav-path').click()
  await expect(page.getByTestId('path-progress')).toContainText('0 / 12 modules terminés')
})

test('progression : bilan de la semaine honnête quand il n\'y a aucune donnée', async ({ page }) => {
  await page.getByTestId('nav-progress').click()
  await expect(page.getByTestId('weekly-review')).toContainText('Rien d’enregistré')
})
