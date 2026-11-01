# Mettre English-Environnement-Coach sur ton iPhone (via GitHub Pages)

Durée : environ 15 minutes la première fois. Coût : 0 DA. Il te faut un ordinateur (pour l'envoi des fichiers) et ton iPhone.

> Important : le site sera **public sur Internet** (n'importe qui avec l'adresse peut l'ouvrir). Il ne contient **aucune donnée personnelle ni clé API** : ta progression et ta clé Gemini restent dans le navigateur de ton téléphone. Choisis un nom de dépôt neutre.

---

## Partie A : Créer le compte et le dépôt

1. Va sur **github.com** → **Sign up** (si tu as déjà un compte, **Sign in**). Confirme ton e-mail.
2. Clique sur le **+** en haut à droite → **New repository**.
3. Remplis :
   - **Repository name** : `english-environnement-coach`
   - **Public** (obligatoire pour Pages gratuit)
   - Ne coche **rien** d'autre (ni README, ni .gitignore).
4. Clique **Create repository**.

## Partie B : Envoyer les fichiers

Prépare le dossier : décompresse `english-environnement-coach.zip` sur ton ordinateur. Tu obtiens un dossier `english-environnement-coach` qui contient `src`, `public`, `package.json`, `.github`, etc. (Il ne contient pas `node_modules` : c'est normal.)

### Méthode 1 : par le navigateur (sans rien installer)

1. Sur la page du dépôt vide, clique **uploading an existing file**.
2. Ouvre le dossier décompressé et sélectionne **tout son contenu** (pas le dossier lui-même) : `src`, `public`, `tests`, `.github`, `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, etc. Glisse-les dans la page.
3. **Vérifie que le dossier `.github` est bien dans la liste** envoyée. S'il manque (certains systèmes cachent les dossiers commençant par un point), utilise la méthode 2 ou l'étape « Si `.github` manque » ci-dessous.
4. Attends la fin du chargement, puis en bas : **Commit changes**.

> Si `.github` manque : sur la page du dépôt → **Add file → Create new file**, tape comme nom `.github/workflows/deploy.yml` (les `/` créent les dossiers), colle le contenu du fichier `deploy.yml` du ZIP, puis **Commit changes**.

### Méthode 2 : avec Git (si tu l'as installé)

Dans un terminal, dans le dossier décompressé :

```bash
git init -b main
git add .
git commit -m "English-Environnement-Coach"
git remote add origin https://github.com/TON-NOM/english-environnement-coach.git
git push -u origin main
```

(Remplace `TON-NOM` par ton nom d'utilisateur GitHub. GitHub demande un jeton d'accès personnel à la place du mot de passe : Settings → Developer settings → Personal access tokens.)

## Partie C : Activer GitHub Pages

1. Dans le dépôt : **Settings** (onglet en haut) → **Pages** (menu de gauche).
2. Sous **Build and deployment** → **Source** : choisis **GitHub Actions**.
3. Va dans l'onglet **Actions**. Une exécution « Déployer sur GitHub Pages » démarre (pastille jaune). Attends 2 à 4 minutes jusqu'à la pastille **verte**.
   - Si elle ne démarre pas : **Actions → Déployer sur GitHub Pages → Run workflow**.
4. Retourne dans **Settings → Pages** : l'adresse apparaît, de la forme
   `https://TON-NOM.github.io/english-environnement-coach/`

Si la pastille est **rouge** : clique dessus, ouvre l'étape en échec et envoie-moi le message d'erreur.

## Partie D : Installer sur l'iPhone

1. Ouvre l'adresse **dans Safari** (pas dans Chrome iOS ni dans un navigateur intégré à une autre application : seule Safari propose l'ajout à l'écran d'accueil de façon fiable).
2. Attends le chargement complet **en étant connecté à Internet** (c'est lui qui met l'application en cache pour le hors ligne).
3. Touche le bouton **Partager** (carré avec une flèche vers le haut) → **Sur l'écran d'accueil** → **Ajouter**.
4. Ouvre l'application depuis la nouvelle icône.
5. Facultatif : **Réglages iPhone → Safari** : ne vide pas régulièrement l'historique et les données de sites.

## Partie E : Activer le coach IA Gemini sur l'iPhone

1. Dans l'application : **Paramètres / IA** → choisis « Gemini ».
2. Colle ta clé (la clé est à saisir sur chaque appareil, elle n'est jamais sauvegardée dans l'export).
3. Coche le consentement, puis **Tester la connexion**.

## Partie F : Passer ta progression du PC vers l'iPhone

1. Sur le PC : **Paramètres → Exporter mes données** (fichier JSON).
2. Envoie-le à ton iPhone (e-mail, AirDrop, WhatsApp à toi-même, iCloud Drive).
3. Sur l'iPhone : **Paramètres → Importer**, choisis le fichier. Attention : l'import **remplace** les données actuelles de l'iPhone.

---

## Mettre à jour l'application plus tard (par exemple la version avec le nouveau design et la signature)

1. Décompresse la nouvelle archive `english-environnement-coach.zip` sur ton ordinateur.
2. Sur le dépôt GitHub : **Add file → Upload files**. Sélectionne **tout le contenu** du dossier (pas le dossier lui-même), avec les mêmes noms de fichiers, puis **Commit changes**. Les fichiers existants sont remplacés.
   - Cette version ajoute des fichiers (`src/assets/signature.png`, `src/assets/signature-dark.png`, `src/assets/fonts/…`) et modifie `package.json` et `package-lock.json` : envoie-les aussi, sinon la pastille sera rouge à l'étape `npm ci`.
   - Avec Git : `git add . && git commit -m "Nouveau design + signature" && git push`.
3. Le déploiement repart tout seul (onglet **Actions**, pastille verte après 2 à 4 minutes).
4. Sur l'iPhone : ouvre l'application. Un bandeau **« Une nouvelle version est prête » → Mettre à jour** apparaît en haut ; touche-le et l'application se recharge. (Si le bandeau n'apparaît pas, ferme complètement l'application et rouvre-la **deux fois** (le service worker récupère la nouvelle version au deuxième lancement).) Si l'ancien design reste affiché, ouvre l'adresse dans Safari, recharge la page, puis rouvre l'application installée.

## Problèmes fréquents

| Symptôme | Solution |
|---|---|
| Page 404 | Attends 2 minutes après la pastille verte ; vérifie l'adresse exacte (avec `/english-environnement-coach/`) et que la Source de Pages est « GitHub Actions » |
| Pastille rouge à l'étape `npm ci` | `package-lock.json` n'a pas été envoyé : ajoute-le |
| Pastille rouge à l'étape `npm test` | Envoie-moi le message ; en attendant, supprime la ligne `- run: npm test` du fichier `deploy.yml` |
| Pas d'option « Sur l'écran d'accueil » | Tu n'es pas dans Safari |
| Plus de progrès après plusieurs semaines | Safari a purgé les données du site : restaure ta dernière sauvegarde (Partie F). Exporte une fois par semaine |
| La dictée ne marche pas | Normal sur iOS Safari : utilise la saisie écrite ou le micro du clavier iOS (touche micro du clavier) |
| Gemini : erreur 429 | Quota dépassé : attends, ou vérifie le quota de ta clé (partagé si tu utilises la même clé que RAE) |

## Ce qui n'est pas garanti

Je n'ai pas pu tester sur un vrai iPhone ni sur le vrai GitHub : l'application (nouveau design, signature, menu mobile) et le processus de déploiement ont été vérifiés dans Chromium seulement (71 tests unitaires et 21 tests de bout en bout). Le fichier de déploiement suit la configuration standard de GitHub, mais il peut demander un ajustement la première fois. Dis-moi exactement ce que tu vois et je corrige.
