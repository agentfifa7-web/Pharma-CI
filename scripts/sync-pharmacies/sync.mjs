#!/usr/bin/env node
/**
 * Synchronisation des données publiques de https://www.pharmacies-de-garde.ci
 *
 *   node scripts/sync-pharmacies/sync.mjs               # réseau : tout (garde, médicaments, annuaire, actualités)
 *   node scripts/sync-pharmacies/sync.mjs --garde-only  # réseau : garde + médicaments (rapide)
 *   node scripts/sync-pharmacies/sync.mjs --fixtures    # hors ligne : pages enregistrées dans fixtures/
 *
 * Sorties (public/data/) :
 *   pharmacies.json     — pharmacies (garde + annuaire) au format `Pharmacy`
 *   medicaments.json    — base PHARMA MED (prix publiés + liste CMU) au format `Medication`
 *   etablissements.json — cliniques, laboratoires, centres de santé… au format `HealthPlace`
 *   actualites.json     — articles santé publiés par la source (titre, extrait, lien)
 * Cache : scripts/sync-pharmacies/cache/listings.json (fiches déjà téléchargées).
 *
 * Bonnes pratiques : requêtes espacées, User-Agent identifié, cache. Vérifier les conditions
 * d'utilisation du site et privilégier un accord avec l'éditeur.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fixCategory, isHealthNews, isPharmacyListing, isTemplateHours, matchKey, parseCmuList, parseDirectoryPage, parseGardePage, parseListingPage, parsePriceList } from './parse.mjs'
import { buildMedications, CMU_URL, PRICE_URL } from './medications.mjs'
import { centerOf, CITIES, ABIDJAN_COMMUNES, strip, titleCase } from './communes.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const DATA = join(ROOT, 'public', 'data')
const CACHE = join(HERE, 'cache', 'listings.json')
const FIX = (f) => readFile(join(HERE, 'fixtures', f), 'utf8')
const BASE = 'https://www.pharmacies-de-garde.ci'
const GARDE_URL = `${BASE}/liste-des-pharmacies-de-garde-en-cote-divoire/`
const DIRECTORY_URL = `${BASE}/toutes-les-pharmacies-en-cote-divoire/`
const UA = 'PHARMA-CI-sync/1.0 (+https://github.com/agentfifa7-web/pharma-ci)'
const DELAY_MS = Number(process.env.SYNC_DELAY_MS ?? 600)
// Temps maximal consacré aux fiches détaillées : au-delà, la synchronisation se termine proprement
// avec ce qu'elle a (le cache est conservé) et le lancement suivant reprend là où elle s'est arrêtée.
const DETAILS_BUDGET_MIN = Number(process.env.SYNC_DETAILS_BUDGET_MIN ?? 80)

const args = new Set(process.argv.slice(2))
const OFFLINE = args.has('--fixtures')
const QUICK = args.has('--garde-only')
const NOW = new Date().toISOString()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('[sync]', ...a)

async function get(url, { json = false } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : 'text/html' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { body: json ? await res.json() : await res.text(), headers: res.headers }
    } catch (e) {
      if (attempt === 3) throw new Error(`${url} : ${e.message}`)
      await sleep(2000 * attempt)
    }
  }
}

const decode = (s = '') =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&rsquo;/g, '’').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

/* ---------- Annuaire : API WordPress, sinon pages HTML ---------- */

async function directoryFromApi() {
  const out = []
  let page = 1
  let totalPages = 1
  do {
    const { body, headers } = await get(`${BASE}/wp-json/wp/v2/listing?per_page=100&page=${page}&_embed=wp:term`, { json: true })
    totalPages = Number(headers.get('x-wp-totalpages') ?? 1)
    for (const item of body) {
      const terms = (item._embedded?.['wp:term'] ?? []).flat()
      out.push({
        id: String(item.id),
        link: item.link,
        modified: item.modified_gmt ?? item.modified,
        title: decode(item.title?.rendered),
        category: terms.filter((t) => t.taxonomy?.includes('category')).map((t) => decode(t.name)).join(', '),
        locations: terms.filter((t) => t.taxonomy?.includes('location')).map((t) => decode(t.name)),
      })
    }
    log(`annuaire (API) : page ${page}/${totalPages} — ${out.length} fiches`)
    page++
    await sleep(DELAY_MS)
  } while (page <= totalPages)
  return out
}

