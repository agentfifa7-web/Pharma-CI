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

/** Frais de service PHARMA CI : forfait unique. */
export const SERVICE_FEE = 200
export const serviceFee = (_medications: number) => SERVICE_FEE

/** Livraison (pharmacie → patient) : 500 FCFA sous 3 km, 1 000 FCFA de 3 à 6 km, 1 500 FCFA au-delà. */
export function deliveryFee(from: LatLng, to: LatLng) {
  const km = distanceKm(from, to)
  return km < 3 ? 500 : km <= 6 ? 1000 : 1500
}

export function buildEstimate(lines: PrescriptionLine[], nearestPharmacy: LatLng, home: LatLng) {
  const meds = estimateMedications(lines)
  const service = serviceFee(meds.total)
  const delivery = deliveryFee(nearestPharmacy, home)
  return { medications: meds.total, service, delivery, total: meds.total + service + delivery, unknown: meds.unknown, priced: meds.priced, allConfirmed: meds.allConfirmed }
}
