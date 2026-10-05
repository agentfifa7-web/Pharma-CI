// Métadonnées de l'annuaire chargé (module sans dépendance pour éviter les imports circulaires).
export type PharmacyMeta = {
  live: boolean
  label: string
  generatedAt?: string
  garde?: { start: string; end: string; label: string }
}

export const PHARMACY_META: PharmacyMeta = { live: false, label: 'Données de démonstration' }
