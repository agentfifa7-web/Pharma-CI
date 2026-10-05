import type { OpenState, Pharmacy } from '../types'

export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
export const GARDE_GROUPS = 4

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h! * 60 + m!
}

/**
 * Semaine de garde : en Côte d'Ivoire les tours de garde sont hebdomadaires
 * (du samedi au samedi suivant). On calcule l'indice de la semaine courante.
 */
export function gardeWeekIndex(now = new Date()) {
  const d = new Date(now)
  // Ramène au samedi précédent (ou aujourd'hui si samedi)
  const back = (d.getDay() + 1) % 7
  d.setDate(d.getDate() - back)
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / (7 * 86400000))
}

export function gardePeriod(now = new Date()) {
  const start = new Date(now)
  start.setDate(start.getDate() - ((start.getDay() + 1) % 7))
  start.setHours(8, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export const isOnGarde = (p: Pharmacy, now = new Date()) => p.gardeGroup === gardeWeekIndex(now) % GARDE_GROUPS

export type OpenInfo = { state: OpenState; label: string; detail: string }

export function openInfo(p: Pharmacy, now = new Date()): OpenInfo {
  if (isOnGarde(p, now)) return { state: 'open', label: 'De garde', detail: 'Ouverte 24h/24 cette semaine' }
  const day = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const today = p.hours[day]
  if (today) {
    const [o, c] = today.map(toMin) as [number, number]
    if (minutes >= o && minutes < c) {
      const left = c - minutes
      return left <= 45
        ? { state: 'open', label: 'Ouverte', detail: `Ferme bientôt (${today[1]})` }
        : { state: 'open', label: 'Ouverte', detail: `Jusqu'à ${today[1]}` }
    }
    if (minutes < o) {
      return o - minutes <= 120
        ? { state: 'soon', label: 'Ouvre bientôt', detail: `Ouvre à ${today[0]}` }
        : { state: 'closed', label: 'Fermée', detail: `Ouvre à ${today[0]}` }
    }
  }
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7
    const h = p.hours[d]
    if (h) return { state: 'closed', label: 'Fermée', detail: `Ouvre ${i === 1 ? 'demain' : DAYS[d]!.toLowerCase()} à ${h[0]}` }
  }
  return { state: 'closed', label: 'Fermée', detail: 'Horaires non communiqués' }
}

export const formatHours = (h: [string, string] | null) => (h ? `${h[0]} – ${h[1]}` : 'Fermé')
