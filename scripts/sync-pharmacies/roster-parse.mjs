/**
 * Tour de garde mensuel officiel (documents PDF « TOUR DE GARDE DU MOIS DE … » d'Abidjan et des villes
 * de l'intérieur), converti en texte avec `pdftotext -layout`, puis en liste de gardes par semaine.
 *
 * Une semaine de garde va du samedi 8 h au samedi suivant 8 h (heure d'Abidjan = UTC).
 */
import { ABIDJAN_COMMUNES, centerOf, resolveZone, strip, titleCase } from './communes.mjs'
import { distanceM, nameSimilarity } from './official-parse.mjs'
import { matchKey } from './parse.mjs'

const MONTHS = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE']
const PHONE = /\b(?:0[157]|2[157])(?:[ .-]?\d{2}){4}\b/g
const HANDOVER_HOUR = 8

/** « SEMAINE DU SAMEDI 31 OCTOBRE AU VENDREDI 06 NOVEMBRE 2026 » → { start, end, label } */
export function parseWeek(line) {
  const n = strip(line)
  const m = n.match(/SEMAINE DU SAMEDI (\d{1,2})(?: ([A-Z]+))? AU VENDREDI (\d{1,2}) ([A-Z]+) (\d{4})/)
  if (!m) return undefined
  const endMonth = MONTHS.indexOf(m[4])
  const startMonth = m[2] ? MONTHS.indexOf(m[2]) : endMonth
  if (startMonth < 0 || endMonth < 0) return undefined
  const year = Number(m[5])
  const startYear = startMonth > endMonth ? year - 1 : year
  const start = new Date(Date.UTC(startYear, startMonth, Number(m[1]), HANDOVER_HOUR))
  const end = new Date(start.getTime() + 7 * 86400000)
  const label = `Semaine du samedi ${Number(m[1])}${m[2] ? ` ${m[2].toLowerCase()}` : ''} au vendredi ${Number(m[3])} ${m[4].toLowerCase()} ${year}`
  return { start: start.toISOString(), end: end.toISOString(), label }
}

const lead = (s) => s.length - s.trimStart().length
const hasPhone = (s) => new RegExp(PHONE.source).test(s)
const isNoise = (s) => /TOUR DE GARDE|PERMANENCE|^SEMAINE DU/.test(strip(s))

/**
 * Période propre à une sous-section (« SAMEDI 03 AU SAMEDI 10 OCTOBRE 2026 : PHCIE … »,
 * « LUNDI 26 OCTOBRE AU DIMANCHE 01 NOVEMBRE: PHCIE … ») → { start, end, rest } (7 jours à partir de 8 h).
 */
export function parseSubPeriod(line, year) {
  const n = line.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
  const m = n.match(/^(LUNDI|MARDI|MERCREDI|JEUDI|VENDREDI|SAMEDI|DIMANCHE) (\d{1,2})(?: ([A-Z]+))? AU (?:LUNDI|MARDI|MERCREDI|JEUDI|VENDREDI|SAMEDI|DIMANCHE) (\d{1,2}) ([A-Z]+)(?: (\d{4}))?\s*:\s*(.*)$/)
  if (!m) return undefined
  const endMonth = MONTHS.indexOf(m[5])
  const startMonth = m[3] ? MONTHS.indexOf(m[3]) : endMonth
  if (startMonth < 0 || endMonth < 0) return undefined
  const y = Number(m[6] ?? year)
  const start = new Date(Date.UTC(startMonth > endMonth ? y - 1 : y, startMonth, Number(m[2]), HANDOVER_HOUR))
  // Le reste de la ligne (« PHCIE … ») est repris sur le texte d'origine, à la même position.
  const rest = line.trim().slice(line.trim().length - m[7].length)
  return { start: start.toISOString(), end: new Date(start.getTime() + 7 * 86400000).toISOString(), rest }
}

