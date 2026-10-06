import type { MedImage, Medication } from '../types'

/**
 * Base PHARMA MED — alimentée au démarrage par /data/medicaments.json, produit par
 * scripts/sync-pharmacies à partir des listes publiques de pharmacies-de-garde.ci :
 *  - « Prix des médicaments en pharmacie en Côte d'Ivoire » (code, nom, groupe, prix) ;
 *  - « Liste des médicaments pris en charge par la CMU » (nom, prix, DCI, classe, présentation).
 * Aucune donnée n'est inventée : les champs absents des sources restent vides.
 */
export const MEDICATIONS: Medication[] = []

export const MEDICATION_META: { loaded: boolean; generatedAt?: string; prixUpdatedAt?: string; cmuUpdatedAt?: string; prixUrl?: string; cmuUrl?: string } = { loaded: false }

type Row = { i: string; c?: string; n: string; d?: string; g?: string; f?: string; t?: string; p?: number; s?: 'p' | 'c'; k?: 1; e?: string[]; v?: string[] }
type Payload = {
  generatedAt: string
  sources: { prix: { url: string; modified?: string }; cmu: { url: string; modified?: string } }
  medications: Row[]
}

export function replaceMedications(data: Payload) {
  const prixDate = (data.sources.prix.modified ?? data.generatedAt).slice(0, 10)
  const cmuDate = (data.sources.cmu.modified ?? data.generatedAt).slice(0, 10)
  const cmuIn = { status: 'pris_en_charge' as const, source: 'Liste CMU publiée sur pharmacies-de-garde.ci', sourceUrl: data.sources.cmu.url, updatedAt: cmuDate }
  const cmuOut = {
    status: 'a_verifier' as const,
    conditions: "Absent de la liste CMU publiée par la source : vérifiez auprès de votre pharmacien ou de la CNAM.",
    source: 'Liste CMU publiée sur pharmacies-de-garde.ci',
    sourceUrl: data.sources.cmu.url,
    updatedAt: cmuDate,
  }
  const list: Medication[] = data.medications.map((r) => ({
    id: r.i,
    code: r.c,
    brand: r.n,
    dci: r.d,
    dosage: r.g,
    form: r.f,
    therapeuticClass: r.t,
    cmu: r.k ? cmuIn : cmuOut,
    price: r.p
      ? r.s === 'c'
        ? { amount: r.p, level: 'communique', updatedAt: cmuDate, source: 'Liste CMU — pharmacies-de-garde.ci', sourceUrl: data.sources.cmu.url }
        : { amount: r.p, level: 'communique', updatedAt: prixDate, source: 'Prix des médicaments en pharmacie — pharmacies-de-garde.ci', sourceUrl: data.sources.prix.url }
      : undefined,
    equivalents: r.e ?? [],
    cmuCandidates: r.v,
    lots: [],
  }))
  MEDICATIONS.splice(0, MEDICATIONS.length, ...list)
  BY_ID.clear()
  for (const m of list) BY_ID.set(m.id, m)
  Object.assign(MEDICATION_META, { loaded: true, generatedAt: data.generatedAt, prixUpdatedAt: prixDate, cmuUpdatedAt: cmuDate, prixUrl: data.sources.prix.url, cmuUrl: data.sources.cmu.url })
}

const BY_ID = new Map<string, Medication>()
export const medById = (id?: string) => (id ? BY_ID.get(id) : undefined)

/** Libellé court : nom commercial sans le conditionnement (ex. « B/30 »). */
export const medShortName = (m: Medication) => m.brand.replace(/\s+(B|BTE|BT|FL|T|TUBE|PLAQUETTE)\s*\/.*$/i, '').trim()

/* ---------- Illustrations (public/data/medicaments-images.json) ---------- */

const IMAGES = new Map<string, MedImage>()
let IMAGE_KEYS: string[] = []
/** Même normalisation que dciKey() dans scripts/sync-pharmacies/images.mjs. */
const dciKey = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

export function replaceMedImages(data: { images: Record<string, MedImage | { dci: string; none: true }> }) {
  IMAGES.clear()
  for (const [key, e] of Object.entries(data.images ?? {})) if (!('none' in e)) IMAGES.set(key, e)
  IMAGE_KEYS = [...IMAGES.keys()].sort((a, b) => b.length - a.length)
}

/**
 * Illustration de la substance active : par la DCI publiée, sinon quand le nom commercial
 * commence par une DCI connue (génériques, ex. « PARACETAMOL 500MG CP »).
 */
export function medImage(m: Medication): MedImage | undefined {
  if (m.dci) return IMAGES.get(dciKey(m.dci))
  const name = dciKey(m.brand)
  const key = IMAGE_KEYS.find((k) => name === k || name.startsWith(`${k} `))
  return key ? IMAGES.get(key) : undefined
}