async function directoryFromHtml() {
  const out = []
  let page = 1
  let last = 1
  do {
    const { body } = await get(page === 1 ? DIRECTORY_URL : `${DIRECTORY_URL}page/${page}/`)
    const { lastPage, items } = parseDirectoryPage(body)
    last = Math.max(last, lastPage)
    for (const i of items) out.push({ id: i.slug, link: i.link, title: i.name, category: i.category, phone: i.phone, locations: i.city ? [i.city] : [] })
    log(`annuaire (pages) : ${page}/${last} — ${out.length} fiches`)
    page++
    await sleep(DELAY_MS)
  } while (page <= last)
  return out
}

/**
 * Détails (GPS, adresse, horaires) — uniquement pour les fiches nouvelles ou modifiées.
 * Les pharmacies passent en premier ; le cache est enregistré régulièrement (`save`) et le
 * téléchargement s'arrête à `deadline` (les fiches restantes seront traitées au prochain lancement).
 */
async function withDetails(listings, cache, { deadline = Infinity, save } = {}) {
  let fetched = 0
  let postponed = 0
  const ordered = [...listings.filter(isPharmacy), ...listings.filter((l) => !isPharmacy(l))]
  for (const l of ordered) {
    const c = cache[l.id]
    if (c && (c.modified === l.modified || (!l.modified && c.detail))) {
      l.detail = c.detail
      continue
    }
    if (Date.now() > deadline) {
      if (c?.detail) l.detail = c.detail // ancienne version, mieux que rien
      postponed++
      continue
    }
    try {
      l.detail = parseListingPage((await get(l.link)).body)
      cache[l.id] = { modified: l.modified, detail: l.detail } // échec : pas mis en cache, réessayé au prochain lancement
      fetched++
      if (fetched % 50 === 0) log(`fiches détaillées : ${fetched}`)
      if (save && fetched % 100 === 0) await save()
    } catch (e) {
      if (c?.detail) l.detail = c.detail
      log('fiche ignorée', l.link, e.message)
    }
    await sleep(DELAY_MS)
  }
  log(`fiches détaillées téléchargées : ${fetched} · reportées au prochain lancement : ${postponed} · en cache : ${listings.length - fetched - postponed}`)
  return listings
}

const isPharmacy = isPharmacyListing

/** Ville/commune à partir des localisations de la fiche. */
function placeOf(locations, extra = '') {
  const all = [...locations, extra].filter(Boolean).map(strip)
  const commune = Object.keys(ABIDJAN_COMMUNES).find((c) => all.some((l) => l.includes(strip(c))))
  if (commune) return { city: 'Abidjan', commune }
  const city = Object.keys(CITIES).find((c) => all.some((l) => l.includes(strip(c))))
  if (city) return { city, commune: city }
  if (all.some((l) => l.includes('ABIDJAN'))) return { city: 'Abidjan', commune: 'Abidjan' }
  const first = locations[0] ? titleCase(locations[0]) : 'Côte d’Ivoire'
  return { city: first, commune: first }
}

const REGION = (city) => (city === 'Abidjan' ? "District autonome d'Abidjan" : city === 'Yamoussoukro' ? 'District autonome de Yamoussoukro' : city)
const phoneOf = (s = '') => {
  const d = s.replace(/\D/g, '')
  if (d.length === 10) return `+225 ${d.replace(/(\d{2})(?=\d)/g, '$1 ').trim()}`
  // Ancien format à 8 chiffres (avant 2021) : conservé tel que publié, sans extrapoler le nouveau numéro.
  return d.length >= 8 ? d.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : ''
}