/** Ligne « PHCIE … » + suites → { name, phones, address } */
export function parseEntry(text) {
  const t = text.replace(/\s+/g, ' ').replace(/\s*[–—]\s*/g, ' – ').trim()
  const body = t.replace(/^PHCIE\s*/i, '')
  const cut = body.search(/\s*\/|\s+–\s|\s-\s|\s+(?:M\.|M |MME |MLLE |DR )|\s+TEL\b/)
  let raw = (cut > 0 ? body.slice(0, cut) : body).trim()
  raw = raw.replace(/\((?:NLLE|NVLLE|NOUVELLE|GDE|GRDE|GRANDE|EX[^)]*)\)/gi, '').replace(/\bSARLU?\b/gi, '').replace(/\s+/g, ' ').trim()
  const phones = [...new Set([...t.matchAll(PHONE)].map((m) => m[0].replace(/\D/g, '')).filter((d) => d.length === 10))]
  // Adresse : ce qui suit le dernier numéro de téléphone (ou le nom s'il n'y a pas de numéro).
  let rest = t
  const all = [...t.matchAll(PHONE)]
  if (all.length) rest = t.slice(all.at(-1).index + all.at(-1)[0].length)
  else rest = cut > 0 ? body.slice(cut) : ''
  let address = rest.replace(/\bTEL\.?\s*:?/gi, '').replace(/\s*\/\s*/g, ' / ')
  // Sans numéro reconnu, le reste commence par le titulaire (« M. Yeboue Henri - 32 77 10 56 / … ») : on l'écarte.
  if (!all.length) address = address.replace(/^[\s/–-]*(?:M\.|(?:MME|MLLE|DR)\b)[^–-]*[–-]/i, '')
  // Restes d'anciens numéros à 8 chiffres ou de numéros coupés (« 79 43 / Angle … », « 06 06 99 00 92 »).
  for (let prev; prev !== address; ) {
    prev = address
    address = address.replace(/^[\s/–-]+/, '').replace(/^(?:\d{2}[\s-]+)+\d{2}(?=[\s/]|$)/, '').replace(/^\d{2}\s*(?=\/)/, '')
  }
  address = address.replace(/[\s/–-]+$/, '').trim()
  return { name: raw, phones, address: address.length > 3 && !/^\d+$/.test(address) ? titleCase(address) : undefined }
}

/** Libellé de zone d'Abidjan (« SECTION D'ABOBO », « ABOBO PK 18 », « ALEPE / MONTEZO ») → commune connue, sinon undefined. */
function abidjanCommune(label) {
  const clean = label.replace(/^SECTION\s+(?:DE LA |DE L'|DE L’|D'|D’|DES |DU |DE )?/i, '').replace(/^Secteur\s+\d+/i, '').trim()
  if (!clean) return undefined
  const z = resolveZone(clean, 'abidjan')
  return ABIDJAN_COMMUNES[z.commune] ? { commune: z.commune, quartier: z.quartier } : undefined
}

/** Texte du document d'Abidjan → gardes. */
export function parseAbidjan(text) {
  const out = []
  let week
  let section
  let sub
  let current
  const lines = text.split('\n')
  const flush = () => {
    if (current && week) {
      const e = parseEntry(current.text)
      if (e.name) out.push({ week: week.start, city: 'Abidjan', commune: current.commune, quartier: current.quartier, ...e })
    }
    current = undefined
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\f/g, '')
    const s = line.trim()
    if (!s) continue
    const w = parseWeek(s)
    if (w) { flush(); week = w; continue }
    if (isNoise(s)) { flush(); continue }
    const body = s.replace(/^Secteur\s+\d+\s+/i, '')
    if (/^PHCIE\b/i.test(body)) {
      flush()
      const place = sub ?? section
      current = { text: body, commune: place?.commune ?? 'Abidjan', quartier: place?.quartier }
      continue
    }
    // Titre centré (section ou zone), sans numéro de téléphone.
    if (lead(line) >= 28 && !hasPhone(s) && !/\d{2} \d{2}/.test(s)) {
      flush()
      const c = abidjanCommune(s)
      if (/^SECTION\b/i.test(s)) { section = c; sub = undefined } else sub = c ? { ...c, quartier: c.quartier ?? titleCase(s) } : section && { ...section, quartier: titleCase(s) }
      continue
    }
    // Sous-titre à gauche (« ABOBODOUME/ LOCODJORO », « ALLOKOI PK 23 ») : court, suivi d'une ligne PHCIE.
    const next = (lines.slice(i + 1).find((l) => l.trim()) ?? '').trim().replace(/^Secteur\s+\d+\s+/i, '')
    if (lead(line) < 5 && s.length < 40 && !hasPhone(s) && /^PHCIE\b/i.test(next) && (!current || !lines[i - 1]?.trim())) {
      flush()
      const c = abidjanCommune(s)
      sub = { commune: c?.commune ?? section?.commune ?? 'Abidjan', quartier: titleCase(s.replace(/\s*\/\s*/g, ' / ')) }
      continue
    }
    if (current) current.text += ' ' + s
  }
  flush()
  return out
}

/** « KM 17 / SONGON » → la partie qui désigne une ville ou commune connue (ici Songon). */
function placeOf(label) {
  const parts = label.split('/').map((x) => x.trim()).filter(Boolean)
  for (const part of parts) {
    const z = resolveZone(part)
    if (centerOf(z.city, z.commune)) return z
  }
  return resolveZone(label)
}

