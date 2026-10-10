// Modèle de données PHARMA CI

export type LatLng = { lat: number; lng: number }

/** Horaires hebdomadaires : index 0 = dimanche … 6 = samedi. null = fermé ce jour. */
export type WeeklyHours = ([string, string] | null)[]

export type Pharmacy = {
  id: string
  name: string
  address: string
  commune: string
  city: string
  region: string
  position: LatLng
  phone: string
  hours: WeeklyHours
  services: string[]
  /** Groupe de rotation de garde (tour hebdomadaire). */
  gardeGroup: number
  cmuVerified: boolean
  insurances: string[]
  deliveryAvailable: boolean
  /** Fiche revendiquée par la pharmacie (sinon référencée à partir de données publiques). */
  claimed: boolean
  source: string
  /** Période de garde publiée par la source (prioritaire sur la rotation `gardeGroup`). */
  garde?: { start: string; end: string }
  /** Coordonnées déduites du centre de la commune (fiche sans GPS). */
  positionApprox?: boolean
  /** Origine de la position quand elle provient d'une autre source que la fiche (ex. OpenStreetMap). */
  positionSource?: string
  /** Officine retrouvée sur la liste officielle des officines autorisées (AIRP). */
  authorized?: { source: string; label: string }
  /** Horaires non publiés par la source : valeurs usuelles par défaut. */
  hoursApprox?: boolean
  sourceUrl?: string
}

export type OpenState = 'open' | 'soon' | 'closed'

export type PriceLevel = 'indicatif' | 'communique' | 'confirme'
export type CmuStatus = 'pris_en_charge' | 'non_pris_en_charge' | 'a_verifier'

export type Medication = {
  id: string
  /** Code produit publié par la source. */
  code?: string
  /** Nom commercial tel que publié. */
  brand: string
  dci?: string
  /** Dosage extrait du libellé commercial. */
  dosage?: string
  form?: string
  therapeuticClass?: string
  presentation?: string
  // Informations documentaires : non fournies par les sources actuelles (affichées seulement si renseignées).
  lab?: string
  indications?: string
  precautions?: string
  contraindications?: string
  sideEffects?: string
  storage?: string
  leaflet?: string
  /** Notice et résumé des caractéristiques du produit (RCP) publiés par l'AIRP. */
  leafletUrl?: string
  rcpUrl?: string
  regulatoryStatus?: string
  /** Fiche issue uniquement de la liste des médicaments autorisés (AMM) de l'AIRP. */
  fromAmm?: boolean
  prescriptionRequired?: boolean
  cmu: { status: CmuStatus; reference?: string; conditions?: string; source: string; sourceUrl?: string; updatedAt: string }
  price?: { amount: number; level: PriceLevel; updatedAt: string; source: string; sourceUrl?: string }
  /** Identifiants d'équivalents (même DCI, même dosage, même forme). */
  equivalents: string[]
  /** Produits de la liste CMU portant la même marque (sans conclure à une prise en charge). */
  cmuCandidates?: string[]
  /** Numéros de lot connus (pour SCAN PHARMA) — aucune base officielle importée pour l'instant. */
  lots: { lot: string; expiry: string; status: 'conforme' | 'rappele' | 'inconnu' }[]
}

export type PrescriptionStatus =
  | 'nouvelle'
  | 'en_attente'
  | 'mission_lancee'
  | 'en_cours'
  | 'achat_effectue'
  | 'partiellement_executee'
  | 'livree'
  | 'annulee'
  | 'renouvellement'

export type PrescriptionLine = {
  id: string
  /** Libellé tel que lu sur l'ordonnance (jamais modifié par l'IA). */
  label: string
  medicationId?: string
  dosage: string
  quantity: number
  instructions?: string
}

export type Prescription = {
  id: string // ORD-CI-2026-XXXXX
  fingerprint: string // SHA-256 du/des document(s)
  profileId: string
  createdAt: string
  fileNames: string[]
  previews: string[] // data URLs (images compressées)
  lines: PrescriptionLine[]
  confirmed: boolean
  status: PrescriptionStatus
  locked: boolean
  missionId?: string
  history: { at: string; event: string }[]
}