/** Petit décalage déterministe pour ne pas superposer les points approximatifs. */
function jitter(center, seed) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const a = ((h % 360) * Math.PI) / 180
  const r = 0.004 + (((h >> 9) % 100) / 100) * 0.01
  return { lat: +(center.lat + Math.cos(a) * r).toFixed(5), lng: +(center.lng + Math.sin(a) * r).toFixed(5) }
}

const DEFAULT_HOURS = [null, ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '13:00']]

function toPharmacy({ id, name, note, phone, city, commune, quartier, position, approx, hours, address, link, period }) {
  return {
    id, name,
    address: address ?? [quartier, commune !== city ? commune : undefined, city].filter(Boolean).join(', '),
    commune, city, region: REGION(city), position, positionApprox: approx || undefined,
    phone: phone || '',
    hours: hours ?? DEFAULT_HOURS, hoursApprox: !hours || isTemplateHours(hours) ? true : undefined,
    services: note ? [note] : [],
    gardeGroup: -1,
    garde: period ? { start: period.start, end: period.end } : undefined,
    cmuVerified: false, insurances: [], deliveryAvailable: city === 'Abidjan', claimed: false,
    source: 'pharmacies-de-garde.ci', sourceUrl: link ?? GARDE_URL,
  }
}

function buildPharmacies(garde, directory) {
  const byKey = new Map()
  for (const l of directory.filter(isPharmacy)) {
    const place = placeOf(l.locations, l.detail?.address)
    byKey.set(`${matchKey(l.title)}|${strip(place.city)}`, { ...l, place })
  }
  const out = []
  const used = new Set()
  for (const g of garde.entries) {
    const key = `${matchKey(g.name)}|${strip(g.city)}`
    const d = byKey.get(key)
    if (d) used.add(key)
    const center = centerOf(g.city, g.commune) ?? { lat: 5.3364, lng: -4.0267 }
    out.push(toPharmacy({
      id: d ? `pg-${d.id}` : `pg-g-${matchKey(g.name).toLowerCase()}-${strip(g.city).toLowerCase().replace(/ /g, '')}`,
      name: g.name, note: g.note, phone: g.phone || phoneOf(d?.phone), city: g.city, commune: g.commune, quartier: g.quartier,
      position: d?.detail?.position ?? jitter(center, g.name + g.zone), approx: !d?.detail?.position,
      hours: d?.detail?.hours, address: d?.detail?.address && `${d.detail.address}${g.quartier ? ` (${g.quartier})` : ''}`,
      link: d?.link, period: garde.period,
    }))
  }
  for (const [key, d] of byKey) {
    if (used.has(key)) continue
    const center = centerOf(d.place.city, d.place.commune)
    const position = d.detail?.position ?? (center && jitter(center, d.title))
    if (!position) continue
    out.push(toPharmacy({
      id: `pg-${d.id}`, name: titleCase(d.title), phone: phoneOf(d.phone), city: d.place.city, commune: d.place.commune,
      position, approx: !d.detail?.position, hours: d.detail?.hours, address: d.detail?.address, link: d.link,
    }))
  }
  return dedupeIds(out)
}

function dedupeIds(list) {
  const seen = new Map()
  for (const p of list) {
    const n = seen.get(p.id) ?? 0
    seen.set(p.id, n + 1)
    if (n) p.id = `${p.id}-${n + 1}`
  }
  return list
}

/** Établissements de santé (hors pharmacies) → format HealthPlace de l'application. */
function kindOf(category) {
  const c = strip(category)
  if (/LABORATOIRE|ANALYSE/.test(c)) return 'laboratoire'
  if (/URGENCE/.test(c)) return 'urgence'
  if (/CLINIQUE|HOPITAL|POLYCLINIQUE/.test(c)) return 'clinique'
  if (/CENTRE|DISPENSAIRE|MAISON DE SANTE|SERVICE HOSPITALIER|GROUPE MEDICAL|CABINET/.test(c)) return 'centre_sante'
  if (/MEDECIN|LOGUE|PEDIATRE|GYNECO|CHIRURGIEN|PSYCHIATRE|DENTISTE|SAGE FEMME|KINE|OSTEO|ORTHO|STOMATO|NUTRITION/.test(c)) return 'medecin'
  return 'autre'
}