/**
 * Texte du document des villes de l'intérieur (ville en colonne de gauche) → gardes.
 * En fin de document, des « SOUS SECTION » (Azaguié, Bondoukou, Oumé…) ont leur propre calendrier :
 * chaque garde y porte sa période (`week` = début, `end` = fin).
 */
export function parseInterior(text) {
  const out = []
  let week
  let city
  let current
  let sub // période d'une sous-section
  const flush = () => {
    const period = sub ?? week
    if (current && period && city) {
      const e = parseEntry(current)
      if (e.name) out.push({ week: period.start, ...(sub ? { end: sub.end } : {}), city: city.city, commune: city.commune, ...e })
    }
    current = undefined
  }
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\f/g, '')
    const s = line.trim()
    if (!s) continue
    const w = parseWeek(s)
    if (w) { flush(); week = w; sub = undefined; continue }
    const section = strip(s).match(/^SOUS SECTION (?:DE |D )?(.+)$/)
    if (section) { flush(); city = placeOf(section[1]); sub = { start: '', end: '' }; continue }
    if (sub) {
      const p = parseSubPeriod(s, week ? new Date(week.start).getUTCFullYear() : new Date().getUTCFullYear())
      if (p) {
        flush()
        sub = p
        if (/^PHCIE\b/i.test(p.rest)) current = p.rest
        continue
      }
      if (!sub.start) continue
    }
    if (isNoise(s)) { flush(); continue }
    // « BOUAKE         PHCIE AIR FRANCE / … » : la ville est en colonne 0, suivie d'au moins deux espaces.
    const m = line.match(/^(\S[^\s].*?)\s{2,}(PHCIE\b.*)$/i)
    if (m && lead(line) === 0) {
      flush()
      city = placeOf(m[1].trim())
      current = m[2]
      continue
    }
    if (/^PHCIE\b/i.test(s)) { flush(); current = s; continue }
    if (!sub && lead(line) === 0 && !hasPhone(s) && s.length < 30) { flush(); city = placeOf(s); continue }
    if (current) current += ' ' + s
  }
  flush()
  return out
}

/** Semaines distinctes trouvées dans un texte. */
export function weeksOf(text) {
  const map = new Map()
  for (const l of text.split('\n')) {
    const w = parseWeek(l.trim())
    if (w) map.set(w.start, w)
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
}

/* ---------- Fusion avec l'annuaire (public/data/pharmacies.json) ---------- */

const digits = (s = '') => s.replace(/\D/g, '').slice(-10)
const fmtPhone = (d) => `+225 ${d.replace(/(\d{2})(?=\d)/g, '$1 ').trim()}`
const sameText = (a = '', b = '') => strip(a) === strip(b)
const REGION = (city) => (city === 'Abidjan' ? "District autonome d'Abidjan" : city === 'Yamoussoukro' ? 'District autonome de Yamoussoukro' : city)
const HOURS = [null, ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '13:00']]
export const ROSTER_SOURCE = 'Tour de garde officiel'
export const ROSTER_ID = 'rs-'

function jitter(center, seed) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const a = ((h % 360) * Math.PI) / 180
  const r = 0.004 + (((h >> 9) % 100) / 100) * 0.01
  return { lat: +(center.lat + Math.cos(a) * r).toFixed(5), lng: +(center.lng + Math.sin(a) * r).toFixed(5) }
}

/** Gardes du document regroupées par pharmacie (même nom, même ville, même commune). */
export function groupRoster(entries) {
  const groups = new Map()
  for (const e of entries) {
    const key = `${matchKey(e.name)}|${strip(e.city)}|${strip(e.commune ?? '')}`
    const g = groups.get(key) ?? { key, name: e.name, city: e.city, commune: e.commune, quartier: e.quartier, address: e.address, phones: [], weeks: [] }
    for (const p of e.phones) if (!g.phones.includes(p)) g.phones.push(p)
    if (!g.weeks.some((w) => w.start === e.week)) g.weeks.push({ start: e.week, end: e.end })
    g.address ??= e.address
    g.quartier ??= e.quartier
    groups.set(key, g)
  }
  for (const g of groups.values()) g.weeks.sort((a, b) => a.start.localeCompare(b.start))
  return [...groups.values()]
}

/**
 * Ajoute le tour de garde du mois aux pharmacies :
 * - chaque pharmacie retrouvée (même numéro de téléphone dans la même ville, sinon même nom dans la même commune)
 *   reçoit la liste de ses semaines de garde `gardes` ;
 * - les pharmacies du document absentes de l'annuaire sont ajoutées (position approximative au centre de la commune) ;
 * - sur la période couverte par le document, il fait foi : `garde` (semaine en cours) est recalculé à partir de lui.
 * Idempotent : les ajouts et `gardes` d'un passage précédent sont d'abord retirés.
 */
