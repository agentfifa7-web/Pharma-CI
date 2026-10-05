// Parseurs des pages publiques de pharmacies-de-garde.ci (structure WordPress + TablePress + ListingHub).
import * as cheerio from 'cheerio'
import { resolveZone, strip, titleCase } from './communes.mjs'

const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']

/** « du Samedi 03 Octobre au Vendredi 09 Octobre 2026 » → { start, end } (ISO, heure d'Abidjan = UTC). */
export function parsePeriod(text) {
  const t = strip(text).toLowerCase()
  const m = t.match(/du (?:\w+ )?(\d{1,2}) (\w+)(?: (\d{4}))? au (?:\w+ )?(\d{1,2}) (\w+) (\d{4})/)
  if (!m) return undefined
  const [, d1, m1, y1, d2, m2, y2] = m
  const mo1 = MONTHS.indexOf(m1), mo2 = MONTHS.indexOf(m2)
  if (mo1 < 0 || mo2 < 0) return undefined
  const endYear = Number(y2)
  const startYear = y1 ? Number(y1) : mo1 > mo2 ? endYear - 1 : endYear
  const start = new Date(Date.UTC(startYear, mo1, Number(d1), 0, 0, 0))
  // Le tour de garde court jusqu'à la relève du samedi suivant : fin = lendemain du dernier jour, 08:00.
  const end = new Date(Date.UTC(endYear, mo2, Number(d2) + 1, 8, 0, 0))
  return { start: start.toISOString(), end: end.toISOString(), label: text.replace(/\s+/g, ' ').trim() }
}

/** « M. X - TEL. 07 47 85 90 09 » → « +225 07 47 85 90 09 » (le nom du titulaire n'est pas conservé). */
export function parsePhone(text) {
  const all = [...text.matchAll(/(\d[\d\s.]{7,}\d)/g)].map((m) => m[1].replace(/\D/g, ''))
  const num = all.find((d) => d.length === 10) ?? all[0]
  if (!num) return ''
  return '+225 ' + num.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

/** Nettoie un nom : « PHARMACIE PRINCIPALE D'ABOBOTE (NLLE) » → { name, note } */
export function cleanName(raw) {
  const notes = []
  const base = raw.replace(/\(([^)]*)\)/g, (_, n) => (notes.push(n.trim()), '')).replace(/\s+/g, ' ').trim()
  const note = notes
    .map((n) => ({ NLLE: 'Nouvelle', NVLLE: 'Nouvelle', NOUVELLE: 'Nouvelle', GDE: 'Grande', GRDE: 'Grande', GRANDE: 'Grande' })[strip(n)] ?? titleCase(n))
    .join(', ')
  return { name: titleCase(base).replace(/^Pharmacie\b/, 'Pharmacie'), note: note || undefined }
}

/** Page « Liste des pharmacies de garde » : deux tableaux TablePress (Abidjan puis intérieur). */
export function parseGardePage(html) {
  const $ = cheerio.load(html)
  const headings = $('.elementskit-section-subtitle, h1, h2, h3').map((_, el) => $(el).text()).get()
  const period = headings.map(parsePeriod).find(Boolean)
  const entries = []
  $('table.tablepress').each((ti, table) => {
    const head = strip($(table).find('thead th').first().text())
    const kind = head.includes('ABIDJAN') ? 'abidjan' : head.includes('VILLE') ? 'interieur' : ti === 0 ? 'abidjan' : 'interieur'
    $(table).find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td').map((__, td) => $(td).text().replace(/\s+/g, ' ').trim()).get()
      const [zone = '', rawName = '', contact = ''] = cells
      if (!zone || !rawName) return // ligne d'en-tête de commune (ex. « COCODY »)
      const { name, note } = cleanName(rawName)
      entries.push({ table: kind, zone, ...resolveZone(zone, kind), name, note, phone: parsePhone(contact) })
    })
  })
  return { period, entries }
}

const DAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, dim: 0, lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6 }
const to24 = (t) => {
  const m = t.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!m) return undefined
  let h = Number(m[1])
  const ap = m[3]?.toUpperCase()
  if (ap === 'PM' && h < 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

/** Fiche d'un établissement (ListingHub) : coordonnées GPS, adresse, horaires, description. */
export function parseListingPage(html) {
  const $ = cheerio.load(html)
  const name = $('h2.title-detail').first().text().replace(/\s+/g, ' ').trim()
  let position
  $('iframe[src*="maps.google"]').each((_, el) => {
    const m = ($(el).attr('src') ?? '').match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (m && !position) position = { lat: Number(m[1]), lng: Number(m[2]) }
  })
  const address = $('.sidebar-list-listing ul.ul-disc li').first().text().replace(/\s+/g, ' ').trim() || undefined
  const hours = Array(7).fill(null)
  let hasHours = false
  $('.sidebar-border')
    .filter((_, el) => /Heures d.ouverture/i.test($(el).find('.toptitle').first().text()))
    .find('.row')
    .each((_, row) => {
      const day = $(row).find('.font-md').first().text().trim().toLowerCase().slice(0, 3)
      const range = $(row).find('.card-time').first().text()
      const [a, b] = range.split('-').map(to24)
      if (day in DAY_INDEX && a && b) {
        hours[DAY_INDEX[day]] = [a, b]
        hasHours = true
      }
    })
  const categories = $('.card-time .small-heading').first().text().trim()
  const tags = $('a[href*="/listing-tag/"]').map((_, a) => $(a).text().trim()).get()
  const locations = $('a[href*="/listing-locations/"]').map((_, a) => $(a).text().trim()).get()
  const description = $('.listing-overview .wp-block-paragraph, .listing-overview p').first().text().replace(/\s+/g, ' ').trim() || undefined
  return { name, position, address, hours: hasHours ? hours : undefined, categories, tags, locations, description }
}

/** Clé de rapprochement entre la liste de garde et l'annuaire. */
export const matchKey = (name) =>
  strip(name)
    .replace(/\bPHARMACIE\b/g, '')
    .replace(/\b(NLLE|NVLLE|NOUVELLE|GDE|GRDE|GRANDE|SARL|SARLU|EX)\b/g, '')
    .replace(/\bSAINTE?\b/g, 'ST')
    .replace(/\bSTE\b/g, 'ST')
    .replace(/\b(DE|DU|DES|LA|LE|LES|D|L)\b/g, '')
    .replace(/\s+/g, '')
