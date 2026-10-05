import type { LatLng } from '../types'

/** Centre d'Abidjan (Plateau) — position par défaut si la géolocalisation est refusée. */
export const ABIDJAN: LatLng = { lat: 5.3364, lng: -4.0267 }

export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`)

/** Temps de trajet estimé en ville (minutes) selon le moyen de déplacement. */
export function travelMinutes(km: number, vehicle: 'moto' | 'voiture' | 'velo' | 'a_pied' = 'moto') {
  const speed = { moto: 22, voiture: 18, velo: 12, a_pied: 4.5 }[vehicle]
  return Math.max(3, Math.round((km / speed) * 60))
}

/** Itinéraire vers une pharmacie : recherche par nom si la position n'est qu'approximative. */
export const pharmacyDirectionsUrl = (p: { name: string; commune: string; city: string; position: LatLng; positionApprox?: boolean }) =>
  p.positionApprox
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.commune} ${p.city} Côte d'Ivoire`)}`
    : directionsUrl(p.position)

export const directionsUrl = (to: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`

/** Point intermédiaire entre a et b (t ∈ [0,1]). */
export const lerp = (a: LatLng, b: LatLng, t: number): LatLng => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
})