export function mergeRoster(data, rosters, now = new Date()) {
  const weeks = new Map()
  const entries = []
  for (const r of rosters) {
    for (const w of r.weeks) weeks.set(w.start, w)
    entries.push(...r.entries)
  }
  const weekList = [...weeks.values()].sort((a, b) => a.start.localeCompare(b.start))
  const pharmacies = data.pharmacies.filter((p) => !p.id.startsWith(ROSTER_ID)).map((p) => {
    const { gardes: _drop, ...rest } = p
    return rest
  })
  const byPhone = new Map()
  for (const p of pharmacies) {
    const d = digits(p.phone)
    if (d.length === 10) byPhone.set(d, [...(byPhone.get(d) ?? []), p])
  }
  const used = new Set()
  let matchedPhone = 0
  let matchedName = 0
  const added = []
  for (const g of groupRoster(entries)) {
    const inPlace = (p) => sameText(p.city, g.city) && (g.city !== 'Abidjan' || sameText(p.commune, g.commune))
    const byScore = (a, b) => nameSimilarity(g.name, b.name) - nameSimilarity(g.name, a.name)
    let match = g.phones.flatMap((d) => byPhone.get(d) ?? []).filter((p) => sameText(p.city, g.city) && !used.has(p.id)).sort(byScore)[0]
    if (match) matchedPhone++
    else {
      match = pharmacies
        .filter((p) => !used.has(p.id) && inPlace(p) && (matchKey(p.name) === matchKey(g.name) || (nameSimilarity(p.name, g.name) === 1 && Math.min(matchKey(p.name).length, matchKey(g.name).length) >= 8)))
        .sort(byScore)[0]
      // Abidjan : la commune de l'annuaire est parfois approximative (Akandjé, Angré…) ; même nom exact, seul candidat, à moins de 7 km.
      if (!match && g.city === 'Abidjan') {
        const center = centerOf(g.city, g.commune)
        const same = pharmacies.filter((p) => !used.has(p.id) && sameText(p.city, g.city) && matchKey(p.name) === matchKey(g.name))
        if (same.length === 1 && matchKey(g.name).length >= 5 && center && distanceM(center, same[0].position) < 7000) match = same[0]
      }
      if (match) matchedName++
    }
    const gardes = g.weeks.map((w) => ({ start: w.start, end: w.end ?? weeks.get(w.start).end }))
    if (match) {
      used.add(match.id)
      match.gardes = gardes
      if (!digits(match.phone) && g.phones[0]) match.phone = fmtPhone(g.phones[0])
      continue
    }
    const center = centerOf(g.city, g.commune) ?? { lat: 5.3364, lng: -4.0267 }
    const p = {
      id: `${ROSTER_ID}${matchKey(g.name).toLowerCase()}-${strip(g.city).toLowerCase().replace(/ /g, '')}-${strip(g.commune ?? '').toLowerCase().replace(/ /g, '')}`,
      name: `Pharmacie ${titleCase(g.name)}`,
      address: g.address ?? [g.quartier, g.commune !== g.city ? g.commune : undefined, g.city].filter(Boolean).join(', '),
      commune: g.commune ?? g.city, city: g.city, region: REGION(g.city),
      position: jitter(center, g.name + (g.commune ?? '')), positionApprox: true,
      phone: g.phones[0] ? fmtPhone(g.phones[0]) : '',
      hours: HOURS, hoursApprox: true, services: [], gardeGroup: -1, gardes,
      cmuVerified: false, insurances: [], deliveryAvailable: g.city === 'Abidjan', claimed: false, source: ROSTER_SOURCE,
    }
    pharmacies.push(p)
    added.push(p)
  }
  // Sur la période du document, la garde publiée ailleurs est remplacée par celle du document.
  const from = weekList[0]?.start
  const to = weekList.at(-1)?.end
  const t = now.toISOString()
  const current = weekList.find((w) => w.start <= t && t < w.end)
  let onGarde = 0
  for (const p of pharmacies) {
    if (p.garde && from && p.garde.end > from && p.garde.start < to) delete p.garde
    const g = p.gardes?.find((x) => x.start <= t && t < x.end)
    if (g) { p.garde = g; onGarde++ }
  }
  const meta = { ...data }
  delete meta.pharmacies
  if (current) {
    meta.garde = { start: current.start, end: current.end, label: `Pharmacies de garde en Côte d'Ivoire — ${current.label}` }
    meta.counts = { ...meta.counts, garde: onGarde }
  }
  meta.gardes = weekList
  meta.roster = { label: ROSTER_SOURCE, from, to, pharmacies: groupRoster(entries).length, matchedPhone, matchedName, added: added.length }
  meta.counts = { ...meta.counts, total: pharmacies.length }
  return { ...meta, pharmacies }
}