export type MissionStatus =
  | 'payee' // Mission lancée, recherche d'agent
  | 'agent_affecte'
  | 'en_pharmacie'
  | 'ecart_prix' // en attente de décision du patient
  | 'achat_effectue'
  | 'en_route'
  | 'livree'
  | 'annulee'

export type InvoiceLine = { label: string; quantity: number; amount: number; obtained: boolean }

export type Invoice = {
  pharmacyName: string
  pharmacyId?: string
  amount: number
  date: string
  lines: InvoiceLine[]
  photo?: string
}

export type Mission = {
  id: string // MIS-XXXXXX
  prescriptionId: string
  profileId: string
  patientName: string
  deliveryAddress: string
  deliveryPosition: LatLng
  createdAt: string
  status: MissionStatus
  agentId?: string
  pharmacyId?: string
  estimate: { medications: number; service: number; delivery: number; total: number }
  invoice?: Invoice
  priceDecision?: 'accepte' | 'refuse'
  partial: boolean
  unavailableNote?: string
  otp: string
  agentPosition?: LatLng
  eta?: number // minutes
  timeline: { at: string; status: MissionStatus | 'info'; label: string }[]
  rating?: Rating
  paymentMethod: string
}

export type Rating = {
  agent: { ponctualite: number; courtoisie: number; respect: number }
  service: { rapidite: number; qualite: number }
  comment?: string
}

export type Agent = {
  id: string
  name: string
  phone: string
  photo: string // initiales
  zone: string
  vehicle: 'moto' | 'voiture' | 'velo' | 'a_pied'
  position: LatLng
  available: boolean
  activeMissions: number
  rating: number
  completed: number
  earnings: number
}

export type FamilyProfile = {
  id: string
  name: string
  relation: 'moi' | 'enfant' | 'parent' | 'conjoint' | 'autre'
  birthYear?: number
  consent: boolean
  /** Proche autorisé à gérer le profil (Espace senior). */
  caregiver?: string
}

export type Treatment = {
  id: string
  profileId: string
  medication: string
  dose: string
  times: string[] // "08:00"
  startDate: string
  durationDays: number
  takenLog: string[] // ISO date+time pris
}

export type VigilanceReport = {
  id: string
  kind: 'avis' | 'pharmacovigilance'
  category: string
  medication: string
  lot?: string
  description: string
  severity?: 'faible' | 'moderee' | 'grave'
  createdAt: string
  status: 'recu' | 'transmis_airp' | 'clos'
  stars?: number
}

export type FraudEvent = {
  id: string
  at: string
  kind:
    | 'doublon_ordonnance'
    | 'ecart_facture'
    | 'localisation_incoherente'
    | 'mission_suspecte'
    | 'compte_suspect'
  severity: 'faible' | 'moyenne' | 'elevee'
  description: string
  ref?: string
  resolved: boolean
}

export type Insurance = {
  id: string
  name: string
  coverage: string
  rate: number // %
  ceiling: number // FCFA / an
  network: string
  services: string[]
}

export type UserInsurance = { insurerId: string; memberNumber: string; holder: string }

export type NewsArticle = {
  id: string
  category: string
  title: string
  excerpt: string
  body?: string
  date: string
  /** Article d'origine (source externe). */
  url?: string
  image?: string
  readMinutes?: number
  emoji?: string
}

export type DrugAlert = {
  id: string
  kind: 'rappel' | 'qualite' | 'falsifie' | 'information' | 'reglementation'
  title: string
  description: string
  medication?: string
  lots?: string[]
  date: string
  source: string
  /** Avis officiel d'origine (document AIRP, page OMS…). */
  url?: string
}

export type HealthPlace = {
  id: string
  kind: 'laboratoire' | 'clinique' | 'centre_sante' | 'urgence' | 'medecin' | 'autre'
  /** Catégorie telle que publiée par la source (ex. « Laboratoire d'analyses médicales »). */
  category?: string
  name: string
  commune: string
  city: string
  address?: string
  position: LatLng
  positionApprox?: boolean
  phone: string
  services: string[]
  open24h: boolean
  hours?: WeeklyHours
  source?: string
  sourceUrl?: string
}
