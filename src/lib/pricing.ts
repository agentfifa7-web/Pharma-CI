import type { LatLng, PrescriptionLine } from '../types'
import { medById } from '../data/medications'
import { distanceKm } from './geo'

/** Seuil au-delà duquel un écart facture/estimation est signalé à l'anti-fraude. */
export const FRAUD_PRICE_GAP = 0.3

/**
 * Estimation des médicaments à partir des prix PUBLIÉS uniquement.
 * Une ligne sans prix connu (non identifiée ou prix non publié) ne reçoit aucun montant inventé :
 * elle compte pour 0 et est signalée dans `unknown` (montant à confirmer par la facture).
 */
export function estimateMedications(lines: PrescriptionLine[]) {
  let total = 0
  let unknown = 0
  let priced = 0
  for (const l of lines) {
    const price = medById(l.medicationId)?.price
    if (price) {
      total += price.amount * Math.max(1, l.quantity)
      priced++
    } else unknown++
  }
  return {
    total,
    unknown,
    priced,
    allConfirmed: lines.length > 0 && lines.every((l) => medById(l.medicationId)?.price?.level === 'confirme'),
  }
}

export const serviceFee = (medications: number) => Math.min(3500, Math.max(1000, Math.round((medications * 0.06) / 50) * 50))

export function deliveryFee(from: LatLng, to: LatLng) {
  const km = distanceKm(from, to)
  return Math.min(5000, 1000 + Math.round((km * 250) / 50) * 50)
}

export function buildEstimate(lines: PrescriptionLine[], nearestPharmacy: LatLng, home: LatLng) {
  const meds = estimateMedications(lines)
  const service = serviceFee(meds.total)
  const delivery = deliveryFee(nearestPharmacy, home)
  return { medications: meds.total, service, delivery, total: meds.total + service + delivery, unknown: meds.unknown, priced: meds.priced, allConfirmed: meds.allConfirmed }
}
