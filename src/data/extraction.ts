import type { Medication, PrescriptionLine } from '../types'
import { MEDICATIONS } from './medications'

/**
 * Lecture automatique d'ordonnance — SIMULATION DE DÉMONSTRATION.
 *
 * En production, cette fonction est remplacée par un appel à un service OCR / vision
 * (côté serveur) qui lit le document et renvoie les lignes TELLES QU'ÉCRITES sur l'ordonnance.
 * Le service ne modifie jamais la prescription : il se contente de la transcrire, et le patient
 * vérifie chaque ligne avant confirmation.
 *
 * Ici, on dérive de façon déterministe 2 à 4 médicaments de la base PHARMA MED à partir de
 * l'empreinte SHA-256 du document : un même document donne toujours le même résultat.
 */
export function extractPrescription(fingerprint: string): PrescriptionLine[] {
  const bytes = hexBytes(fingerprint)
  const count = 2 + (bytes[0]! % 3) // 2 à 4 lignes
  const picked: Medication[] = []
  for (let i = 1; i < bytes.length && picked.length < count; i++) {
    const med = MEDICATIONS[bytes[i]! % MEDICATIONS.length]!
    if (!picked.some((m) => m.id === med.id || m.dci === med.dci)) picked.push(med)
  }
  return picked.map((med, i) => {
    const b = bytes[(i * 3 + 7) % bytes.length]!
    const posology = posologyFor(med, b)
    return {
      id: `ln-${fingerprint.slice(i * 4, i * 4 + 6)}-${i}`,
      label: `${shortName(med)} — ${posology}`,
      medicationId: med.id,
      dosage: med.dosage,
      quantity: 1 + (b % 2),
      instructions: posology,
    }
  })
}

const hexBytes = (hex: string) => {
  const out: number[] = []
  for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16) || 0)
  return out.length ? out : [0, 1, 2, 3]
}

const shortName = (m: Medication) => m.brand.replace(/\s*\(générique\)\s*/i, '').trim()

function posologyFor(m: Medication, b: number) {
  const days = [3, 5, 7, 10][b % 4]
  const perDay = 1 + (b % 3)
  const form = m.form.toLowerCase()
  if (form.includes('gélule')) return `1 gélule x${perDay}/jour pendant ${days} jours`
  if (form.includes('comprimé')) return `1 comprimé x${perDay}/jour pendant ${days} jours`
  if (form.includes('sachet') || form.includes('kit')) return `1 sachet/jour pendant ${days} jours`
  if (form.includes('aérosol') || form.includes('inhal') || form.includes('dose')) return '2 bouffées si besoin'
  return `${perDay} prise(s)/jour pendant ${days} jours`
}
