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

import { medKey, parseCmuList, parseDirectoryPage, parsePriceList } from './parse.mjs'

test('liste des prix des médicaments', () => {
  const { items, modified } = parsePriceList(fx('prix.html'))
  assert.equal(items.length, 3870) // 3 lignes vides dans la source (N° 91 à 93)
  assert.deepEqual(items[0], { code: '8108772', name: '5 FLUORO URACILE INJ FLACON DETAIL', group: 'CANCEROLOGIE, ANTINEOPLASIQUE', price: 13780 })
  assert.equal(items.at(-1).price, 6505)
  assert.ok(items.filter((i) => i.price).length > 3800)
  assert.equal(modified, '2024-12-18T09:30:11+00:00')
})

test('liste CMU', () => {
  const { items } = parseCmuList(fx('cmu.html'))
  assert.ok(items.length >= 737)
  assert.deepEqual(items[0], { name: 'ABZ SUSP BUV FL/10 ML', price: 705, dci: 'ALBENDAZOLE', therapeuticClass: 'PARASITOLOGIE, ANTHELMINTIQUE', form: 'Solution buvable' })
  assert.equal(medKey('ABZ SUSP BUV FL/10 ML'), medKey('ABZ SUSP BUVFL/10ML'))
})

test("page d'annuaire", () => {
  const { total, lastPage, items } = parseDirectoryPage(fx('annuaire-page1.html'))
  assert.equal(total, 2209)
  assert.equal(lastPage, 56)
  assert.equal(items.length, 40)
  assert.equal(items[0].name, 'CLINIQUE MEDICALE LES OLIVIERS')
  assert.equal(items[0].city, 'Abidjan')
  assert.equal(items[1].phone, '21564221')
})

import { fixCategory, isHealthNews, isPharmacyListing } from './parse.mjs'

test('classement des fiches : pharmacie ou autre établissement', () => {
  assert.ok(isPharmacyListing({ category: 'Pharmacies', title: 'Pharmacie AZI' }))
  assert.ok(isPharmacyListing({ category: 'Toutes les pharmacies', title: 'Grande Pharmacie du Plateau' }))
  assert.ok(isPharmacyListing({ category: 'Pharmacies', title: 'Phamacie Providence' }))
  assert.ok(isPharmacyListing({ category: 'Pharmacies', title: 'Parmacie Kinninya' }))
  assert.ok(isPharmacyListing({ category: 'Pharmacies', title: 'Pharmarcie Notre Dame' }))
  assert.ok(!isPharmacyListing({ category: 'Pharmacies', title: 'CIMR' }))
  assert.ok(isPharmacyListing({ category: '', title: 'Pharmacie Eben-Ezer' }))
  // classés « Pharmacies » par la source mais n'en sont pas
  assert.ok(!isPharmacyListing({ category: 'Pharmacies', title: 'Radiologie hma' }))
  assert.ok(!isPharmacyListing({ category: 'Pharmacies', title: 'CABINET MEDICAL AZALEE' }))
  assert.ok(!isPharmacyListing({ category: 'Pharmacies', title: 'Petit Marché de Guiglo' }))
  assert.ok(!isPharmacyListing({ category: "Laboratoire d'analyses médicales", title: 'Pharmacie et Laboratoire du Longchamp' }))
  assert.equal(fixCategory({ category: 'Pharmacies', title: "Centre d'Imagerie Médicale d'Abidjan" }), 'Imagerie médicale')
  assert.equal(fixCategory({ category: 'Pharmacies', title: 'Centre de Santé Saint-Camille' }), 'Centre de santé')
  assert.equal(fixCategory({ category: 'Pharmacies', title: 'Petit Marché de Guiglo' }), '')
  assert.equal(fixCategory({ category: 'Clinique', title: 'Clinique X' }), 'Clinique')
})

test('filtre des actualités santé', () => {
  assert.ok(isHealthNews({ title: 'Campagne de vaccination contre la rougeole', category: 'Actualités' }))
  assert.ok(isHealthNews({ title: 'Souscrire à une assurance maladie', category: 'Tout sur la santé' }))
  assert.ok(!isHealthNews({ title: 'Pharmacies de garde à Abidjan du Samedi 21 Mars 2026', category: 'Pharmacies' }))
  assert.ok(!isHealthNews({ title: 'Location de Berline, SUV, 4×4', excerpt: 'service de soins du véhicule', category: 'Autres' }))
  assert.ok(!isHealthNews({ title: 'Docteur X nommée Directrice de l’Usine de Potabilisation', category: 'Autres' }))
})

import { isTemplateHours, parseListingPage as parseListing } from './parse.mjs'

test('horaires modèle de la source', () => {
  assert.ok(isTemplateHours(parseListing(fx('listing-eben-ezer.html')).hours))
  assert.ok(!isTemplateHours([null, ['07:30', '21:00'], ['07:30', '21:00'], ['07:30', '21:00'], ['07:30', '21:00'], ['07:30', '21:00'], ['08:00', '13:00']]))
  assert.ok(!isTemplateHours(undefined))
})
