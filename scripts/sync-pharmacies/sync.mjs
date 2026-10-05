#!/usr/bin/env node
/**
 * Synchronisation hebdomadaire des pharmacies depuis https://www.pharmacies-de-garde.ci
 *
 *   node scripts/sync-pharmacies/sync.mjs               # réseau : garde + annuaire complet
 *   node scripts/sync-pharmacies/sync.mjs --garde-only  # réseau : uniquement la liste de garde
 *   node scripts/sync-pharmacies/sync.mjs --fixtures    # hors ligne : pages enregistrées dans fixtures/
 *
 * Sorties :
 *   public/data/pharmacies.json   — liste au format `Pharmacy` de l'application
 *   scripts/sync-pharmacies/cache/listings.json — cache des fiches (évite de tout re-télécharger)
 *
 * Bonnes pratiques : une seule exécution par semaine, requêtes espacées, User-Agent identifié.
 * Vérifier les conditions d'utilisation du site et privilégier un accord avec l'éditeur.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matchKey, parseGardePage, parseListingPage } from './parse.mjs'
import { centerOf, CITIES, ABIDJAN_COMMUNES, strip, titleCase } from './communes.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const OUT = join(ROOT, 'public', 'data', 'pharmacies.json')
const CACHE = join(HERE, 'cache', 'listings.json')
const BASE = 'https://www.pharmacies-de-garde.ci'
const GARDE_URL = `${BASE}/liste-des-pharmacies-de-garde-en-cote-divoire/`
const UA = 'PHARMA-CI-sync/1.0 (+https://github.com/agentfifa7-web/pharma-ci)'
const DELAY_MS = Number(process.env.SYNC_DELAY_MS ?? 600)

const args = new Set(process.argv.slice(2))
const OFFLINE = args.has('--fixtures')
const GARDE_ONLY = args.has('--garde-only') || OFFLINE

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

/* ---------- Annuaire (API WordPress du type « listing ») ---------- */

const isPharmacy = (terms) => terms.some((t) => t.taxonomy?.includes('category') && /pharmac/i.test(t.slug + t.name))

async function fetchDirectory(cache) {
  const listings = []
  let page = 1
  let totalPages = 1
  do {
    const { body, headers } = await get(`${BASE}/wp-json/wp/v2/listing?per_page=100&page=${page}&_embed=wp:term`, { json: true })
    totalPages = Number(headers.get('x-wp-totalpages') ?? 1)
    for (const item of body) {
      const terms = (item._embedded?.['wp:term'] ?? []).flat()
      if (!isPharmacy(terms)) continue
      listings.push({
        id: item.id,
        slug: item.slug,
        link: item.link,
        modified: item.modified_gmt ?? item.modified,
        title: decode(item.title?.rendered ?? ''),
        locations: terms.filter((t) => t.taxonomy?.includes('location')).map((t) => decode(t.name)),
      })
    }
    log(`annuaire : page ${page}/${totalPages} (${listings.length} pharmacies)`)
    page++
    await sleep(DELAY_MS)
  } while (page <= totalPages)

  // Détail de chaque fiche (GPS, adresse, horaires) — uniquement si nouvelle ou modifiée.
  let fetched = 0
  for (const l of listings) {
    const c = cache[l.id]
    if (c && c.modified === l.modified) {
      Object.assign(l, c.detail ? { detail: c.detail } : {})
      continue
    }
    try {
      const { body } = await get(l.link)
      l.detail = parseListingPage(body)
      fetched++
      if (fetched % 25 === 0) log(`fiches détaillées : ${fetched}`)
    } catch (e) {
      log('fiche ignorée', l.link, e.message)
    }
    cache[l.id] = { modified: l.modified, detail: l.detail }
    await sleep(DELAY_MS)
  }
  log(`fiches détaillées téléchargées : ${fetched} (cache : ${listings.length - fetched})`)
  return listings
}

const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&rsquo;|&#8217;/g, '’').replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/<[^>]+>/g, '').trim()

/** Déduit ville/commune à partir des localisations de la fiche. */
function placeOf(locations, fallbackText = '') {
  const all = [...locations, fallbackText].map(strip)
  const commune = Object.keys(ABIDJAN_COMMUNES).find((c) => all.some((l) => l.includes(strip(c))))
  if (commune && (all.some((l) => l.includes('ABIDJAN')) || commune !== 'Songon')) return { city: 'Abidjan', commune }
  const city = Object.keys(CITIES).find((c) => all.some((l) => l.includes(strip(c))))
  if (city) return { city, commune: city }
  if (all.some((l) => l.includes('ABIDJAN'))) return { city: 'Abidjan', commune: 'Abidjan' }
  return { city: locations[0] ? titleCase(locations[0]) : 'Côte d’Ivoire', commune: locations[0] ? titleCase(locations[0]) : '—' }
}

const REGION = (city) => (city === 'Abidjan' ? "District autonome d'Abidjan" : city === 'Yamoussoukro' ? 'District autonome de Yamoussoukro' : city)

/* ---------- Fusion garde + annuaire → format Pharmacy ---------- */