function buildEstablishments(directory) {
  const out = []
  for (const l of directory.filter((x) => !isPharmacy(x))) {
    const place = placeOf(l.locations, l.detail?.address)
    const center = centerOf(place.city, place.commune)
    const position = l.detail?.position ?? (center && jitter(center, l.title))
    if (!position) continue
    out.push({
      id: `hp-${l.id}`,
      kind: kindOf(fixCategory(l) || l.title),
      category: fixCategory(l) || undefined,
      name: titleCase(l.title),
      commune: place.commune,
      city: place.city,
      address: l.detail?.address,
      position,
      positionApprox: !l.detail?.position || undefined,
      phone: phoneOf(l.phone),
      services: l.category ? [l.category] : [],
      open24h: false,
      hours: isTemplateHours(l.detail?.hours) ? undefined : l.detail?.hours, // horaires modèle de la source : non significatifs
      sourceUrl: l.link,
    })
  }
  return dedupeIds(out)
}

/* ---------- Actualités santé (articles WordPress) ---------- */


async function fetchNews() {
  const out = []
  for (let page = 1; page <= 5; page++) {
    let res
    try {
      res = await get(`${BASE}/wp-json/wp/v2/posts?per_page=50&page=${page}&_embed=wp:term,wp:featuredmedia`, { json: true })
    } catch (e) {
      if (page === 1) throw e
      break // au-delà de la dernière page, WordPress répond 400
    }
    for (const p of res.body) {
      const title = decode(p.title?.rendered)
      const excerpt = decode(p.excerpt?.rendered).replace(/\s*\[…\]$|\s*Lire la suite.*$/i, '')
      const cats = (p._embedded?.['wp:term'] ?? []).flat().filter((t) => t.taxonomy === 'category').map((t) => decode(t.name))
      const n = {
        id: `news-${p.id}`, title, excerpt, date: p.date_gmt ?? p.date, url: p.link, category: cats[0] ?? 'Santé',
        image: p._embedded?.['wp:featuredmedia']?.[0]?.source_url,
      }
      if (isHealthNews(n)) out.push(n)
    }
    if (page >= Number(res.headers.get('x-wp-totalpages') ?? 1)) break
    await sleep(DELAY_MS)
  }
  return out.slice(0, 40)
}

/* ---------- Programme principal ---------- */

const writeJson = async (name, data) => {
  await mkdir(DATA, { recursive: true })
  await writeFile(join(DATA, name), JSON.stringify(data) + '\n')
  log(`écrit public/data/${name}`)
}
const readJson = async (name) => (existsSync(join(DATA, name)) ? JSON.parse(await readFile(join(DATA, name), 'utf8')) : undefined)

async function step(label, fn) {
  try {
    return await fn()
  } catch (e) {
    log(`⚠️  ${label} : ${e.message} — données précédentes conservées`)
    return undefined
  }
}

