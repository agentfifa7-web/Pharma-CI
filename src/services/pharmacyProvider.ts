import type { Pharmacy } from '../types'
import { PHARMACIES } from '../data/pharmacies'

/**
 * Couche d'accès à l'annuaire des pharmacies.
 *
 * Par défaut : jeu de démonstration local.
 * En production : définir VITE_PHARMACY_API_URL vers un service backend qui agrège les
 * données publiques (ex. https://www.pharmacies-de-garde.ci — liste des pharmacies et tours
 * de garde par commune) et les normalise au format `Pharmacy`. L'agrégation doit se faire
 * côté serveur (CORS, mise en cache, respect des conditions d'utilisation de la source).
 */
const API = import.meta.env.VITE_PHARMACY_API_URL as string | undefined

export const PHARMACY_SOURCE = API ? 'Annuaire national (API)' : 'Données de démonstration'

export async function fetchPharmacies(): Promise<Pharmacy[]> {
  if (!API) return PHARMACIES
  try {
    const res = await fetch(`${API.replace(/\/$/, '')}/pharmacies`)
    if (!res.ok) throw new Error(String(res.status))
    return (await res.json()) as Pharmacy[]
  } catch (e) {
    console.warn('[PHARMA CI] API pharmacies indisponible, repli sur les données locales', e)
    return PHARMACIES
  }
}

export const pharmacyById = (id?: string) => PHARMACIES.find((p) => p.id === id)
