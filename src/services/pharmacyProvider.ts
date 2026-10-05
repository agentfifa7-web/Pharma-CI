import type { Pharmacy } from '../types'
import type { HealthPlace, NewsArticle } from '../types'
import { PHARMACIES, PHARMACY_META, replacePharmacies } from '../data/pharmacies'
import { replaceMedications } from '../data/medications'
import { replaceHealthPlaces } from '../data/health'
import { replaceNews } from '../data/news'

/**
 * Couche d'accès à l'annuaire des pharmacies.
 *
 * Ordre de priorité :
 *  1. VITE_PHARMACY_API_URL (backend dédié, si configuré) ;
 *  2. /data/pharmacies.json, produit chaque semaine par scripts/sync-pharmacies
 *     à partir de https://www.pharmacies-de-garde.ci (GitHub Actions) ;
 *  Aucune donnée de démonstration : si un fichier manque, le module concerné reste vide.
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
    console.warn('[PHARMA CI] Annuaire synchronisé indisponible.', e)
  } finally {
    clearTimeout(t)
  }
}

const base = () => import.meta.env.BASE_URL

async function getJson<T>(name: string, timeoutMs: number): Promise<T | undefined> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${base()}data/${name}`, { signal: ctrl.signal, cache: 'no-cache' })
    if (!res.ok) throw new Error(String(res.status))
    return (await res.json()) as T
  } catch (e) {
    console.warn(`[PHARMA CI] ${name} indisponible.`, e)
    return undefined
  } finally {
    clearTimeout(t)
  }
}

/** Charge toutes les données synchronisées (pharmacies, médicaments, établissements, actualités). */
export async function loadAllData(timeoutMs = 15000) {
  await Promise.all([
    loadPharmacies(timeoutMs),
    getJson<Parameters<typeof replaceMedications>[0]>('medicaments.json', timeoutMs).then((d) => d && replaceMedications(d)),
    getJson<{ places: HealthPlace[] }>('etablissements.json', timeoutMs).then((d) => d && replaceHealthPlaces(d.places)),
    getJson<{ articles: (Omit<NewsArticle, 'url'> & { url: string })[] }>('actualites.json', timeoutMs).then((d) => d && replaceNews(d.articles)),
  ])
}

export const pharmacySourceLabel = () =>
  PHARMACY_META.live
    ? `${PHARMACY_META.label}${PHARMACY_META.generatedAt ? ` (mise à jour du ${new Date(PHARMACY_META.generatedAt).toLocaleDateString('fr-FR')})` : ''}`
    : 'Annuaire non chargé'

export const pharmacyById = (id?: string) => PHARMACIES.find((p) => p.id === id)