async function main() {
  log(OFFLINE ? 'mode hors ligne (fixtures)' : `source : ${BASE}`)
  const cache = existsSync(CACHE) ? JSON.parse(await readFile(CACHE, 'utf8')) : {}
  const saveCache = async () => {
    if (OFFLINE) return
    await mkdir(dirname(CACHE), { recursive: true })
    await writeFile(CACHE, JSON.stringify(cache) + '\n')
  }
  const detailsDeadline = Date.now() + DETAILS_BUDGET_MIN * 60_000

  // 1. Pharmacies de garde (obligatoire)
  const garde = parseGardePage(OFFLINE ? await FIX('garde.html') : (await get(GARDE_URL)).body)
  if (!garde.period || garde.entries.length < 20) throw new Error(`Liste de garde inexploitable (période: ${!!garde.period}, lignes: ${garde.entries.length}) — structure du site modifiée ?`)
  log(`garde : ${garde.entries.length} pharmacies — ${garde.period.label}`)

  // 2. Médicaments : prix publiés + liste CMU
  await step('médicaments', async () => {
    const prices = parsePriceList(OFFLINE ? await FIX('prix.html') : (await get(PRICE_URL)).body)
    const cmu = parseCmuList(OFFLINE ? await FIX('cmu.html') : (await get(CMU_URL)).body)
    if (prices.items.length < 500 || cmu.items.length < 100) throw new Error(`listes incomplètes (${prices.items.length} prix, ${cmu.items.length} CMU)`)
    const medications = buildMedications(prices, cmu)
    const counts = { total: medications.length, prix: prices.items.length, cmu: cmu.items.length, fusionnes: medications.filter((m) => m.k && m.s === 'p').length }
    log('médicaments :', counts)
    await writeJson('medicaments.json', {
      source: BASE, generatedAt: NOW, counts,
      sources: { prix: { url: PRICE_URL, modified: prices.modified }, cmu: { url: CMU_URL, modified: cmu.modified } },
      medications,
    })
  })

  // 3. Annuaire complet (pharmacies + autres établissements)
  let directory = []
  if (OFFLINE) {
    const page1 = parseDirectoryPage(await FIX('annuaire-page1.html'))
    const eben = parseListingPage(await FIX('listing-eben-ezer.html'))
    directory = [
      ...page1.items.map((i) => ({ id: i.slug, link: i.link, title: i.name, category: i.category, phone: i.phone, locations: [i.city] })),
      { id: '9348', link: `${BASE}/listing/pharmacie-eben-ezer/`, title: eben.name, category: 'Pharmacies', locations: eben.locations, detail: eben },
    ]
  } else if (!QUICK) {
    directory =
      (await step('annuaire via API', directoryFromApi)) ??
      (await step('annuaire via pages HTML', directoryFromHtml)) ??
      []
    // L'API ne donne pas les téléphones : on les reprend des pages de l'annuaire (56 pages).
    if (directory.length && !directory.some((l) => l.phone)) {
      const pages = await step('téléphones (pages de l\'annuaire)', directoryFromHtml)
      if (pages) {
        const phoneByLink = new Map(pages.filter((p) => p.phone).map((p) => [p.link, p.phone]))
        for (const l of directory) l.phone = phoneByLink.get(l.link) ?? ''
        log(`téléphones : ${directory.filter((l) => l.phone).length} fiches`)
      }
    }
    if (directory.length) await withDetails(directory, cache, { deadline: detailsDeadline, save: saveCache })
  }

  const previous = await readJson('pharmacies.json')
  const pharmacies = buildPharmacies(garde, directory)
  // Sans annuaire frais, on conserve les fiches non-garde déjà connues (mise à jour de la garde uniquement).
  if (!directory.length && previous?.pharmacies) {
    const ids = new Set(pharmacies.map((p) => p.id))
    for (const p of previous.pharmacies) if (!ids.has(p.id) && !p.id.startsWith('pg-g-')) pharmacies.push({ ...p, garde: undefined })
  }
  await writeJson('pharmacies.json', {
    source: BASE, sourceLabel: 'pharmacies-de-garde.ci', generatedAt: NOW, garde: garde.period,
    counts: { total: pharmacies.length, garde: garde.entries.length, approxPositions: pharmacies.filter((p) => p.positionApprox).length },
    pharmacies,
  })

  if (directory.length) {
    const places = buildEstablishments(directory)
    await writeJson('etablissements.json', { source: BASE, generatedAt: NOW, counts: { total: places.length }, places })
  }

  // 4. Actualités santé
  if (!OFFLINE && !QUICK) {
    await step('actualités', async () => {
      const news = await fetchNews()
      await writeJson('actualites.json', { source: BASE, generatedAt: NOW, articles: news })
    })
  }

  await saveCache()
}

main().catch((e) => {
  console.error('[sync] ÉCHEC :', e.message)
  process.exit(1)
})
