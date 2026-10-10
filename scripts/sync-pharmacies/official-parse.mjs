/**
 * Sources officielles et libres (fonctions pures, testées dans official.test.mjs) :
 *  - AIRP (Autorité Ivoirienne de Régulation Pharmaceutique) : officines autorisées, médicaments
 *    autorisés (AMM), avis de rappel / arrêt de commercialisation / mise en quarantaine ;
 *  - OpenStreetMap (© contributeurs OpenStreetMap, licence ODbL) : pharmacies et établissements de santé ;
 *  - OMS : alertes produits médicaux ;
 *  - AIP (Agence ivoirienne de presse) et Ordre national des pharmaciens : actualités (titre, extrait, lien).
 */
import { ABIDJAN_COMMUNES, CITIES, strip } from './communes.mjs'
import { matchKey } from './parse.mjs'

export const AIRP_API = 'https://api.airpdigital.com/api'
export const AIRP_STORAGE = 'https://api.airpdigital.com/storage/'
export const OSM_SOURCE = '© contributeurs OpenStreetMap'

/* ---------- Outils ---------- */

const RAD = Math.PI / 180
export function distanceM(a, b) {
  const dLat = (b.lat - a.lat) * RAD
  const dLng = (b.lng - a.lng) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

const tokens = (name) => new Set(strip(name).replace(/\bPHARMACIE\b/g, ' ').split(' ').filter((w) => w.length > 2 && !['DES', 'LES', 'AUX'].includes(w)))

/** Ressemblance de deux noms (0 à 1) : part de mots communs. */
export function nameSimilarity(a, b) {
  if (matchKey(a) && matchKey(a) === matchKey(b)) return 1
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.size || !tb.size) return 0
  let common = 0
  for (const t of ta) if (tb.has(t)) common++
  return common / Math.min(ta.size, tb.size)
}

const decodeHtml = (s = '') =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&rsquo;/g, '’').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

const cut = (s, n) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s)

/** Date « jj-mm-aaaa » de l'AIRP → « aaaa-mm-jj ». */
export const airpDate = (s) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s ?? '')
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined
}

const storageUrl = (path) => (path ? AIRP_STORAGE + path.split('/').map(encodeURIComponent).join('/') : undefined)

/* ---------- Localités ---------- */

const CITY_INDEX = Object.keys(CITIES).map((c) => [strip(c).replace(/ /g, ''), c])

/** Ville AIRP (« SÉGUÉLA », « ABIDJAN ») → ville de l'application, si connue. */
export function resolveAirpCity(city) {
  const n = strip(city ?? '').replace(/ /g, '')
  if (n.startsWith('ABIDJAN')) return 'Abidjan'
  return CITY_INDEX.find(([k]) => k === n)?.[1]
}

/** Commune / ville la plus proche d'un point (pour les fiches OpenStreetMap). */
export function nearestPlace(position) {
  let best
  for (const [commune, [lat, lng]] of Object.entries(ABIDJAN_COMMUNES)) {
    const d = distanceM(position, { lat, lng })
    if (!best || d < best.d) best = { d, city: 'Abidjan', commune }
  }
  for (const [city, [lat, lng]] of Object.entries(CITIES)) {
    const d = distanceM(position, { lat, lng })
    if (!best || d < best.d) best = { d, city, commune: city }
  }
  // Au-delà de 25 km, le rattachement n'a pas de sens : on garde la ville la plus proche mais on la signale.
  return best && best.d < 25000 ? best : best && { ...best, far: true }
}

const regionOf = (city) => (city === 'Abidjan' ? "District autonome d'Abidjan" : city)

/* ---------- AIRP : officines autorisées ---------- */

/**
 * Marque les pharmacies de l'annuaire qui figurent sur la liste des officines autorisées de l'AIRP
 * (même nom, même ville). Le nom du titulaire n'est pas repris (donnée personnelle inutile ici).
 * Retourne les officines AIRP non retrouvées.
 */
export function markAuthorized(pharmacies, officines) {
  const byKey = new Map()
  for (const o of officines) {
    const k = matchKey(o.pharmacy_name ?? '')
    if (!k) continue
    byKey.set(k, [...(byKey.get(k) ?? []), o])
  }
  const used = new Set()
  for (const p of pharmacies) {
    const candidates = byKey.get(matchKey(p.name)) ?? []
    const o = candidates.find((c) => !used.has(c.id) && (resolveAirpCity(c.city) ?? '') === p.city) ?? (candidates.length === 1 && !used.has(candidates[0].id) && !resolveAirpCity(candidates[0].city) ? candidates[0] : undefined)
    if (!o) continue
    used.add(o.id)
    p.authorized = { source: 'AIRP', label: 'Officine autorisée (liste AIRP)' }
  }
  return officines.filter((o) => !used.has(o.id))
}

