# Lecture des ordonnances manuscrites par IA

Le moteur de lecture intégré au site (Tesseract) lit bien le texte **imprimé**, mais pas l'écriture **à la main**
des médecins. Ce service ajoute une lecture par IA (Google Gemini, modèle de vision) qui sait déchiffrer les
ordonnances manuscrites, puis le site rapproche chaque médicament lu de la base PHARMA MED.

Le site étant publié sur GitHub Pages (sans serveur), la clé de l'IA ne peut pas être mise dans le site :
elle est gardée dans un petit service gratuit chez Cloudflare (`worker.js`).

Tant que ce service n'est pas configuré, le site continue d'utiliser l'ancienne lecture (Tesseract).

## Mise en place (une seule fois, environ 15 minutes, gratuit, sans carte bancaire)

### 1. Créer la clé Gemini (Google)
1. Ouvrir https://aistudio.google.com/apikey et se connecter avec un compte Google (Gmail).
2. Accepter les conditions, puis cliquer **Create API key** (« Créer une clé API »).
3. Copier la clé (elle commence par `AIza…`). Ne la publier nulle part.

### 2. Créer le service chez Cloudflare
1. Ouvrir https://dash.cloudflare.com/sign-up et créer un compte gratuit (adresse e-mail + mot de passe).
2. Dans le menu de gauche : **Compute (Workers)** → **Workers & Pages** → **Create** → **Start with Hello World!**
3. Nommer le service `ordonnance-ia`, puis **Deploy**.
4. Cliquer **Edit code**, tout effacer, coller le contenu du fichier `services/ordonnance-ia/worker.js`
   de ce dépôt, puis **Deploy**.
5. Revenir au service → **Settings** → **Variables and Secrets** → **Add** :
   - Type : **Secret** · Name : `GEMINI_API_KEY` · Value : la clé copiée à l'étape 1 → **Deploy**.
6. Copier l'adresse du service, de la forme `https://ordonnance-ia.<votre-compte>.workers.dev`.
   En l'ouvrant dans le navigateur, on doit voir `"configured":true`.

### 3. Brancher le site sur le service
Le service de PHARMA CI (`https://ordonnance-ia.agentfifa7.workers.dev`) est déjà inscrit dans
`src/data/extraction.ts` (`ORDONNANCE_IA_URL`). Pour utiliser une autre adresse sans modifier le code :
1. Sur GitHub, dépôt **Pharma-CI** → **Settings** → **Secrets and variables** → **Actions** → onglet **Variables**
   → **New repository variable**.
2. Name : `ORDONNANCE_IA_URL` · Value : l'adresse copiée à l'étape 2.6 → **Add variable**.
3. Onglet **Actions** → **Publication de l'application (GitHub Pages)** → **Run workflow**.

Après la publication, la page « Envoyer une ordonnance » lit les ordonnances par IA.

## Bon à savoir
- **Coût** : l'offre gratuite de Gemini et celle de Cloudflare suffisent pour démarrer (limites de quelques
  centaines de lectures par jour, susceptibles d'évoluer : voir la console Google AI Studio).
- **Confidentialité** : avec l'offre **gratuite**, Google peut utiliser les images envoyées pour améliorer ses
  modèles. Pour des ordonnances réelles de patients, il est préférable d'activer la facturation sur la clé
  (offre payante, coût très faible par ordonnance), ce qui exclut cet usage. La politique de confidentialité du
  site doit mentionner ce traitement.
- **Qualité** : une photo nette, de face, bien éclairée et en taille originale (pas une miniature WhatsApp) donne
  le meilleur résultat. Le patient vérifie toujours chaque ligne avant de confirmer.
- Le modèle utilisé peut être changé avec la variable `GEMINI_MODEL` (par défaut `gemini-flash-latest`).
- Si le service ne répond pas (quota atteint, coupure), le site repasse automatiquement à la lecture Tesseract.
