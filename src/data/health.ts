import type { HealthPlace } from '../types'

export const HEALTH_KIND: Record<HealthPlace['kind'], { label: string; plural: string; emoji: string; color: string }> = {
  laboratoire: { label: 'Laboratoire', plural: 'Laboratoires', emoji: '🔬', color: '#0284c7' },
  clinique: { label: 'Clinique / hôpital', plural: 'Cliniques & hôpitaux', emoji: '🏥', color: '#7c3aed' },
  centre_sante: { label: 'Centre de santé', plural: 'Centres de santé', emoji: '🩺', color: '#009e60' },
  urgence: { label: 'Urgences', plural: 'Urgences', emoji: '🚑', color: '#dc2626' },
  medecin: { label: 'Médecin / spécialiste', plural: 'Médecins & spécialistes', emoji: '👩🏾‍⚕️', color: '#f77f00' },
  autre: { label: 'Autre', plural: 'Autres (optique, dentaire…)', emoji: '🏷️', color: '#64748b' },
}

/**
 * Établissements de santé (hors pharmacies) — alimentés au démarrage par /data/etablissements.json,
 * produit par scripts/sync-pharmacies depuis l'annuaire public de pharmacies-de-garde.ci.
 */
export const HEALTH_PLACES: HealthPlace[] = []

export function replaceHealthPlaces(list: HealthPlace[]) {
  HEALTH_PLACES.splice(0, HEALTH_PLACES.length, ...list)
}

export const EMERGENCY_NUMBERS: { label: string; number: string; description: string; emoji: string }[] = [
  { label: 'SAMU', number: '185', description: 'Urgence médicale : malaise, détresse, accident grave.', emoji: '🚑' },
  { label: 'Sapeurs-pompiers', number: '180', description: 'Incendie, accident, secours à personne.', emoji: '🚒' },
  { label: 'Police secours', number: '170', description: 'Agression, danger, situation de violence.', emoji: '🚓' },
  { label: 'Police (autres lignes)', number: '110', description: 'Numéro alternatif police secours (111 également).', emoji: '👮🏾' },
]
