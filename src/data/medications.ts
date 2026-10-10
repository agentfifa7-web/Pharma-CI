import type { Medication } from '../types'

/**
 * Base PHARMA MED — alimentée au démarrage par /data/medicaments.json, produit par
 * scripts/sync-pharmacies à partir des listes publiques de pharmacies-de-garde.ci :
 *  - « Prix des médicaments en pharmacie en Côte d'Ivoire » (code, nom, groupe, prix) ;
 *  - « Liste des médicaments pris en charge par la CMU » (nom, prix, DCI, classe, présentation).
 *  - liste des médicaments autorisés de l'AIRP (n° d'AMM, laboratoire, notice, RCP), ajoutée par
 *    scripts/sync-pharmacies/official.mjs.
 * Aucune donnée n'est inventée : les champs absents des sources restent vides.
 */
export const MEDICATIONS: Medication[] = []

export const MEDICATION_META: { loaded: boolean; generatedAt?: string; prixUpdatedAt?: string; cmuUpdatedAt?: string; prixUrl?: string; cmuUrl?: string; ammUpdatedAt?: string; ammUrl?: string } = { loaded: false }

// a : n° d'AMM, l : laboratoire titulaire, x : fin de validité de l'AMM (xo : dépassée), o : notice, r : RCP, z : fiche AIRP seule
type Row = { i: string; c?: string; n: string; d?: string; g?: string; f?: string; t?: string; p?: number; s?: 'p' | 'c'; k?: 1; e?: string[]; v?: string[]; a?: string; l?: string; x?: string; xo?: 1; o?: string; r?: string; z?: 1 }
type Payload = {
  generatedAt: string
  sources: { prix: { url: string; modified?: string }; cmu: { url: string; modified?: string }; amm?: { url: string; modified?: string } }
  medications: Row[]
}

export function replaceMedications(data: Payload) {
  const prixDate = (data.sources.prix.modified ?? data.generatedAt).slice(0, 10)
  const cmuDate = (data.sources.cmu.modified ?? data.generatedAt).slice(0, 10)
  const cmuIn = { status: 'pris_en_charge' as const, source: 'Liste CMU publique', sourceUrl: data.sources.cmu.url, updatedAt: cmuDate }
  const cmuOut = {
    status: 'a_verifier' as const,
    conditions: "Absent de la liste CMU publiée par la source : vérifiez auprès de votre pharmacien ou de la CNAM.",
    source: 'Liste CMU publique',
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
        ? { amount: r.p, level: 'communique', updatedAt: cmuDate, source: 'Liste CMU publique', sourceUrl: data.sources.cmu.url }
        : { amount: r.p, level: 'communique', updatedAt: prixDate, source: 'Liste publique des prix des médicaments en pharmacie', sourceUrl: data.sources.prix.url }
      : undefined,
    lab: r.l,
    regulatoryStatus: r.a ? ammStatus(r) : undefined,
    leafletUrl: r.o,
    rcpUrl: r.r,
    fromAmm: r.z === 1,
    equivalents: r.e ?? [],
    cmuCandidates: r.v,
    lots: [],
  }))
  MEDICATIONS.splice(0, MEDICATIONS.length, ...list)
  BY_ID.clear()
  for (const m of list) BY_ID.set(m.id, m)
  Object.assign(MEDICATION_META, { loaded: true, generatedAt: data.generatedAt, prixUpdatedAt: prixDate, cmuUpdatedAt: cmuDate, prixUrl: data.sources.prix.url, cmuUrl: data.sources.cmu.url, ammUpdatedAt: data.sources.amm?.modified?.slice(0, 10), ammUrl: data.sources.amm?.url })
}

const frDate = (iso: string) => iso.split('-').reverse().join('/')
/** « AMM n° E-2022-1 (AIRP), valable jusqu'au 01/01/2027 » ; une date dépassée est signalée sans conclure. */
function ammStatus(r: Row) {
  const base = `AMM n° ${r.a} (AIRP)`
  if (!r.x) return base
  return r.xo ? `${base}, échéance du ${frDate(r.x)} dépassée : renouvellement à vérifier auprès de l'AIRP` : `${base}, valable jusqu'au ${frDate(r.x)}`
}

const BY_ID = new Map<string, Medication>()
export const medById = (id?: string) => (id ? BY_ID.get(id) : undefined)

/** Libellé court : nom commercial sans le conditionnement (ex. « B/30 »). */
export const medShortName = (m: Medication) => m.brand.replace(/\s+(B|BTE|BT|FL|T|TUBE|PLAQUETTE)\s*\/.*$/i, '').trim()
