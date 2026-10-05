import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cleanName, matchKey, parseGardePage, parseListingPage, parsePeriod, parsePhone } from './parse.mjs'
import { resolveZone } from './communes.mjs'

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8')

test('période de garde', () => {
  const p = parsePeriod("Pharmacies de garde en Côte d'Ivoire du Samedi 03 Octobre au Vendredi 09 Octobre 2026")
  assert.equal(p.start, '2026-10-03T00:00:00.000Z')
  assert.equal(p.end, '2026-10-10T08:00:00.000Z')
  assert.equal(parsePeriod('du Samedi 27 Décembre au Vendredi 02 Janvier 2027').start, '2026-12-27T00:00:00.000Z')
})

test('téléphone et nom', () => {
  assert.equal(parsePhone('M. AKA JEAN PATRICE - TEL. - TEL. 01 00 01 46 36'), '+225 01 00 01 46 36')
  assert.equal(parsePhone('TEL.07 00 13 00 36'), '+225 07 00 13 00 36')
  assert.deepEqual(cleanName("PHARMACIE PRINCIPALE D'ABOBOTE (NLLE)"), { name: "Pharmacie Principale d'Abobote", note: 'Nouvelle' })
  assert.equal(matchKey('PHARMACIE EBEN-EZER'), matchKey('Pharmacie Eben-Ezer'))
  assert.equal(matchKey('PHARMACIE STE JEANNE'), matchKey('Pharmacie Sainte Jeanne'))
})

test('zones', () => {
  assert.deepEqual(resolveZone('COCODY - RIVIERA', 'abidjan'), { city: 'Abidjan', commune: 'Cocody', quartier: 'Riviera' })
  assert.equal(resolveZone('PORT BOUET - VRIDI', 'abidjan').commune, 'Port-Bouët')
  assert.equal(resolveZone('ZONE AKOUEDO + PALMERAIE EXTENSION + ABATTA', 'abidjan').commune, 'Cocody')
  assert.equal(resolveZone('ADJAME - WILLIAMSVILLE', 'abidjan').quartier, 'Williamsville')
  assert.deepEqual(resolveZone('SAN PEDRO', 'interieur'), { city: 'San-Pédro', commune: 'San-Pédro', quartier: undefined })
  assert.equal(resolveZone('SONGON + KM 17', 'interieur').city, 'Abidjan')
  assert.equal(resolveZone('AGNIBILEKRO', 'interieur').city, 'Agnibilékrou')
})

test('page de garde complète', () => {
  const { period, entries } = parseGardePage(fx('garde.html'))
  assert.ok(period)
  assert.equal(entries.filter((e) => e.table === 'abidjan').length, 115)
  assert.equal(entries.filter((e) => e.table === 'interieur').length, 81)
  assert.ok(entries.every((e) => e.phone.startsWith('+225 ')))
  const unresolved = entries.filter((e) => e.table === 'interieur' && e.city !== 'Abidjan' && !/^[A-ZÉ]/.test(e.city))
  assert.deepEqual(unresolved, [])
})

test('fiche établissement', () => {
  const d = parseListingPage(fx('listing-eben-ezer.html'))
  assert.equal(d.name, 'Pharmacie Eben-Ezer')
  assert.deepEqual(d.position, { lat: 6.8276228, lng: -5.2893433 })
  assert.equal(d.address, 'RPV4+44R,Yamoussoukro')
  assert.deepEqual(d.hours[1], ['08:00', '20:00'])
  assert.deepEqual(d.hours[6], ['08:00', '12:00'])
  assert.equal(d.hours[0], null)
  assert.deepEqual(d.locations, ['Yamoussoukro'])
})
