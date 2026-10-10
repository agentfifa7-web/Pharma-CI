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
3. Copier la clé (elle commence par `AQ.` ou `AIza…`). Ne la publier nulle part.

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

## Mettre à jour le service
Quand `worker.js` change dans ce dépôt, il faut recoller le code chez Cloudflare (la clé, elle, est conservée) :
**Workers & Pages** → `ordonnance-ia` → **Edit code** → tout effacer → coller le nouveau `worker.js` → **Deploy**.
L'adresse du service affiche alors le numéro de version (`"version":10`).

## Missions partagées entre patients et agents (base de données)
Sans cette base, une mission n'existe que sur le téléphone du patient : l'agent ne la reçoit pas sur son propre
téléphone. Le même service Cloudflare enregistre les missions dans une base gratuite (Cloudflare D1).

Mise en place (une seule fois) :
1. Cloudflare → **Storage & Databases** → **D1 SQL Database** → **Create** → nom `pharma-ci` → **Create**.
2. **Workers & Pages** → `ordonnance-ia` → **Settings** → **Bindings** → **Add** → **D1 database** :
   Variable name `DB`, base `pharma-ci` → **Add Binding** (ou **Deploy**).
3. **Settings** → **Variables and Secrets** → **Add** : Type **Secret**, Name `AGENT_CODE`, Value : un code choisi
   (au moins 8 caractères), à remettre aux agents → **Deploy**.
4. Recoller la dernière version de `worker.js` (voir « Mettre à jour le service »).
5. L'adresse du service doit afficher `"missions":true` et `"agentCode":true`. La table est créée automatiquement.

Ensuite, chaque agent ouvre `https://www.pharma-ci.org/agent` sur son téléphone, saisit le code agent, puis son nom
et son téléphone. Les missions des patients y apparaissent (actualisation toutes les 8 secondes) ; l'agent en accepte
une, peut appeler le patient (appel, WhatsApp, SMS), et chaque étape remonte chez le patient. Le code de livraison
du patient n'est jamais transmis aux agents : le service le vérifie lui-même.

Les agents enregistrés (nom, téléphone, zone, disponibilité, dernière connexion) sont aussi gardés dans cette base.
L'administration du site (`/admin/agents`, `/admin/missions`) les voit après avoir saisi le même code agent, quel que
soit l'ordinateur ou le téléphone utilisé. Une mission n'est lancée que si le service l'a bien enregistrée ; sinon le
patient voit un message et peut réessayer.

## Espace Admin réservé à l'administratrice
Le bouton **Admin** n'apparaît que sur les appareils où le code administrateur a été saisi. Mise en place (une fois) :
**Settings** → **Variables and Secrets** → **Add** : Type **Secret**, Name `ADMIN_CODE`, Value : un code connu de
l'administratrice seule (différent du code agent, au moins 8 caractères) → **Deploy**. L'adresse du service affiche
alors `"adminCode":true`. Ensuite, ouvrir `https://www.pharma-ci.org/admin` sur son téléphone ou son ordinateur et
saisir ce code : le bouton Admin apparaît sur cet appareil. Ce code vaut aussi code agent (agents et missions de tous
les téléphones). Changer `ADMIN_CODE` chez Cloudflare ferme l'espace Admin sur tous les appareils.

## Assureurs partenaires (« Trouver une assurance »)
Les assureurs partenaires et leurs produits (nom, public visé, coût, prise en charge, plafond, services, conditions)
sont gardés dans la même base. L'administratrice les ajoute dans `https://www.pharma-ci.org/admin/assurances`
(code administrateur requis) ; les patients les voient dans **Assurances → Trouver une assurance**, avec les boutons
Appeler, WhatsApp, e-mail et site de l'assureur. La rubrique `base` du diagnostic compte les `assureurs`.

## Diagnostic
Ouvrir `https://ordonnance-ia.agentfifa7.workers.dev/?diagnostic` : pour chaque modèle Gemini utilisé, la page fait une
petite lecture avec les mêmes réglages qu'une vraie ordonnance et indique si elle réussit (`"ok":true`), en combien de
millisecondes, ou l'erreur rencontrée (clé refusée, quota atteint, modèle introuvable…). La rubrique `available` liste
les modèles « flash » ouverts à la clé. La rubrique `base` compte les missions enregistrées, celles qui attendent
un agent et les agents enregistrés (aucune donnée personnelle).

## Robustesse
- Les modèles travaillent en relais : `gemini-3.5-flash` (bonne lecture de l'écriture manuscrite) démarre seul ;
  `gemini-flash-lite-latest` (très rapide) démarre en secours après 10 s, ou dès que le premier a échoué. La lecture
  du premier est préférée, mais on ne l'attend que 6 s de plus quand le secours a déjà répondu.
  Choix fait d'après le diagnostic : `gemini-3.8-flash` et `gemini-flash-latest` ne répondaient pas.
- Le réglage de réflexion du modèle est limité (plus rapide et plus régulier) ; s'il est refusé, le réglage suivant est essayé.
- La lecture complète ne dépasse jamais 50 s. Côté site, l'attente est limitée à 70 s. En cas d'échec, un message clair
  s'affiche avec les boutons « Relancer la lecture » et « Reprendre la photo ».

## Bon à savoir
- **Coût** : l'offre gratuite de Gemini et celle de Cloudflare suffisent pour démarrer (limites de quelques
  centaines de lectures par jour, susceptibles d'évoluer : voir la console Google AI Studio).
- **Confidentialité** : avec l'offre **gratuite**, Google peut utiliser les images envoyées pour améliorer ses
  modèles. Pour des ordonnances réelles de patients, il est préférable d'activer la facturation sur la clé
  (offre payante, coût très faible par ordonnance), ce qui exclut cet usage. La politique de confidentialité du
  site doit mentionner ce traitement.
- **Qualité** : une photo nette, de face, bien éclairée et en taille originale (pas une miniature WhatsApp) donne
  le meilleur résultat. Le patient vérifie toujours chaque ligne avant de confirmer.
- Le modèle utilisé peut être changé avec la variable `GEMINI_MODEL` (il est alors essayé en premier), par exemple avec un nom de la rubrique `available` du diagnostic.
