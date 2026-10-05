import type { Pharmacy } from '../types'
import { PHARMACIES, PHARMACY_META, replacePharmacies } from '../data/pharmacies'

/**
 * Couche d'accès à l'annuaire des pharmacies.
 *
 * Ordre de priorité :
 *  1. VITE_PHARMACY_API_URL (backend dédié, si configuré) ;
 *  2. /data/pharmacies.json, produit chaque semaine par scripts/sync-pharmacies
 *     à partir de https://www.pharmacies-de-garde.ci (GitHub Actions) ;
 *  3. jeu de démonstration local.
 */
const API = import.meta.env.VITE_PHARMACY_API_URL as string | undefined

type Payload = { pharmacies: Pharmacy[]; sourceLabel?: string; generatedAt?: string; garde?: { start: string; end: string; label: string } }

export async function loadPharmacies(timeoutMs = 5000) {
  const url = API ? `${API.replace(/\/$/, '')}/pharmacies` : `${import.meta.env.BASE_URL}data/pharmacies.json`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-cache' })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as Payload | Pharmacy[]
    const list = Array.isArray(data) ? data : data.pharmacies
    if (!list?.length) throw new Error('liste vide')
    const meta: Partial<Payload> = Array.isArray(data) ? {} : data
    replacePharmacies(list, { label: meta.sourceLabel ?? 'Annuaire synchronisé', generatedAt: meta.generatedAt, garde: meta.garde })
  } catch (e) {
    console.info('[PHARMA CI] Annuaire synchronisé indisponible, données de démonstration utilisées.', e)
  } finally {
    clearTimeout(t)
  }
}

export const pharmacySourceLabel = () =>
  PHARMACY_META.live
    ? `${PHARMACY_META.label}${PHARMACY_META.generatedAt ? ` (mise à jour du ${new Date(PHARMACY_META.generatedAt).toLocaleDateString('fr-FR')})` : ''}`
    : PHARMACY_META.label

export const pharmacyById = (id?: string) => PHARMACIES.find((p) => p.id === id)
