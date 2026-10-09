# Publier PHARMA CI sur le Google Play Store

PHARMA CI est un site web. Pour le mettre sur le Play Store, on l'**emballe** dans une petite application Android
(appelée « TWA »). L'application Android affiche le site en plein écran, sans barre d'adresse.
Avantage : quand le site est mis à jour, l'application l'est aussi, sans republier sur le Play Store.

Ce qui est déjà prêt dans le dépôt :

- le site est **installable** (fichier `public/manifest.webmanifest`, icônes dans `public/icons/`) ;
- il **fonctionne hors connexion** (service worker `pwa/sw.js`, généré au moment de la construction) ;
- une **politique de confidentialité** : `public/confidentialite.html` (à compléter avec votre e-mail) ;
- les **images de la fiche** Play Store : dossier `docs/play-store/`.

---

## Étape 0 — Avant de commencer

Le site doit être en ligne **sur votre nom de domaine LWS, en https** : `https://www.pharma-ci.org`.
L'adresse `agentfifa7-web.github.io/Pharma-CI` ne convient pas pour le Play Store : Android a besoin d'un fichier
de vérification à la racine du domaine, ce qui n'est possible qu'avec votre propre domaine.

## Étape 1 — Créer le compte développeur Google Play (vous)

1. Allez sur <https://play.google.com/console/signup> avec votre compte Google.
2. Choisissez **« Pour moi » (compte personnel)**. Le compte « organisation » demande un numéro D-U-N-S.
3. Payez les frais d'inscription : **25 $ US, une seule fois** (carte bancaire).
4. Vérifiez votre identité (pièce d'identité) et votre numéro de téléphone. Cela peut prendre quelques jours.

> ⚠️ **Règle importante pour les nouveaux comptes personnels** : Google demande actuellement un **test fermé
> avec au moins 12 testeurs pendant 14 jours d'affilée** avant d'autoriser la publication pour tout le monde.
> Préparez dès maintenant une liste de 12 adresses Gmail (famille, amis, collègues) qui installeront l'application.

## Étape 2 — Fabriquer l'application Android avec PWABuilder (vous, 10 minutes, gratuit)

1. Allez sur <https://www.pwabuilder.com>.
2. Collez l'adresse de votre site (celle de l'étape 0) et cliquez sur **Start**.
3. Cliquez sur **Package For Stores**, puis sur **Android** → **Generate Package**.
4. Dans les options, vérifiez :
   - **Package ID** : l'identifiant définitif de l'application, mettez `org.pharmaci.app`
     (votre domaine à l'envers, sans tiret car Android ne l'accepte pas). ⚠️ Il ne pourra **plus jamais être changé** après la première publication.
   - **App name** : `PHARMA CI` ;
   - **Signing key** : laissez **« Create new »**.
5. Téléchargez le fichier `.zip`. Il contient :
   - `*.aab` : l'application à envoyer sur le Play Store ;
   - `signing.keystore` et `signing-key-info.txt` : **la clé de votre application**.
     **Gardez-les précieusement** (clé USB + Google Drive). Sans elles, vous ne pourrez plus mettre l'application à jour.
     Ne les mettez **jamais** sur GitHub ;
   - `assetlinks.json` : le fichier de vérification (voir étape 4).

## Étape 3 — Créer l'application dans la Play Console (vous)

1. Play Console → **Créer une application** : nom `PHARMA CI`, langue **Français**, type **Application**, **Gratuite**.
2. Menu **Tests → Test fermé** → créez une version → envoyez le fichier `.aab`.
   Acceptez la **« Signature d'application Play »** (proposée par défaut).
3. Ajoutez vos 12 testeurs (leurs adresses Gmail) et envoyez-leur le lien d'inscription.

## Étape 4 — Le fichier de vérification (vous + Claude)

C'est ce fichier qui fait disparaître la barre d'adresse dans l'application.

1. Dans la Play Console : **Configuration → Intégrité de l'application → Signature de l'application**.
   Copiez l'**empreinte SHA-256** du « certificat de la clé de signature d'application ».
2. Envoyez à Claude, dans le projet : le fichier `assetlinks.json` de PWABuilder **et** cette empreinte SHA-256.
3. Claude ajoutera le fichier dans `public/.well-known/assetlinks.json` (les deux empreintes) par une demande de fusion.
   Vous la fusionnerez, et le fichier sera en ligne à l'adresse `https://www.pharma-ci.org/.well-known/assetlinks.json`.

## Étape 5 — Remplir la fiche Play Store (vous)

Menu **Présence sur le Play Store → Fiche principale** :

| Champ | À mettre |
|---|---|
| Nom | `PHARMA CI` |
| Description courte (80 caractères max.) | `Pharmacies de garde, médicaments et prix en Côte d'Ivoire.` |
| Description complète | le texte ci-dessous |
| Icône (512 × 512) | `docs/play-store/icone-512.png` |
| Image de présentation (1024 × 500) | `docs/play-store/image-presentation-1024x500.png` |
| Captures d'écran téléphone (au moins 2) | `docs/play-store/capture-*.png` |
| Catégorie | **Médecine** |
| E-mail de contact | votre adresse e-mail |

**Description complète** (à copier) :

```
PHARMA CI vous aide à trouver une pharmacie en Côte d'Ivoire, à tout moment.

• Pharmacies de garde : la liste de la semaine, ville par ville et commune par commune.
• Annuaire national : plus de 1 000 pharmacies, avec carte, itinéraire et téléphone.
• Pharmacies proches de vous : triées par distance (si vous autorisez la localisation).
• Médicaments : plus de 4 500 produits, prix publics et liste CMU.
• Fonctionne même avec une connexion faible : les dernières informations consultées restent disponibles.

Les informations proviennent de sources publiques (notamment pharmacies-de-garde.ci) et sont indicatives :
confirmez toujours auprès de la pharmacie. PHARMA CI ne vend pas de médicaments et ne remplace pas l'avis
d'un pharmacien ou d'un médecin. En cas d'urgence, appelez le 185 (SAMU).
```

Menu **Contenu de l'application** (questionnaires obligatoires) :

- **Règles de confidentialité** : `https://www.pharma-ci.org/confidentialite.html`
  (complétez d'abord l'e-mail de contact dans `public/confidentialite.html`).
- **Annonces** : Non, l'application ne contient pas d'annonces.
- **Accès à l'application** : Toutes les fonctionnalités sont disponibles sans restriction (pas de compte).
- **Classification du contenu** : remplissez le questionnaire (catégorie « Référence, actualités ou éducation »).
- **Public cible** : **18 ans et plus** (évite les règles spéciales « enfants »).
- **Sécurité des données** : aucune donnée n'est envoyée à PHARMA CI ; la position et les photos restent
  sur le téléphone. Répondez « Non, aucune donnée collectée ou partagée ».
- **Applications de santé** : déclarez que l'application donne des informations sur les médicaments et les pharmacies
  (ce n'est pas un dispositif médical).

## Étape 6 — Publier pour tout le monde

Après les 14 jours de test fermé avec 12 testeurs, la Play Console propose **« Demander l'accès à la production »**.
Répondez aux questions, puis créez une version **Production** avec le même fichier `.aab`. Google vérifie
l'application (quelques jours en général).

## Mettre à jour l'application plus tard

- Changement du site (pages, données, design) : **rien à faire**, l'application affiche toujours le site à jour.
- Changement de l'icône, du nom ou de la couleur : refaire l'étape 2 avec **la même clé** (`signing.keystore`,
  option « Use mine » dans PWABuilder) et un numéro de version plus grand, puis envoyer le nouveau `.aab`.
