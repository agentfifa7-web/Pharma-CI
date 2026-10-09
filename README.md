# 🇨🇮 PHARMA CI

**Votre ordonnance. Notre mission. Vos médicaments chez vous.**

PHARMA CI est une plateforme nationale de services pharmaceutiques et logistiques pour la Côte d'Ivoire.
Elle **n'est pas une pharmacie en ligne** : elle ne vend pas de médicaments. Le patient transmet son ordonnance,
paie la mission, un agent PHARMA CI achète les médicaments dans une pharmacie physique, récupère la facture
originale et livre le patient.

```
Patient → PHARMA CI → Agent → Pharmacie → Agent → Patient
```

## Démarrer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de production dans dist/
```

**En ligne** : https://www.pharma-ci.org (nom de domaine LWS, fichier `public/CNAME` ; publiée par `.github/workflows/deploy-pages.yml`
à chaque mise à jour de `main` et après chaque synchronisation ; prérequis : *Settings → Pages → Source : GitHub Actions*).

**Application mobile** : le site est installable sur téléphone et fonctionne hors connexion. Publication sur le
Google Play Store : voir [docs/PLAY_STORE.md](docs/PLAY_STORE.md).

L'application contient trois interfaces (sélecteur en haut à droite) :

| Interface | URL | Rôle |
|---|---|---|
| Patient | `/` | Recherche, ordonnances, missions, suivi, historique |
| Agent | `/agent` | Missions d'achat et de livraison |
| Admin | `/admin` | Command Center, anti-fraude, données, sécurité |

> 💡 **Démo du parcours complet** : ouvrez l'app Patient et l'app Agent dans deux onglets.
> Envoyez une ordonnance → confirmez → payez la mission → un agent est affecté automatiquement →
> dans l'onglet Agent, choisissez la pharmacie, saisissez la facture, démarrez la livraison →
> l'agent se déplace sur la carte du patient → saisissez le code OTP affiché chez le patient.
> Les onglets se synchronisent en temps réel.

## Modules (document de cadrage)

| § | Module | Route |
|---|---|---|
| 3 | Accueil patient | `/` |
| 4 | Annuaire national des pharmacies | `/pharmacies` |
| 5 | PHARMA GARDE — pharmacies de garde | `/garde` |
| 6 | PHARMA MED — base des médicaments | `/medicaments` |
| 7 | PHARMA PRIX — indicatif / communiqué / confirmé | fiches médicaments |
| 8 | PHARMA CMU | `/cmu` |
| 9–12 | PHARMA ORDONNANCE, estimation, anti-duplication (SHA-256), verrouillage | `/ordonnance`, `/ordonnances` |
| 13 | Statuts d'ordonnance | `/ordonnances` |
| 14–15 | Paiement de la mission, affectation automatique d'un agent | `/ordonnances/:id` |
| 16–21 | Application Agent, facture, preuves, indisponibilité, écart de prix | `/agent` |
| 22–23 | Suivi de livraison en temps réel, code OTP | `/missions/:id` |
| 24 | Historique | `/historique` |
| 25–26 | Rappels de traitement et de fin de traitement | `/traitements` |
| 27–28 | PHARMA ASSUR et marketplace | `/assurances` |
| 29 | Pharmacovigilance — Mon expérience | `/vigilance` |
| 30 | Alertes médicaments | `/alertes` |
| 31 | SCAN PHARMA | `/scan` |
| 32 | PHARMA AI | `/assistant` |
| — | Parler à un pharmacien (WhatsApp, appel, SMS, historique des échanges) | `/pharmacien` |
| 33 | PHARMA NEWS CI | `/actualites` |
| 34 | PHARMA LEGAL | `/reglementation` |
| 35 | Ordre des pharmaciens | `/ordre` |
| 36 | Autres services de santé | `/sante` |
| 37 | Bouton URGENCE permanent | `/urgences` |
| 38–39 | Dossier familial, Espace senior | `/famille` |
| 40 | PHARMA MAP | `/carte` |
| 41–42 | PHARMA DATA, zones sous-desservies | `/admin/data` |
| 43 | Dashboard administrateur | `/admin` |
| 44 | Système anti-fraude | `/admin/fraude` |
| 45 | Notation agent / service | `/missions/:id` |
| 48 | Sécurité | `/admin/securite`, `/profil` |

## Architecture

```
src/
  types.ts                 modèle de données
  store/useStore.ts        état applicatif (zustand, persistant, synchronisé entre onglets)
  data/                    modules de données (chargés depuis public/data, alimenté par la synchronisation)
  services/                accès aux sources externes (annuaire des pharmacies)
  lib/                     horaires & garde, géolocalisation, tarification, affectation, empreintes
  components/              layouts, kit UI, carte Leaflet
  pages/patient|agent|admin
