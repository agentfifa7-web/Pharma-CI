#!/usr/bin/env node
/**
 * Complète les fichiers de public/data/ avec des sources officielles ou libres, après sync.mjs :
 *
 *   node scripts/sync-pharmacies/official.mjs                   # réseau
 *   node scripts/sync-pharmacies/official.mjs --fixtures <dossier>  # hors ligne (copies brutes des sources)
 *
 *  - pharmacies.json     : officines autorisées (AIRP), positions et nouvelles pharmacies (OpenStreetMap) ;
 *  - etablissements.json : cliniques, hôpitaux, laboratoires… (OpenStreetMap) ;
 *  - medicaments.json    : n° d'AMM, laboratoire, notice et RCP ; médicaments autorisés absents (AIRP) ;
 *  - alertes.json        : avis AIRP (rappels de lots, quarantaines, arrêts de commercialisation) et alertes OMS ;
 *  - actualites.json     : articles santé de l'AIP et de l'Ordre national des pharmaciens.
 *
 * Chaque source est indépendante : si l'une échoue, les autres sont quand même appliquées et le
 * fichier concerné garde sa version précédente. Le script est idempotent : les éléments ajoutés
 * lors d'un passage précédent sont retirés avant d'être recalculés.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AIRP_API, airpAlerts, markAuthorized, mergeAirpMedications, mergeOsmPharmacies, mergeOsmPlaces, parseRss, parseWhoAlerts,
} from './official-parse.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = join(HERE, '..', '..', 'public', 'data')
const UA = 'PHARMA-CI-sync/1.0 (+https://github.com/agentfifa7-web/pharma-ci)'
const NOW = new Date().toISOString()
const TODAY = NOW.slice(0, 10)
const argv = process.argv.slice(2)
const FIX = argv.includes('--fixtures') ? argv[argv.indexOf('--fixtures') + 1] : undefined

const log = (...a) => console.log('[officiel]', ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const readJson = async (name) => JSON.parse(await readFile(join(DATA, name), 'utf8'))
const writeJson = (name, data) => writeFile(join(DATA, name), JSON.stringify(data))

async function get(url, { json = false, body } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        body,
        headers: { 'User-Agent': UA, Accept: json ? 'application/json' : '*/*', ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        signal: AbortSignal.timeout(240000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return json ? await res.json() : await res.text()
    } catch (e) {
      if (attempt === 3) throw new Error(`${url} : ${e.message}`)
      await sleep(3000 * attempt)
    }
  }
}

/** Lit une copie brute (mode --fixtures) ou télécharge. */
async function source(fixture, url, opts = {}) {
  if (!FIX) return get(url, opts)
  const path = join(FIX, fixture)
  if (!existsSync(path)) throw new Error(`copie absente : ${fixture}`)
  const raw = fixture.endsWith('.gz') ? gunzipSync(await readFile(path)).toString('utf8') : await readFile(path, 'utf8')
  return opts.json ? JSON.parse(raw) : raw
}

async function step(label, fn) {
  try {
    await fn()
  } catch (e) {
    console.warn(`[officiel] ${label} : échec, version précédente conservée —`, e.message)
  }
}

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const OSM_QUERY = '[out:json][timeout:170];area["ISO3166-1"="CI"][admin_level=2]->.a;(nwr["amenity"~"^(pharmacy|hospital|clinic|doctors|dentist)$"](area.a);nwr["healthcare"](area.a););out center tags;'

let osm
const osmElements = async () => {
  osm ??= (await source('osm-sante.json.gz', OVERPASS, { json: true, body: `data=${encodeURIComponent(OSM_QUERY)}` })).elements
  return osm
}

/* ---------- Pharmacies ---------- */

await step('pharmacies (AIRP + OpenStreetMap)', async () => {
  const data = await readJson('pharmacies.json')
  // Repartir de l'annuaire principal : retirer les ajouts et marques d'un passage précédent.
  data.pharmacies = data.pharmacies.filter((p) => !p.id.startsWith('osm-'))
  for (const p of data.pharmacies) delete p.authorized
  const defaultHours = data.pharmacies.find((p) => p.hoursApprox)?.hours ?? [null, ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '20:00'], ['08:00', '12:00']]

  let osmAdded = 0
  await step('OpenStreetMap (pharmacies)', async () => {
    const { added, improved } = mergeOsmPharmacies(data.pharmacies, await osmElements(), defaultHours)
    osmAdded = added.length
    log(`OpenStreetMap : ${added.length} pharmacies ajoutées, ${improved} positions corrigées`)
  })

  await step('AIRP (officines autorisées)', async () => {
    const res = await source('api-officines-big.json', `${AIRP_API}/data/officines?page=1&rowsPerPage=5000&sortBy=id&descending=false`, { json: true })
    const officines = res.data ?? []
    if (officines.length < 500) throw new Error(`liste incomplète (${officines.length})`)
    const missing = markAuthorized(data.pharmacies, officines)
    const n = data.pharmacies.filter((p) => p.authorized).length
    log(`AIRP : ${officines.length} officines autorisées, ${n} retrouvées dans l'annuaire, ${missing.length} non retrouvées`)
    data.authorizedSource = { label: 'Liste des officines autorisées — AIRP', url: 'https://airp.ci/', total: officines.length, checkedAt: NOW }
  })

  data.counts = { ...data.counts, total: data.pharmacies.length, osm: osmAdded, authorized: data.pharmacies.filter((p) => p.authorized).length }
  await writeJson('pharmacies.json', data)
})

