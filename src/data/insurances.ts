import type { Insurance } from '../types'

/** Assureurs FICTIFS de démonstration — à remplacer par les données vérifiées des partenaires. */
export const INSURANCES: Insurance[] = [
  { id: 'ivoire-sante', name: 'Ivoire Santé Assurances', coverage: 'Pharmacie, consultations, hospitalisation', rate: 80, ceiling: 1500000, network: 'Réseau national', services: ['Pharmacie', 'Consultation', 'Hospitalisation', 'Analyses'] },
  { id: 'lagune-assur', name: 'Lagune Assur', coverage: 'Pharmacie et consultations', rate: 70, ceiling: 800000, network: 'Abidjan et grandes villes', services: ['Pharmacie', 'Consultation'] },
  { id: 'baobab-mutuelle', name: 'Mutuelle du Baobab', coverage: 'Pharmacie, maternité', rate: 75, ceiling: 1000000, network: 'Réseau mutualiste', services: ['Pharmacie', 'Maternité', 'Analyses'] },
  { id: 'eburnie-care', name: 'Éburnie Care', coverage: 'Couverture complète famille', rate: 90, ceiling: 3000000, network: 'Réseau premium', services: ['Pharmacie', 'Consultation', 'Hospitalisation', 'Optique', 'Dentaire'] },
  { id: 'mutuelle-fonction', name: 'Mutuelle des Agents Publics (démo)', coverage: 'Complémentaire CMU', rate: 60, ceiling: 600000, network: 'Réseau conventionné', services: ['Pharmacie', 'Consultation'] },
]

export const insurerName = (id: string) => INSURANCES.find((i) => i.id === id)?.name ?? id
