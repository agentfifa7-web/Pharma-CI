import type { Pharmacy, WeeklyHours } from '../types'
import { COMMUNES } from './communes'
import { GARDE_GROUPS } from '../lib/hours'

/**
 * Jeu de données de DÉMONSTRATION.
 * Les noms et coordonnées sont fictifs. En production, l'annuaire est alimenté par
 * src/services/pharmacyProvider.ts (données publiques — ex. pharmacies-de-garde.ci —
 * puis fiches revendiquées par les pharmacies).
 */

const NAMES = [
  'des Lagunes', 'Sainte-Marie', 'du Carrefour', 'de la Paix', 'Les Palmiers', 'de l\'Espoir', 'Saint-Michel',
  'du Marché', 'Les Rosiers', 'de la Riviera', 'Étoile', 'du Boulevard', 'Bel Air', 'Le Baobab', 'de la Gare',
  'Les Flamboyants', 'du Rond-Point', 'Sainte-Famille', 'de l\'Avenir', 'Arc-en-Ciel', 'du Lycée', 'La Grâce',
  'du Centre', 'Les Cocotiers', 'de la Cité', 'Nouvelle', 'de l\'Unité', 'Saint-Joseph', 'du Golfe', 'Les Ambassadeurs',
  'Belle Vue', 'du Port', 'Les Manguiers', 'de la Solidarité', 'Siloé', 'Bon Samaritain', 'de la Concorde', 'Akwaba',
]
const STREETS = ['Boulevard Latrille', 'Rue des Jardins', 'Avenue Principale', 'Carrefour de la Mairie', 'Rue du Commerce',
  'Boulevard de Marseille', 'Rue 12', 'Voie express', 'Près du grand marché', 'Face à l\'église', 'Rue de l\'Hôpital']
const SERVICES = ['Conseil pharmaceutique', 'Prise de tension', 'Test de glycémie', 'Parapharmacie', 'Produits bébé',
  'Orthopédie', 'Matériel médical', 'Test de paludisme (TDR)', 'Vaccination (selon agrément)']
const INSURERS = ['ivoire-sante', 'lagune-assur', 'baobab-mutuelle', 'eburnie-care', 'mutuelle-fonction']

// Générateur pseudo-aléatoire déterministe : les données restent identiques à chaque chargement.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

const STANDARD: WeeklyHours = [null, ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '19:00']]
const EXTENDED: WeeklyHours = [['09:00', '13:00'], ['07:30', '22:00'], ['07:30', '22:00'], ['07:30', '22:00'], ['07:30', '22:00'], ['07:30', '22:00'], ['08:00', '21:00']]
const H24: WeeklyHours = Array.from({ length: 7 }, () => ['00:00', '23:59'] as [string, string])

function build(): Pharmacy[] {
  const r = rng(2026)
  const list: Pharmacy[] = []
  let n = 0
  for (const c of COMMUNES) {
    const count = c.city === 'Abidjan' ? Math.max(3, Math.round(c.population / 160000)) : 3
    for (let i = 0; i < count; i++) {
      const name = `Pharmacie ${NAMES[n % NAMES.length]}${n >= NAMES.length ? ` ${c.name}` : ''}`
      const spread = c.city === 'Abidjan' ? 0.022 : 0.03
      const hoursPick = r()
      list.push({
        id: `ph-${String(n + 1).padStart(3, '0')}`,
        name,
        address: `${STREETS[Math.floor(r() * STREETS.length)]}, ${c.name}`,
        commune: c.name,
        city: c.city,
        region: c.region,
        position: { lat: c.center.lat + (r() - 0.5) * spread, lng: c.center.lng + (r() - 0.5) * spread },
        phone: `+225 27 ${20 + Math.floor(r() * 30)} ${String(Math.floor(r() * 100)).padStart(2, '0')} ${String(Math.floor(r() * 100)).padStart(2, '0')} ${String(Math.floor(r() * 100)).padStart(2, '0')}`,
        hours: hoursPick < 0.06 ? H24 : hoursPick < 0.35 ? EXTENDED : STANDARD,
        services: SERVICES.filter(() => r() < 0.4).slice(0, 5),
        gardeGroup: Math.floor(r() * GARDE_GROUPS),
        cmuVerified: r() < 0.55,
        insurances: INSURERS.filter(() => r() < 0.45),
        deliveryAvailable: c.city === 'Abidjan' || r() < 0.3,
        claimed: r() < 0.15,
        source: 'Données de démonstration',
      })
      n++
    }
  }
  return list
}

export const PHARMACIES: Pharmacy[] = build()