/* ---------- Établissements de santé ---------- */

await step('établissements (OpenStreetMap)', async () => {
  const data = await readJson('etablissements.json')
  data.places = data.places.filter((p) => !p.id.startsWith('osm-'))
  const added = mergeOsmPlaces(data.places, await osmElements())
  data.counts = { ...data.counts, total: data.places.length, osm: added.length }
  log(`OpenStreetMap : ${added.length} établissements ajoutés`)
  await writeJson('etablissements.json', data)
})

/* ---------- Médicaments (AMM) ---------- */

await step('médicaments (AIRP)', async () => {
  const data = await readJson('medicaments.json')
  data.medications = data.medications.filter((r) => !r.z)
  for (const r of data.medications) for (const k of ['a', 'l', 'x', 'xo', 'o', 'r']) delete r[k]
  let amm = []
  if (FIX) amm = (await source('api-medications.json', '', { json: true })).data
  else {
    for (let page = 1, last = 1; page <= last; page++) {
      const res = await get(`${AIRP_API}/data/medications?page=${page}&rowsPerPage=1000&sortBy=id&descending=false`, { json: true })
      last = res.last_page ?? 1
      amm.push(...(res.data ?? []))
      await sleep(800)
    }
    if (amm.length < 1000) throw new Error(`liste incomplète (${amm.length})`)
  }
  const latest = await source('api-medications-latest.json', `${AIRP_API}/data/medications/latest-update`, { json: true }).catch(() => undefined)
  const { enriched, added } = mergeAirpMedications(data.medications, amm, TODAY)
  data.sources.amm = { url: 'https://airp.ci/', label: 'Médicaments autorisés (AMM) — AIRP', modified: latest?.date ?? NOW, total: amm.length }
  data.counts = { ...data.counts, total: data.medications.length, amm: amm.length, ammEnrichis: enriched, ammAjoutes: added }
  log(`AIRP : ${amm.length} AMM, ${enriched} médicaments complétés, ${added} ajoutés`)
  await writeJson('medicaments.json', data)
})

/* ---------- Alertes ---------- */

await step('alertes (AIRP + OMS)', async () => {
  const previous = existsSync(join(DATA, 'alertes.json')) ? (await readJson('alertes.json')).alerts : []
  const byId = new Map(previous.map((a) => [a.id, a]))
  await step('AIRP (avis)', async () => {
    // L'AIRP publie ses derniers avis sur sa page d'accueil : on les cumule d'un passage à l'autre.
    const home = await source('api-data.json', `${AIRP_API}/data`, { json: true })
    for (const a of airpAlerts(home.alerts ?? [])) byId.set(a.id, a)
  })
  await step('OMS (alertes produits médicaux)', async () => {
    const since = new Date(Date.now() - 2 * 365 * 864e5).toISOString().slice(0, 10)
    const html = await source('who-alerts.html', 'https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts')
    for (const a of parseWhoAlerts(html, since)) byId.set(a.id, a)
  })
  const alerts = [...byId.values()].sort((a, b) => b.date.localeCompare(a.date))
  log(`alertes : ${alerts.length}`)
  await writeJson('alertes.json', {
    generatedAt: NOW,
    sources: [
      { label: 'AIRP — Autorité Ivoirienne de Régulation Pharmaceutique', url: 'https://airp.ci/' },
      { label: 'OMS — alertes produits médicaux', url: 'https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts' },
    ],
    alerts,
  })
})

/* ---------- Actualités ---------- */

await step('actualités (AIP + Ordre)', async () => {
  const data = await readJson('actualites.json')
  data.articles = data.articles.filter((a) => !/^(aip|onp)-/.test(a.id))
  const extra = []
  await step('AIP', async () => {
    const xml = await source('aip-sante-feed.xml', 'https://www.aip.ci/category/sante/feed/')
    extra.push(...parseRss(xml, { prefix: 'aip', category: 'AIP — Santé', emoji: '📰' }))
  })
  await step('Ordre des pharmaciens', async () => {
    const xml = await source('ordre-feed.xml', 'https://ordrepharmacien.ci/feed/')
    extra.push(...parseRss(xml, { prefix: 'onp', category: 'Ordre des pharmaciens', emoji: '⚕️' }))
  })
  data.articles = [...data.articles, ...extra].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40)
  log(`actualités : ${extra.length} articles officiels, ${data.articles.length} au total`)
  await writeJson('actualites.json', data)
})
