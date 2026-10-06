// Images d'illustration des médicaments : Wikidata (molécule) → Wikimedia Commons (fichier sous licence libre).
//
// Une image par DCI (substance active), jamais par marque : les photos de boîtes commerciales sont
// protégées par le droit d'auteur et les marques. L'image illustre donc la molécule (photo de
// comprimés, modèle 3D ou formule chimique), pas forcément la boîte vendue en Côte d'Ivoire.
// Seules les licences libres sont retenues (domaine public, CC0, CC BY, CC BY-SA), avec l'auteur
// et la licence pour l'affichage du crédit exigé par ces licences.
import { strip } from './communes.mjs'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
/** Durée avant de revérifier une DCI déjà traitée (trouvée ou non). */
export const REFRESH_DAYS = 30
const THUMB_WIDTH = 400

/** Propriétés Wikidata prouvant qu'il s'agit bien d'une substance (CAS, PubChem, DCI OMS, UNII, ChEMBL, DrugBank, code ATC). */
const DRUG_PROPS = ['P231', 'P662', 'P2275', 'P652', 'P592', 'P715', 'P267']

/** Clé de rapprochement d'une DCI (majuscules, sans accents ni ponctuation). */
export const dciKey = (s) => strip(s ?? '')

/** Requêtes de recherche à essayer pour une DCI : nom français, puis forme anglaise (amoxicilline → amoxicillin). */
export function searchQueries(dci) {
  const fr = dciKey(dci).toLowerCase()
  const qs = [{ q: fr, lang: 'fr' }, { q: fr, lang: 'en' }]
  if (fr.endsWith('e')) qs.push({ q: fr.slice(0, -1), lang: 'en' })
  return qs
}

/** Résultats de wbsearchentities dont le libellé (ou alias) correspond exactement à la requête. */
export function exactMatches(search, query) {
  const k = dciKey(query)
  return (search ?? []).filter((r) => dciKey(r.match?.text ?? r.label) === k).map((r) => r.id)
}

const claimValue = (entity, prop) => entity?.claims?.[prop]?.find((c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue)?.mainsnak.datavalue.value

/** Choisit le fichier Commons d'une entité Wikidata : photo (P18) sinon formule chimique (P117). */
export function pickFile(entity) {
  if (!entity || !DRUG_PROPS.some((p) => entity.claims?.[p]?.length)) return undefined
  const photo = claimValue(entity, 'P18')
  if (photo) return { file: photo, kind: 'photo' }
  const structure = claimValue(entity, 'P117')
  if (structure) return { file: structure, kind: 'structure' }
  return undefined
}

/** Licence libre acceptée ? (domaine public, CC0, CC BY, CC BY-SA — pas de clause NC ni ND). */
export function isFreeLicense(name = '') {
  const n = name.trim().toLowerCase()
  if (/\b(nc|nd)\b/.test(n)) return false
  return /^(public domain|pd\b|pd-|cc0|cc[- ]by(-sa)?([- ]\d(\.\d)?)?)/.test(n)
}

const textOf = (html = '') =>
  html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

/** Entrée d'image à partir de la réponse imageinfo de Commons (undefined si licence non libre). */
export function toImageEntry(page, kind) {
  const info = page?.imageinfo?.[0]
  if (!info) return undefined
  const meta = info.extmetadata ?? {}
  const license = textOf(meta.LicenseShortName?.value)
  if (!isFreeLicense(license)) return undefined
  const credit = textOf(meta.Artist?.value) || textOf(meta.Credit?.value) || 'Auteur indiqué sur Wikimedia Commons'
  return {
    src: info.thumburl ?? info.url,
    page: info.descriptionurl,
    credit: credit.length > 120 ? `${credit.slice(0, 117)}…` : credit,
    license,
    licenseUrl: meta.LicenseUrl?.value || undefined,
    kind,
  }
}

const isFresh = (entry, now) => entry?.checkedAt && now - Date.parse(entry.checkedAt) < REFRESH_DAYS * 86400e3

/**
 * Cherche une image libre pour chaque DCI. `previous` = images déjà connues (réutilisées tant qu'elles
 * ont moins de REFRESH_DAYS jours). `get(url)` renvoie le JSON de l'URL.
 * Retour : { [clé DCI]: { dci, src, page, credit, license, licenseUrl, kind, checkedAt } | { dci, none: true, checkedAt } }
 */
export async function findMedImages(dcis, previous, get, { now = Date.now(), log = () => {} } = {}) {
  const out = {}
  let looked = 0
  for (const dci of dcis) {
    const key = dciKey(dci)
    if (!key || out[key]) continue
    if (isFresh(previous?.[key], now)) { out[key] = previous[key]; continue }
    const checkedAt = new Date(now).toISOString()
    // Associations (« SULFADOXINE + PYRIMETHAMINE ») : pas d'illustration unique fiable.
    if (dci.includes('+')) { out[key] = { dci, none: true, checkedAt }; continue }
    looked++
    try {
      out[key] = { dci, ...(await lookup(dci, get)), checkedAt }
    } catch (e) {
      log(`image ${dci} : ${e.message}`)
      out[key] = previous?.[key] ?? { dci, none: true, checkedAt }
    }
  }
  log(`images : ${looked} DCI interrogées, ${Object.values(out).filter((e) => !e.none).length}/${Object.keys(out).length} illustrées`)
  return out
}

async function lookup(dci, get) {
  const tried = new Set()
  for (const { q, lang } of searchQueries(dci)) {
    const search = await get(`${WIKIDATA_API}?action=wbsearchentities&format=json&type=item&limit=7&language=${lang}&uselang=${lang}&search=${encodeURIComponent(q)}`)
    const ids = exactMatches(search.search, q).filter((id) => !tried.has(id))
    if (!ids.length) continue
    ids.forEach((id) => tried.add(id))
    const { entities } = await get(`${WIKIDATA_API}?action=wbgetentities&format=json&props=claims&ids=${ids.join('|')}`)
    for (const id of ids) {
      const picked = pickFile(entities?.[id])
      if (!picked) continue
      const res = await get(`${COMMONS_API}?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${THUMB_WIDTH}&titles=${encodeURIComponent(`File:${picked.file}`)}`)
      const entry = toImageEntry(res.query?.pages?.[0], picked.kind)
      if (entry) return { ...entry, wikidata: `https://www.wikidata.org/wiki/${id}` }
    }
  }
  return { none: true }
}