function toPharmacy({ id, name, note, phone, city, commune, quartier, position, approx, hours, address, link, garde, period }) {
  return {
    id,
    name,
    address: address ?? [quartier, commune !== city ? commune : undefined, city].filter(Boolean).join(', '),
    commune,
    city,
    region: REGION(city),
    position,
    positionApprox: approx || undefined,
    phone: phone || '',
    hours: hours ?? [null, ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '13:00']],
    hoursApprox: hours ? undefined : true,
    services: note ? [note] : [],
    gardeGroup: -1,
    garde: garde && period ? { start: period.start, end: period.end } : undefined,
    cmuVerified: false,
    insurances: [],
    deliveryAvailable: city === 'Abidjan',
    claimed: false,
    source: 'pharmacies-de-garde.ci',
    sourceUrl: link ?? GARDE_URL,
  }
}

/** Petit décalage déterministe pour ne pas superposer les points approximatifs sur la carte. */
function jitter(center, seed) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const a = ((h % 360) * Math.PI) / 180
  const r = 0.004 + ((h >> 9) % 100) / 100 * 0.01
  return { lat: +(center.lat + Math.cos(a) * r).toFixed(5), lng: +(center.lng + Math.sin(a) * r).toFixed(5) }
}

function merge(garde, directory) {
  const byKey = new Map()
  for (const l of directory) {
    const place = placeOf(l.locations, l.detail?.address)
    const key = `${matchKey(l.title)}|${strip(place.city)}`
    byKey.set(key, { ...l, place })
  }
  const out = []
  const used = new Set()
  for (const g of garde.entries) {
    const key = `${matchKey(g.name)}|${strip(g.city)}`
    const d = byKey.get(key)
    if (d) used.add(key)
    const center = centerOf(g.city, g.commune) ?? { lat: 5.3364, lng: -4.0267 }
    const position = d?.detail?.position ?? jitter(center, g.name + g.zone)
    out.push(
      toPharmacy({
        id: d ? `pg-${d.id}` : `pg-g-${matchKey(g.name).toLowerCase()}-${strip(g.city).toLowerCase().replace(/ /g, '')}`,
        name: g.name, note: g.note, phone: g.phone, city: g.city, commune: g.commune, quartier: g.quartier,
        position, approx: !d?.detail?.position, hours: d?.detail?.hours, address: d?.detail?.address && `${d.detail.address}${g.quartier ? ` (${g.quartier})` : ''}`,
        link: d?.link, garde: true, period: garde.period,
      }),
    )
  }
  for (const [key, d] of byKey) {
    if (used.has(key)) continue
    const center = centerOf(d.place.city, d.place.commune)
    const position = d.detail?.position ?? (center && jitter(center, d.title))
    if (!position) continue
    out.push(toPharmacy({
      id: `pg-${d.id}`, name: titleCase(d.title).replace(/^Pharmacie\b/, 'Pharmacie'), city: d.place.city, commune: d.place.commune,
      position, approx: !d.detail?.position, hours: d.detail?.hours, address: d.detail?.address, link: d.link,
    }))
  }
  // Identifiants uniques (deux homonymes dans la même ville)
  const seen = new Map()
  for (const p of out) {
    const n = seen.get(p.id) ?? 0
    seen.set(p.id, n + 1)
    if (n) p.id = `${p.id}-${n + 1}`
  }
  return out
}

/* ---------- Programme principal ---------- */

async function main() {
  log(OFFLINE ? 'mode hors ligne (fixtures)' : `source : ${BASE}`)
  const gardeHtml = OFFLINE ? await readFile(join(HERE, 'fixtures', 'garde.html'), 'utf8') : (await get(GARDE_URL)).body
  const garde = parseGardePage(gardeHtml)
  if (!garde.period || garde.entries.length < 20) throw new Error(`Liste de garde inexploitable (période: ${!!garde.period}, lignes: ${garde.entries.length}) — structure du site modifiée ?`)
  log(`garde : ${garde.entries.length} pharmacies — ${garde.period.label}`)

  const cache = existsSync(CACHE) ? JSON.parse(await readFile(CACHE, 'utf8')) : {}
  let directory = []
  if (!GARDE_ONLY) {
    try {
      directory = await fetchDirectory(cache)
    } catch (e) {
      log('annuaire indisponible, seule la liste de garde est publiée :', e.message)
    }
  } else if (OFFLINE) {
    const detail = parseListingPage(await readFile(join(HERE, 'fixtures', 'listing-eben-ezer.html'), 'utf8'))
    directory = [{ id: 9348, slug: 'pharmacie-eben-ezer', link: `${BASE}/listing/pharmacie-eben-ezer/`, title: detail.name, locations: detail.locations, detail }]
  }

  const pharmacies = merge(garde, directory)
  const payload = {
    source: BASE,
    sourceLabel: 'pharmacies-de-garde.ci',
    generatedAt: new Date().toISOString(),
    garde: garde.period,
    counts: { total: pharmacies.length, garde: garde.entries.length, directory: directory.length, approxPositions: pharmacies.filter((p) => p.positionApprox).length },
    pharmacies,
  }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(payload, null, 1) + '\n')
  if (!OFFLINE) {
    await mkdir(dirname(CACHE), { recursive: true })
    await writeFile(CACHE, JSON.stringify(cache) + '\n')
  }
  log(`écrit ${OUT} :`, payload.counts)
}

main().catch((e) => {
  console.error('[sync] ÉCHEC :', e.message)
  process.exit(1)
})
