import type { Pharmacy } from '../types'
import { CITIES, COMMUNES } from './communes'
import { PHARMACY_META, type PharmacyMeta } from './pharmacyMeta'

export { PHARMACY_META }

/**
 * Annuaire des pharmacies — alimenté au démarrage par /data/pharmacies.json, produit par
 * scripts/sync-pharmacies à partir de https://www.pharmacies-de-garde.ci (aucune donnée fictive).
 */
export const PHARMACIES: Pharmacy[] = []

/**
 * Remplace (sur place) l'annuaire par les données synchronisées,
 * pour que tous les modules qui importent PHARMACIES / COMMUNES / CITIES les voient.
 */
export function replacePharmacies(list: Pharmacy[], meta: Omit<PharmacyMeta, 'live'>) {
  PHARMACIES.splice(0, PHARMACIES.length, ...list)
  Object.assign(PHARMACY_META, { live: true }, meta)
  const groups = new Map<string, Pharmacy[]>()
  for (const p of list) {
    const k = `${p.city}|${p.commune}`
    groups.set(k, [...(groups.get(k) ?? []), p])
  }
  for (const [k, ps] of groups) {
    const [city, name] = k.split('|') as [string, string]
    if (!CITIES.includes(city)) CITIES.push(city)
    if (COMMUNES.some((c) => c.name === name && c.city === city)) continue
    const lat = ps.reduce((s, p) => s + p.position.lat, 0) / ps.length
    const lng = ps.reduce((s, p) => s + p.position.lng, 0) / ps.length
    // population inconnue (0) : la commune est exclue des calculs de couverture
    COMMUNES.push({ name, city, region: ps[0]!.region, center: { lat, lng }, population: 0 })
  }
}
