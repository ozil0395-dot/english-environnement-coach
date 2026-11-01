# English-Environnement-Coach

Application web (PWA) pour apprendre l'anglais professionnel dans un contexte **environnement / HSE / pipelines / Oil & Gas**.
Gratuite : aucun abonnement, aucune API payante obligatoire. Données locales. IA **facultative**.

Réalisé par **FOUL Hicham**.

Stack : React 19, TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), Recharts, Vitest, Playwright.

---

## 0. Ouvrir tout de suite (sans installation)

Double-clique sur **`English-Environnement-Coach.html`** (dans Chrome). Les progrès sont gardés dans le navigateur.
Limite : dans ce mode fichier, l'installation PWA et le service worker ne sont pas disponibles. Pour les avoir, utilise la version serveur ci-dessous.
Ne double-clique **pas** sur `dist/index.html` : Chrome bloque ses fichiers (page blanche). Pour régénérer le fichier autonome : `npm run build:single` (résultat dans `dist-single/`).

## 1. Installation (Windows, macOS ou Linux)

1. Installer **Node.js LTS** depuis nodejs.org (version 20 ou plus récente).
2. Décompresser l'archive, ouvrir un terminal dans le dossier `english-environnement-coach`, puis :

```bash
npm install
```

## 2. Lancer l'application

**Mode développement** (rechargement automatique) :

```bash
npm run dev
```

Ouvrir ensuite l'adresse affichée (en général `http://localhost:5173`) dans **Google Chrome**.

**Version de production** (recommandée pour l'usage quotidien et l'installation PWA) :

```bash
npm run build
npm run preview
```

Ouvrir `http://localhost:4173` dans Chrome.

## 3. Installer comme application (PWA)

1. Ouvrir la version de production dans Chrome (premier chargement **en ligne**).
2. Menu Chrome (⋮) → **Installer English-Environnement-Coach** (ou le bouton dans Paramètres si Chrome le propose).
3. Après ce premier chargement, l'application s'ouvre aussi **sans connexion** tant que le serveur `npm run preview` a servi les fichiers une fois : le service worker garde l'application en cache.

> Le service worker n'est actif qu'en version de production (`npm run build`), pas en mode développement.

---

## 4. Moteurs IA (facultatifs)

L'application fonctionne **sans IA** : leçons, exercices corrigés localement, vocabulaire, révision espacée, scénarios préconstruits, règles de correction locales (très limitées). Choisir le moteur dans **Paramètres / IA**.

### Gemini (Google, clé personnelle)

1. Créer ou reprendre ta clé API Gemini dans Google AI Studio.
2. **Paramètres / IA** → choisir « Gemini » → coller la clé → **Enregistrer la clé**.
3. Cocher le **consentement** d'envoi à Google.
4. Garder le modèle par défaut ou cliquer **Lister les modèles**, puis **Tester la connexion**.