/* ---------- OpenStreetMap ---------- */

const osmPos = (e) => (e.lat != null ? { lat: e.lat, lng: e.lon } : e.center ? { lat: e.center.lat, lng: e.center.lon } : undefined)
const osmUrl = (e) => `https://www.openstreetmap.org/${e.type}/${e.id}`
const osmPhone = (t) => (t.phone ?? t['contact:phone'] ?? '').split(';')[0].trim()
const osmAddress = (t, place) => [t['addr:street'] && [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '), t['addr:suburb'], place.commune].filter(Boolean).join(', ')

/**
 * Complète l'annuaire avec les pharmacies OpenStreetMap :
 *  - pharmacie déjà connue (nom proche à moins de 400 m, ou même nom dans la ville) : on corrige sa
 *    position si elle était approximative et on ajoute le téléphone s'il manquait ;
 *  - sinon : nouvelle fiche, source OpenStreetMap.
 */
export function mergeOsmPharmacies(pharmacies, elements, defaultHours) {
  const added = []
  let improved = 0
  for (const e of elements) {
    const t = e.tags ?? {}
    if (t.amenity !== 'pharmacy' && t.healthcare !== 'pharmacy') continue
    const position = osmPos(e)
    if (!t.name || !position) continue
    const place = nearestPlace(position)
    if (!place || place.far) continue
    const twin = pharmacies.find((p) => {
      const sim = nameSimilarity(p.name, t.name)
      if (sim >= 0.99 && p.city === place.city && (p.positionApprox || distanceM(p.position, position) < 3000)) return true
      return sim >= 0.6 && distanceM(p.position, position) < 400
    })
    if (twin) {
      if (twin.positionApprox) {
        twin.position = position
        delete twin.positionApprox
        twin.positionSource = OSM_SOURCE
        improved++
      }
      if (!twin.phone && osmPhone(t)) twin.phone = osmPhone(t)
      continue
    }
    const p = {
      id: `osm-${e.type[0]}${e.id}`,
      name: /pharmacie/i.test(t.name) ? t.name : `Pharmacie ${t.name}`,
      address: osmAddress(t, place) || place.commune,
      commune: place.commune,
      city: place.city,
      region: regionOf(place.city),
      position,
      phone: osmPhone(t),
      hours: defaultHours,
      hoursApprox: true,
      services: [],
      gardeGroup: -1,
      cmuVerified: false,
      insurances: [],
      deliveryAvailable: true,
      claimed: false,
      source: OSM_SOURCE,
      sourceUrl: osmUrl(e),
    }
    pharmacies.push(p)
    added.push(p)
  }
  return { added, improved }
}

/** Type d'établissement de l'application à partir des étiquettes OpenStreetMap. */
export function osmHealthKind(t) {
  const hc = t.healthcare ?? ''
  const a = t.amenity ?? ''
  if (a === 'pharmacy' || hc === 'pharmacy') return undefined
  if (hc === 'laboratory' || hc === 'sample_collection') return 'laboratoire'
  if (t.emergency === 'yes' && (a === 'hospital' || hc === 'hospital')) return 'urgence'
  if (a === 'hospital' || a === 'clinic' || hc === 'hospital' || hc === 'clinic') return 'clinique'
  if (a === 'doctors' || hc === 'doctor') return 'medecin'
  if (hc === 'centre' || hc === 'birthing_centre' || hc === 'nurse') return 'centre_sante'
  return 'autre'
}

const OSM_CATEGORY = {
  hospital: 'Hôpital', clinic: 'Clinique / centre médical', doctors: 'Cabinet médical', dentist: 'Cabinet dentaire',
  laboratory: "Laboratoire d'analyses", birthing_centre: 'Maternité', nurse: 'Infirmerie', centre: 'Centre de santé',
  optometrist: 'Optique', physiotherapist: 'Kinésithérapie', blood_donation: 'Don du sang',
}

/** Ajoute les établissements de santé OpenStreetMap absents de la liste (nom proche à moins de 300 m). */
export function mergeOsmPlaces(places, elements) {
  const added = []
  for (const e of elements) {
    const t = e.tags ?? {}
    const kind = osmHealthKind(t)
    const position = osmPos(e)
    if (!kind || !t.name || !position) continue
    const place = nearestPlace(position)
    if (!place || place.far) continue
    if (places.some((p) => nameSimilarity(p.name, t.name) >= 0.6 && distanceM(p.position, position) < 300)) continue
    const category = OSM_CATEGORY[t.healthcare] ?? OSM_CATEGORY[t.amenity] ?? 'Établissement de santé'
    const p = {
      id: `osm-${e.type[0]}${e.id}`,
      kind,
      category,
      name: t.name,
      commune: place.commune,
      city: place.city,
      address: osmAddress(t, place) || undefined,
      position,
      phone: osmPhone(t),
      services: [category],
      open24h: t.opening_hours === '24/7',
      source: OSM_SOURCE,
      sourceUrl: osmUrl(e),
    }
    places.push(p)
    added.push(p)
  }
  return added
}

/* ---------- AIRP : médicaments autorisés (AMM) ---------- */

const brandKey = (name) => {
  const words = strip(name).split(' ')
  const brand = words.find((w) => /^[A-Z]{3,}$/.test(w)) ?? ''
  const dose = /(\d+(?:[.,]\d+)?)\s*(MG|G|ML|UI|MCG|µG|%)/.exec(strip(name).replace(/(\d) (MG|G|ML|UI|MCG)\b/g, '$1$2'))
  return `${brand}|${dose ? dose[1].replace(',', '.') + dose[2] : ''}`
}

/** Fiche AMM → champs compacts du fichier medicaments.json. */
export function ammFields(m, today = new Date().toISOString().slice(0, 10)) {
  const until = airpDate(m.expiry_date)
  const out = { a: m.numero_amm, l: m.laboratory_owner ? `${m.laboratory_owner}${m.country_owner ? ` (${m.country_owner})` : ''}` : undefined }
  if (until) out.x = until
  if (until && until < today) out.xo = 1
  const notice = storageUrl(m.notice)
  const rcp = storageUrl(m.rcp)
  if (notice) out.o = notice
  if (rcp) out.r = rcp
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k]
  return out
}

/**
 * Complète la base PHARMA MED avec la liste des médicaments autorisés de l'AIRP :
 *  - médicament déjà connu (même marque et même dosage, rapprochement unique) : n° d'AMM, laboratoire,
 *    notice et RCP officiels ;
 *  - sinon, si l'AMM est en cours de validité : nouvelle fiche (sans prix), identifiée par son n° d'AMM.
 */
export function mergeAirpMedications(rows, amm, today) {
  const index = new Map()
  for (const r of rows) {
    const k = brandKey(r.n)
    index.set(k, index.has(k) ? null : r) // null : plusieurs candidats, rapprochement ambigu
  }
  // Une même clé (marque + dosage) portée par plusieurs AMM (génériques, présentations) : pas de rapprochement.
  const ammCount = new Map()
  for (const m of amm) if (m.denomination) ammCount.set(brandKey(m.denomination), (ammCount.get(brandKey(m.denomination)) ?? 0) + 1)
  let enriched = 0
  const added = []
  const seen = new Set()
  for (const m of amm) {
    if (!m.numero_amm || !m.denomination || seen.has(m.numero_amm)) continue
    seen.add(m.numero_amm)
    const fields = ammFields(m, today)
    const key = brandKey(m.denomination)
    const r = ammCount.get(key) === 1 ? index.get(key) : index.has(key) ? null : undefined
    if (r === null) continue // marque connue mais rapprochement ambigu : ni enrichie, ni ajoutée en double
    if (r) {
      if (r.a) continue // déjà rapproché d'une autre AMM
      Object.assign(r, fields)
      if (!r.d && m.dci) r.d = m.dci
      enriched++
      continue
    }
    if (fields.xo) continue // AMM expirée : on n'ajoute pas un produit dont l'autorisation n'est plus valable
    const row = { i: `amm-${strip(m.numero_amm).replace(/ /g, '-').toLowerCase()}`, n: m.denomination.trim(), ...fields, z: 1 }
    if (m.dci) row.d = m.dci.trim()
    added.push(row)
  }
  rows.push(...added)
  return { enriched, added: added.length }
}

/* ---------- Alertes ---------- */

const AIRP_GROUP_KIND = { 'rappels-de-lots': 'rappel', 'mise-en-quarantaine': 'qualite', 'arrets-de-commercialisation': 'information' }

/** Avis AIRP (rappels de lots, mises en quarantaine, arrêts de commercialisation) → alertes. */
export function airpAlerts(docs) {
  return docs
    .filter((d) => d.title && d.group && AIRP_GROUP_KIND[d.group.slug])
    .map((d) => ({
      id: `airp-${d.id}`,
      kind: AIRP_GROUP_KIND[d.group.slug],
      title: d.title.trim(),
      description: `${d.group.name} — avis officiel publié par l'AIRP. Consultez le document pour les lots et produits concernés.`,
      date: (d.is_published_at ?? d.created_at ?? '').slice(0, 10),
      source: 'AIRP — Autorité Ivoirienne de Régulation Pharmaceutique',
      url: storageUrl(d.filename),
    }))
}

/** Liste des alertes produits médicaux de l'OMS (page « full list of WHO medical product alerts »). */
export function parseWhoAlerts(html, sinceIso) {
  const out = []
  const seen = new Set()
  const re = /<a[^>]+href="(\/news\/item\/([0-9]{2})-([0-9]{2})-([0-9]{4})-medical-product-alert[^"]*)"[^>]*>([\s\S]*?)<\/a>/g
  for (const m of html.matchAll(re)) {
    const [, path, dd, mm, yyyy, inner] = m
    const date = `${yyyy}-${mm}-${dd}`
    if (sinceIso && date < sinceIso) continue
    if (seen.has(path)) continue
    seen.add(path)
    const text = decodeHtml(inner)
    const t = /Alert\s+N\S*\s*([0-9]+\/[0-9]{4})\s*:?\s*(.*)$/i.exec(text)
    const num = t?.[1]
    let product = (t?.[2] ?? text).trim()
    let kind = 'qualite'
    let what = 'produit médical non conforme'
    if (/^falsified\s+/i.test(product)) {
      kind = 'falsifie'
      what = 'produit médical falsifié'
      product = product.replace(/^falsified\s+/i, '')
    } else if (/^substandard\s+/i.test(product)) {
      product = product.replace(/^substandard\s+(and\s+falsified\s+)?/i, '')
    }
    out.push({
      id: `oms-${path.split('/').pop()}`,
      kind,
      title: `Alerte OMS${num ? ` n° ${num}` : ''} : ${product}`,
      description: `L'Organisation mondiale de la santé signale un ${what} (${product}). Vérifiez le nom, le lot et l'emballage ; en cas de doute, demandez à votre pharmacien.`,
      date,
      source: 'OMS — alertes produits médicaux',
      url: `https://www.who.int${path}`,
    })
  }
  return out
}

