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
  data/                    données de démonstration (pharmacies, médicaments, assureurs, contenus…)
  services/                accès aux sources externes (annuaire des pharmacies)
  lib/                     horaires & garde, géolocalisation, tarification, affectation, empreintes
  components/              layouts, kit UI, carte Leaflet
  pages/patient|agent|admin
```

## ⚠️ Données de démonstration et passage en production

Cette version est un **prototype fonctionnel côté client**. Avant toute mise en service :

- **Pharmacies et tours de garde** : les fiches actuelles sont fictives. `src/services/pharmacyProvider.ts`
  accepte `VITE_PHARMACY_API_URL`, qui doit pointer vers un backend chargé d'agréger les données publiques
  (par exemple [pharmacies-de-garde.ci](https://www.pharmacies-de-garde.ci)) côté serveur, dans le respect
  de leurs conditions d'utilisation.
- **Prix et CMU** : valeurs d'exemple. Le panier CMU doit être alimenté depuis les listes officielles du
  ministère (sante.gouv.ci) et tenu à jour.
- **Lecture d'ordonnance (IA)** : l'extraction est simulée (`src/data/extraction.ts`) ; à brancher sur un
  service OCR/vision. L'IA ne modifie jamais la prescription.
- **Paiement** : simulé (Orange Money, MTN MoMo, Moov Money, Wave, carte). Les flux financiers doivent être
  conçus avec un professionnel de la réglementation ivoirienne.
- **Sécurité des données de santé** : backend, chiffrement, authentification forte, contrôle des rôles,
  journalisation, conservation — à concevoir avec un spécialiste conformité et selon les exigences de
  l'Autorité de protection des données (autoritedeprotection.ci). Aujourd'hui, les données restent dans le
  `localStorage` du navigateur.
