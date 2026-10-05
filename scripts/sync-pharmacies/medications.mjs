// Construction de la base PHARMA MED à partir des deux listes publiques de pharmacies-de-garde.ci.
import { medKey } from './parse.mjs'
import { strip } from './communes.mjs'

export const PRICE_URL = 'https://www.pharmacies-de-garde.ci/prix-des-medicaments-en-pharmacie-en-cote-divoire/'
export const CMU_URL = 'https://www.pharmacies-de-garde.ci/liste-des-medicaments-pris-en-charge-par-la-cmu/'

/** Dosage lisible extrait du libellé commercial (ex. « 500MG », « 2,5 MG/5 ML », « 3% »). */
export function dosageOf(name) {
  const m = name.match(/(\d+(?:[.,]\d+)?\s?(?:MG|G|MCG|µG|UG|ML|UI|%|MUI)(?:\s?\/\s?\d*(?:[.,]\d+)?\s?(?:MG|G|ML|DOSE))?)/i)
  return m ? m[1].replace(/\s+/g, ' ').toUpperCase().replace('UG', 'µG') : undefined
}

const FORMS = [
  [/\b(CPR?|COMP|COMPRIMES?)\b/, 'Comprimé'], [/\b(GELULES?|GLES?)\b/, 'Gélule'],
  [/\bSIROP\b/, 'Sirop'], [/\bSUSP\b/, 'Suspension'], [/\bINJ(ECTABLE)?\b/, 'Injectable'], [/\bCOLLYRE\b/, 'Collyre'],
  [/\bCREME\b/, 'Crème'], [/\bPOMMADE\b/, 'Pommade'], [/\bSUPPO/, 'Suppositoire'], [/\bSACHETS?\b|\bSACH\b/, 'Sachet'],
  [/\bSOL(UTION)?\b/, 'Solution'], [/\bSPRAY\b/, 'Spray'], [/\bOVULES?\b/, 'Ovule'],
]
const formOf = (name) => FORMS.find(([re]) => re.test(strip(name)))?.[1]

const slug = (s) => strip(s).toLowerCase().replace(/ /g, '-').slice(0, 60)

const brandOf = (name) => strip(name).split(' ')[0]

/**
 * Fusionne les deux listes. Format compact (clés courtes) pour limiter la taille du fichier :
 *   i id · c code · n nom commercial · d DCI · g dosage · f forme · t classe/groupe thérapeutique
 *   p prix (FCFA) · s source du prix ('p' liste des prix, 'c' liste CMU) · k 1 = sur la liste CMU
 *   e équivalents (ids) · v produits de la liste CMU portant la même marque (ids)
 */
export function buildMedications(prices, cmu) {
  const cmuByKey = new Map(cmu.items.map((c) => [medKey(c.name), c]))
  const cmuByBrandPrice = new Map()
  for (const c of cmu.items) {
    const k = `${brandOf(c.name)}|${c.price}`
    cmuByBrandPrice.set(k, cmuByBrandPrice.has(k) ? null : c) // null = ambigu
  }
  const matched = new Map() // item CMU -> id du produit fusionné
  const out = []
  const seenIds = new Set()
  const uniq = (id) => { let i = id, n = 2; while (seenIds.has(i)) i = `${id}-${n++}`; seenIds.add(i); return i }

  for (const p of prices.items) {
    let c = cmuByKey.get(medKey(p.name))
    if (!c && p.price) c = cmuByBrandPrice.get(`${brandOf(p.name)}|${p.price}`) ?? undefined
    if (c && matched.has(c)) c = undefined
    const id = uniq(p.code ? `med-${p.code}` : `med-${slug(p.name)}`)
    if (c) matched.set(c, id)
    out.push(clean({
      i: id, c: p.code, n: p.name, d: c?.dci, g: dosageOf(p.name), f: c?.form ?? formOf(p.name), t: p.group ?? c?.therapeuticClass,
      p: p.price ?? c?.price, s: p.price ? 'p' : c?.price ? 'c' : undefined, k: c ? 1 : undefined,
    }))
  }
  for (const c of cmu.items) {
    if (matched.has(c)) continue
    out.push(clean({ i: uniq(`med-cmu-${slug(c.name)}`), n: c.name, d: c.dci, g: dosageOf(c.name), f: c.form ?? formOf(c.name), t: c.therapeuticClass, p: c.price, s: c.price ? 'c' : undefined, k: 1 }))
  }
  // Équivalents : même DCI, même dosage et même forme (DCI connue via la liste CMU).
  const groups = new Map()
  for (const m of out) {
    if (!m.d || !m.g) continue
    const k = `${strip(m.d)}|${strip(m.g)}|${strip(m.f ?? '')}`
    groups.set(k, [...(groups.get(k) ?? []), m])
  }
  for (const g of groups.values()) if (g.length > 1) for (const m of g) m.e = g.filter((x) => x !== m).map((x) => x.i)
  // Produits hors liste CMU : renvoi vers les produits CMU de même marque (sans conclure à une prise en charge).
  const cmuByBrand = new Map()
  for (const m of out) if (m.k) cmuByBrand.set(brandOf(m.n), [...(cmuByBrand.get(brandOf(m.n)) ?? []), m.i])
  for (const m of out) {
    if (m.k) continue
    const b = brandOf(m.n)
    if (b.length > 3 && !GENERIC_WORDS.has(b) && cmuByBrand.has(b)) m.v = cmuByBrand.get(b).slice(0, 6)
  }
  return out
}

const GENERIC_WORDS = new Set(['ACIDE', 'SERUM', 'SOLUTE', 'VITAMINE', 'SIROP', 'CREME', 'POMMADE', 'SOLUTION', 'EAU', 'GEL', 'SPRAY', 'COLLYRE', 'CHLORURE', 'GLUCOSE'])

function clean(o) {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]
  return o
}