À savoir :
- La clé est stockée **en clair dans ce navigateur** (localStorage). Elle n'est **jamais** dans le code ni dans l'export de sauvegarde. Quiconque utilise ce profil de navigateur peut la lire : restreins-la à l'API Gemini côté Google et surveille son quota (partagé si la même clé sert à une autre application).
- Le texte envoyé au coach part chez **Google**. Sur le palier gratuit, les conditions de Google peuvent autoriser l'usage des contenus envoyés pour améliorer leurs produits : vérifie les conditions en vigueur. Ne saisis rien de confidentiel.
- Chaque appel contient seulement la question en cours et ta réponse (ou les derniers échanges d'un scénario), jamais l'historique complet.
- Quotas et noms de modèles gratuits peuvent changer.

### Ollama (local, aucune donnée ne quitte l'ordinateur)

```bash
# 1. Installer Ollama depuis ollama.com
# 2. Télécharger un modèle léger (8 Go de RAM : modèles de 1 à 3 milliards de paramètres)
ollama pull llama3.2:3b
# 3. Autoriser l'application à joindre Ollama (nécessaire pour que Chrome accepte la connexion)
#    macOS / Linux :
OLLAMA_ORIGINS="http://localhost:4173,http://localhost:5173" ollama serve
#    Windows : créer la variable d'environnement OLLAMA_ORIGINS avec la même valeur, puis relancer Ollama
```

Dans **Paramètres / IA** : choisir « Ollama » → **Vérifier Ollama** → choisir le modèle installé.
Le premier échange peut être lent sur une machine modeste ; la longueur des réponses est limitée.

---

## 5. Fonctionnalités réellement opérationnelles

| Page | Contenu |
|---|---|
| Dashboard | Statistiques réelles ; objectifs ; **« À réviser aujourd'hui »** (session du jour) et **session mixte** ; carte de **calibration** (confiance vs réussite) |
| Test de niveau | 30 questions A1→C1 (grammaire, vocabulaire, vocabulaire pro, compréhension écrite et orale), résultat **seulement à la fin**, texte écrit et phrase orale facultatifs |
| Parcours | 12 modules, 1 leçon chacune : **pré-test** (3 questions avant le cours), cours, **prédiction du score**, 5-6 exercices (production d'abord), **phrase personnelle**, **réflexion** en 3 questions, score et prochaine révision |
| Conversation | Questions, correction IA (originale/corrigée/plus naturelle/explication/vocabulaire/à répéter) ou règles locales ; dictée ; lecture audio ; vitesse ; explication détaillée |
| Entraînement vocal | Écoute, répétition, comparaison du **texte** reconnu avec la phrase cible |
| Simulations | 15 scénarios (A à O) : avec IA l'interlocuteur réagit, corrections, évaluation finale ; sans IA, dialogue préconstruit en 3 étapes |
| Vocabulaire | 106 mots, recherche EN/FR, catégories, favoris, mots difficiles, révision espacée, exercices de traduction et à trous |
| Grammaire | 8 leçons avec exercices (pas de pré-test), réflexion finale, révision planifiée ; **mes erreurs fréquentes** transformées en exercices |
| Rédaction | 8 types de textes, règles locales ou correction IA, version simplifiée, mode apprentissage |
| Entretiens | 12 questions, conseils, réponse modèle, expressions utiles, commentaire IA |
| Progression | Graphique 7 jours, réussite par compétence, tests, calendrier de révision, prédictions, réflexions, derniers échanges |
| Paramètres | Moteur IA, objectifs, thème, installation, export/import/effacement |

Indicateurs permanents : en ligne/hors ligne, micro, dictée, lecture audio, état de l'IA.

### Apprentissage efficace (principes de *Make It Stick*)

- **Pré-test** avant chaque leçon : se tromper avant d'apprendre aide à mieux retenir ; ces essais sont exclus de tes statistiques.
- **Révision espacée** des leçons et leçons de grammaire à J+1, 3, 7, 14, 30 (puis 60, 120). Un élément raté revient au début ; rien n'est jamais « terminé ».
- **Récupération active** : les QCM sont d'abord posés sans les choix (case « Sans les choix » pour changer).
- **Entrelacement** : la session mixte mélange vocabulaire, grammaire et tes propres erreurs.
- **Calibration** : indique ta confiance (« sûr » / « pas sûr ») et prédis ton score ; le tableau de bord montre l'écart entre ressenti et réalité.
- **Élaboration et réflexion** : une phrase sur ton propre travail, puis 3 questions courtes en fin de séance.
- Messages d'erreur centrés sur l'effort et la stratégie. Pas de « styles d'apprentissage » (non démontrés) et aucune note de prononciation.

## 6. Limites connues

- **L'appel réel à Gemini n'a pas été testé** (pas de clé dans mon environnement) : les tests utilisent des réponses simulées. À valider chez toi avec « Tester la connexion ». **Ollama** n'a pas été testé avec un vrai modèle non plus.
- **Dictée et lecture audio** : testées seulement avec des simulations (permission refusée, API absentes). À valider sur ton PC avec ton micro. La dictée Chrome envoie l'audio à un service externe et exige Internet.
- **Pas d'analyse de prononciation** : le texte reconnu n'est pas une mesure acoustique. **Pas de conversation vocale en temps réel** : messages texte, dictée, lecture audio.
- Le niveau estimé (30 questions) est une **estimation pédagogique**, pas une certification. L'expression écrite et orale du test n'est notée que si une IA est active.
- Sans IA, la correction repose sur 12 règles locales : elle repère peu d'erreurs.
- Les traductions techniques sont indicatives : vérifie-les dans tes documents officiels.
- Chaque module contient une leçon : le contenu peut être étendu dans `src/data/`.
- Le temps de pratique est mesuré par activité terminée (plafonné à 15 min), pas par durée d'ouverture de la page.
- Fichier JavaScript principal d'environ 815 Ko (248 Ko compressé) à cause des graphiques : sans impact en usage local.
- Hors ligne : fonctionne après un premier chargement de la version de production ; non vérifié sur d'autres navigateurs que Chromium.

---

## 7. Sauvegarde et restauration

- **Exporter** : Paramètres → Exporter mes données (JSON, **sans la clé API**).
- **Importer** : Paramètres → Importer (remplace les données actuelles ; un fichier invalide est refusé sans rien modifier).
- **Effacer** : Paramètres → Effacer l'historique local (définitif, la clé Gemini n'est pas concernée).

Exporte régulièrement : vider les données du navigateur supprime les progrès.

## 8. Confidentialité et permissions

- Progrès et historique : IndexedDB, dans ton navigateur.
- Aucun texte n'est envoyé à Google sans clé **et** consentement. Ollama reste local.
- Permissions : microphone (dictée) et lecture audio, demandées à l'usage.
- Aucune clé ni secret dans le code source.

---

## 9. Structure du projet

```
src/
  app/          App, routeur, contexte (réglages, état système)
  components/   composants partagés (exercices, dictée, correction)
  pages/        12 pages
  services/
    ai/         provider.ts, gemini.ts, ollama.ts, coach.ts, localRules.ts
    speech/     reconnaissance et synthèse vocales (détection, erreurs)
    storage/    Dexie (db.ts) et accès aux données (repo.ts)
    stats/      statistiques, révision espacée, correction d'exercices
    export/     sauvegarde / restauration
  data/         curriculum, vocabulaire, scénarios, exercices
  hooks/ types/ utils/
public/         manifest.webmanifest, sw.js, icônes
tests/          unit (Vitest) et e2e (Playwright)
```

## 10. Tests et résultats (exécutés)

```bash
npm run typecheck     # TypeScript
npm test              # Vitest
npm run test:e2e      # Playwright (construit et sert l'application)
npm run build         # compilation de production
```

Résultats de la dernière exécution :
- **TypeScript** : 0 erreur.
- **Vitest** : 71 tests réussis sur 5 fichiers (statistiques, révision espacée, calendrier de révision, calibration, session mixte, exclusion du pré-test, correction, niveau, sauvegarde/restauration dont anciens exports, persistance, adaptateurs Gemini/Ollama, erreurs micro, intégrité du contenu).
- **Playwright (Chromium)** : 21 tests réussis (navigation des 12 pages sans erreur de console, leçon complète + révision planifiée + persistance, pré-test, confiance et mode sans choix, session mixte, file « à réviser », élaboration et réflexion, test de niveau complet, vocabulaire et favoris, scénario sans IA, Gemini simulé avec 429, Ollama arrêté, micro refusé, fonctions vocales absentes, hors connexion avec service worker, export/import, 375 px sans débordement, rédaction IA, parcours complet).
- **Build de production** : réussi.

Pour Playwright dans un environnement sans navigateur installé : `npx playwright install chromium`, ou définir `CHROMIUM_PATH` vers un Chrome/Chromium existant.