/* ---------- Actualités (flux RSS WordPress) ---------- */

/** Articles d'un flux RSS : titre, court extrait et lien vers l'article d'origine (rien n'est recopié en entier). */
export function parseRss(xml, { prefix, category, emoji, filter } = {}) {
  const out = []
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const get = (tag) => decodeHtml((new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(item) ?? [])[1] ?? '')
    const title = get('title')
    const url = get('link')
    const date = new Date(get('pubDate'))
    if (!title || !url || Number.isNaN(date.getTime())) continue
    const excerpt = cut(get('description').replace(/\s*(The post|L’article|L'article) .*$/, ''), 280)
    const categories = [...item.matchAll(/<category>([\s\S]*?)<\/category>/g)].map((c) => decodeHtml(c[1]))
    if (filter && !filter({ title, excerpt, categories })) continue
    const image = /<media:content[^>]+url="([^"]+)"/.exec(item)?.[1] ?? /<enclosure[^>]+url="([^"]+)"/.exec(item)?.[1]
    const guid = get('guid') || url
    out.push({
      id: `${prefix}-${(/[?&]p=(\d+)/.exec(guid)?.[1] ?? strip(url).replace(/ /g, '-').toLowerCase().slice(-40))}`,
      title: title.replace(/^Côte d[’']Ivoire-AIP\s*\/\s*/i, ''),
      excerpt,
      date: date.toISOString(),
      url,
      category,
      ...(emoji ? { emoji } : {}),
      ...(image ? { image } : {}),
    })
  }
  return out
}