```

## 📦 Origine des données — aucune donnée fictive

| Donnée | Source | Fichier |
|---|---|---|
| Pharmacies de garde (période, commune, quartier, téléphone) | pharmacies-de-garde.ci — liste de garde hebdomadaire | `public/data/pharmacies.json` |
| Annuaire des pharmacies (GPS, adresse, horaires) | pharmacies-de-garde.ci — annuaire (API WordPress ou pages) | `public/data/pharmacies.json` |
| Cliniques, laboratoires, centres de santé, médecins… | pharmacies-de-garde.ci — annuaire | `public/data/etablissements.json` |
| Médicaments : code, nom commercial, groupe thérapeutique, prix | pharmacies-de-garde.ci — « Prix des médicaments en pharmacie » | `public/data/medicaments.json` |
| Liste CMU : nom, prix, DCI, classe, présentation | pharmacies-de-garde.ci — « Médicaments pris en charge par la CMU » | `public/data/medicaments.json` |
| Actualités santé | pharmacies-de-garde.ci — articles | `public/data/actualites.json` |
| Numéros d'urgence | numéros nationaux (SAMU 185, pompiers 180, police 170/110/111) | `src/data/health.ts` |

Ce qui n'a **pas** de source réelle reste **vide** (avec un message explicatif) plutôt que d'être inventé :
alertes médicaments (à brancher sur l'AIRP), assureurs partenaires, base des numéros de lot, informations de notice
(indications, effets indésirables…), populations par commune (calcul de couverture). Les agents fournis sont des
**comptes de test** permettant d'essayer le parcours de mission.

À prévoir avant une mise en service : paiement réel (simulé ici), backend sécurisé pour les données de santé
(aujourd'hui dans le `localStorage`), conformité avec l'Autorité de protection des données (autoritedeprotection.ci).

## 🔄 Synchronisation avec pharmacies-de-garde.ci

`scripts/sync-pharmacies/` récupère les données publiques du site et produit les fichiers `public/data/*.json`,
chargés par l'application au démarrage.

| Source | Contenu extrait |
|---|---|
| `/liste-des-pharmacies-de-garde-en-cote-divoire/` (tableaux TablePress) | Période de garde, pharmacies de garde d'Abidjan et de l'intérieur, commune/quartier, téléphone |
| API WordPress `/wp-json/wp/v2/listing` | Annuaire complet (fiches « Pharmacies »), localisations |
| Pages `/toutes-les-pharmacies-en-cote-divoire/page/N/` | Annuaire (repli si l'API est fermée) : nom, catégorie, téléphone, ville |
| Fiches `/listing/<slug>/` | Coordonnées GPS, adresse, horaires d'ouverture |
| `/prix-des-medicaments-en-pharmacie-en-cote-divoire/` | 3 870 médicaments : code, nom, groupe thérapeutique, prix |
| `/liste-des-medicaments-pris-en-charge-par-la-cmu/` | 737 médicaments CMU : nom, prix, DCI, classe, présentation |
| API WordPress `/wp-json/wp/v2/posts` | Articles santé (titre, extrait, date, lien) |

```bash
npm run sync:test                       # tests des parseurs (sur des pages enregistrées)
npm run sync:pharmacies                 # synchronisation complète (accès réseau requis)
npm run sync:pharmacies -- --garde-only # garde + médicaments uniquement (rapide)
npm run sync:pharmacies -- --fixtures   # hors ligne, à partir de scripts/sync-pharmacies/fixtures/
```

- **Automatisation** : `.github/workflows/sync-pharmacies.yml` s'exécute chaque jour (et à la demande depuis
  l'onglet *Actions*). Il ne publie que si les données ont changé ; en cas d'échec, le dernier fichier valide est conservé.
- **Rapprochement** : les pharmacies de garde sont associées aux fiches de l'annuaire (nom + ville) pour obtenir
  leurs coordonnées GPS. Sans correspondance, la position est celle du centre de la commune et l'application
  l'indique (« Position approximative ») ; l'itinéraire recherche alors la pharmacie par son nom.
- **Données personnelles** : le nom des pharmaciens titulaires publié dans les tableaux n'est pas conservé.
- **Respect de la source** : requêtes espacées, User-Agent identifié, cache des fiches. Vérifiez les conditions
  d'utilisation du site et, idéalement, concluez un accord avec son éditeur (partenariat@pharmacies-de-garde.ci
  est indiqué sur le site) pour obtenir un flux officiel.
