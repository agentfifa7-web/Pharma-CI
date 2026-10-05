import type { HealthPlace } from '../types'
import { COMMUNES } from './communes'

/**
 * Autres services de santé — lieux FICTIFS de démonstration.
 * Noms, téléphones et positions sont des exemples, à remplacer par des données vérifiées.
 */

export const HEALTH_KIND: Record<HealthPlace['kind'], { label: string; plural: string; emoji: string; color: string }> = {
  laboratoire: { label: 'Laboratoire', plural: 'Laboratoires', emoji: '🔬', color: '#0284c7' },
  clinique: { label: 'Clinique', plural: 'Cliniques', emoji: '🏥', color: '#7c3aed' },
  centre_sante: { label: 'Centre de santé', plural: 'Centres de santé', emoji: '🩺', color: '#009e60' },
  urgence: { label: 'Urgences', plural: 'Urgences', emoji: '🚑', color: '#dc2626' },
  medecin: { label: 'Médecin', plural: 'Médecins', emoji: '👩🏾‍⚕️', color: '#f77f00' },
}

type Seed = [kind: HealthPlace['kind'], name: string, commune: string, services: string[], open24h: boolean, dLat: number, dLng: number]

const SEEDS: Seed[] = [
  ['laboratoire', 'Laboratoire d\'analyses Riviera (démo)', 'Cocody', ['Bilan sanguin', 'Glycémie', 'Goutte épaisse'], false, 0.004, 0.006],
  ['laboratoire', 'Laboratoire Central Plateau (démo)', 'Plateau', ['Bilan sanguin', 'Analyses d\'urine', 'Sérologies'], false, 0.002, -0.003],
  ['laboratoire', 'Laboratoire de Yopougon (démo)', 'Yopougon', ['Bilan sanguin', 'Goutte épaisse'], false, -0.005, 0.004],
  ['laboratoire', 'Laboratoire de Bouaké Centre (démo)', 'Bouaké', ['Bilan sanguin', 'Glycémie'], false, 0.003, 0.002],
  ['clinique', 'Clinique des Deux-Plateaux (démo)', 'Cocody', ['Consultations', 'Maternité', 'Pédiatrie', 'Hospitalisation'], true, 0.012, -0.004],
  ['clinique', 'Clinique de Marcory (démo)', 'Marcory', ['Consultations', 'Chirurgie', 'Imagerie'], true, -0.003, 0.005],
  ['clinique', 'Clinique Mère-Enfant Abobo (démo)', 'Abobo', ['Maternité', 'Pédiatrie'], false, 0.004, 0.003],
  ['clinique', 'Clinique de Yamoussoukro (démo)', 'Yamoussoukro', ['Consultations', 'Hospitalisation'], true, -0.002, 0.004],
  ['centre_sante', 'Centre de santé communal Adjamé (démo)', 'Adjamé', ['Consultations', 'Vaccination', 'Suivi prénatal'], false, 0.003, 0.002],
  ['centre_sante', 'Centre de santé urbain Koumassi (démo)', 'Koumassi', ['Consultations', 'Vaccination', 'Planning familial'], false, -0.004, -0.002],
  ['centre_sante', 'Centre de santé de Treichville (démo)', 'Treichville', ['Consultations', 'Vaccination'], false, 0.002, 0.003],
  ['centre_sante', 'Centre de santé de Daloa (démo)', 'Daloa', ['Consultations', 'Vaccination', 'Suivi prénatal'], false, 0.003, -0.003],
  ['centre_sante', 'Centre de santé de Korhogo (démo)', 'Korhogo', ['Consultations', 'Vaccination'], false, -0.002, 0.003],
  ['urgence', 'Service d\'urgences Cocody (démo)', 'Cocody', ['Urgences adultes', 'Urgences pédiatriques'], true, -0.006, 0.01],
  ['urgence', 'Urgences de Yopougon (démo)', 'Yopougon', ['Urgences adultes', 'Traumatologie'], true, 0.006, -0.006],
  ['urgence', 'Urgences de Treichville (démo)', 'Treichville', ['Urgences adultes', 'Réanimation'], true, -0.003, -0.004],
  ['urgence', 'Urgences de Bouaké (démo)', 'Bouaké', ['Urgences adultes', 'Urgences pédiatriques'], true, -0.004, -0.003],
  ['urgence', 'Urgences de San-Pédro (démo)', 'San-Pédro', ['Urgences adultes'], true, 0.003, 0.003],
  ['medecin', 'Cabinet de médecine générale Angré (démo)', 'Cocody', ['Médecine générale'], false, 0.025, -0.01],
  ['medecin', 'Cabinet de pédiatrie Bingerville (démo)', 'Bingerville', ['Pédiatrie'], false, 0.002, 0.004],
  ['medecin', 'Cabinet de cardiologie Plateau (démo)', 'Plateau', ['Cardiologie', 'ECG'], false, -0.003, 0.002],
  ['medecin', 'Cabinet médical Port-Bouët (démo)', 'Port-Bouët', ['Médecine générale'], false, 0.003, -0.002],
]

export const HEALTH_PLACES: HealthPlace[] = SEEDS.map(([kind, name, commune, services, open24h, dLat, dLng], i) => {
  const c = COMMUNES.find((x) => x.name === commune) ?? COMMUNES[0]!
  return {
    id: `hs-${String(i + 1).padStart(3, '0')}`,
    kind, name, commune, city: c.city, services, open24h,
    position: { lat: c.center.lat + dLat, lng: c.center.lng + dLng },
    phone: `+225 27 ${String(20 + (i % 10)).padStart(2, '0')} ${String(10 + i * 3).slice(-2)} ${String(40 + i * 7).slice(-2)} 00`,
  }
})

/** Numéros d'urgence en Côte d'Ivoire — à vérifier ; en cas de doute, composez le 185. */
export const EMERGENCY_NUMBERS: { label: string; number: string; description: string; emoji: string }[] = [
  { label: 'SAMU', number: '185', description: 'Urgence médicale : malaise, détresse, accident grave.', emoji: '🚑' },
  { label: 'Sapeurs-pompiers', number: '180', description: 'Incendie, accident, secours à personne.', emoji: '🚒' },
  { label: 'Police secours', number: '170', description: 'Agression, danger, situation de violence.', emoji: '🚓' },
  { label: 'Police (autres lignes)', number: '110', description: 'Numéro alternatif police secours (111 également).', emoji: '👮🏾' },
]
