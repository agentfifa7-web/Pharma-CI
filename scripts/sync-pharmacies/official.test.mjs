import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  airpAlerts, airpDate, ammFields, markAuthorized, mergeAirpMedications, mergeOsmPharmacies, mergeOsmPlaces, nameSimilarity,
  nearestPlace, osmHealthKind, parseRss, parseWhoAlerts, resolveAirpCity,
} from './official-parse.mjs'

const pharmacy = (over) => ({ id: 'pg-1', name: 'Pharmacie du Centre', city: 'Abidjan', commune: 'Abobo', position: { lat: 5.434, lng: -4.0268 }, phone: '', ...over })

test('dates et villes AIRP', () => {
  assert.equal(airpDate('29-07-2015'), '2015-07-29')
  assert.equal(airpDate('n/a'), undefined)
  assert.equal(resolveAirpCity('ABIDJAN '), 'Abidjan')
  assert.equal(resolveAirpCity('BOUAKÉ'), 'Bouaké')
  assert.equal(nearestPlace({ lat: 5.42, lng: -4.02 }).commune, 'Abobo')
})

test('ressemblance des noms', () => {
  assert.equal(nameSimilarity('PHARMACIE NOUVELLE DE SEGUELA', 'Pharmacie Nouvelle Séguéla'), 1)
  assert.ok(nameSimilarity('Pharmacie Sainte Marie', 'Pharmacie Ste Marie Adjamé') >= 0.5)
  assert.ok(nameSimilarity('Pharmacie du Centre', 'Pharmacie de la Paix') < 0.5)
})

test('officines autorisées AIRP : même nom et même ville', () => {
  const ps = [pharmacy(), pharmacy({ id: 'pg-2', name: 'Pharmacie du Centre', city: 'Bouaké', commune: 'Bouaké' })]
  const missing = markAuthorized(ps, [
    { id: 1, city: 'ABIDJAN', pharmacy_name: 'PHARMACIE DU CENTRE', owner_fullname: 'X' },
    { id: 2, city: 'KORHOGO', pharmacy_name: 'PHARMACIE DE LA PAIX', owner_fullname: 'Y' },
  ])
  assert.equal(ps[0].authorized?.source, 'AIRP')
  assert.equal(ps[1].authorized, undefined)
  assert.deepEqual(missing.map((o) => o.id), [2])
  assert.ok(!JSON.stringify(ps).includes('owner'), 'le nom du titulaire n’est pas repris')
})

test('OpenStreetMap : corrige une position approximative, ajoute une pharmacie inconnue', () => {
  const ps = [pharmacy({ positionApprox: true, position: { lat: 5.418, lng: -4.02 } })]
  const { added, improved } = mergeOsmPharmacies(ps, [
    { type: 'node', id: 1, lat: 5.4341, lon: -4.0269, tags: { amenity: 'pharmacy', name: 'Pharmacie du Centre', phone: '+225 01 02 03 04 05' } },
    { type: 'node', id: 2, lat: 5.36, lon: -3.987, tags: { amenity: 'pharmacy', name: 'Sainte Agathe' } },
    { type: 'node', id: 3, lat: 5.36, lon: -3.98, tags: { amenity: 'pharmacy' } },
  ], [])
  assert.equal(improved, 1)
  assert.equal(ps[0].positionApprox, undefined)
  assert.equal(ps[0].position.lat, 5.4341)
  assert.equal(ps[0].phone, '+225 01 02 03 04 05')
  assert.equal(added.length, 1)
  assert.equal(added[0].name, 'Pharmacie Sainte Agathe')
  assert.equal(added[0].commune, 'Cocody')
  assert.match(added[0].source, /OpenStreetMap/)
  assert.equal(added[0].sourceUrl, 'https://www.openstreetmap.org/node/2')
})

test('OpenStreetMap : établissements de santé sans doublon', () => {
  assert.equal(osmHealthKind({ amenity: 'hospital' }), 'clinique')
  assert.equal(osmHealthKind({ healthcare: 'laboratory' }), 'laboratoire')
  assert.equal(osmHealthKind({ amenity: 'doctors' }), 'medecin')
  assert.equal(osmHealthKind({ amenity: 'pharmacy' }), undefined)
  const places = [{ id: 'hp-1', name: 'Clinique les Oliviers', position: { lat: 5.3332, lng: -4.062 } }]
  const added = mergeOsmPlaces(places, [
    { type: 'way', id: 9, center: { lat: 5.3333, lon: -4.0621 }, tags: { amenity: 'clinic', name: 'Clinique Médicale les Oliviers' } },
    { type: 'node', id: 10, lat: 5.35, lon: -4.0, tags: { amenity: 'hospital', name: 'CHU de Treichville', emergency: 'yes' } },
  ])
  assert.equal(added.length, 1)
  assert.equal(added[0].kind, 'urgence')
})

test('AMM AIRP : complète un médicament connu, ajoute une AMM valide, ignore une AMM expirée', () => {
  const rows = [{ i: 'med-1', n: 'DOLIPRANE 1000MG CPR B/8', p: 1000 }]
  const amm = [
    { numero_amm: 'E-2022-1', denomination: 'DOLIPRANE 1000 MG COMPRIME BOITE DE 8', dci: 'PARACETAMOL', laboratory_owner: 'SANOFI', country_owner: 'FRANCE', expiry_date: '01-01-2027', notice: 'medications/a b.pdf' },
    { numero_amm: 'E-2023-2', denomination: 'NOUVEAUX 5 MG COMPRIME', dci: 'X', expiry_date: '01-01-2028' },
    { numero_amm: 'E-2010-3', denomination: 'ANCIEN 5 MG COMPRIME', dci: 'Y', expiry_date: '01-01-2015' },
  ]
  const r = mergeAirpMedications(rows, amm, '2026-10-10')
  assert.deepEqual(r, { enriched: 1, added: 1 })
  assert.equal(rows[0].a, 'E-2022-1')
  assert.equal(rows[0].d, 'PARACETAMOL')
  assert.equal(rows[0].l, 'SANOFI (FRANCE)')
  assert.equal(rows[0].o, 'https://api.airpdigital.com/storage/medications/a%20b.pdf')
  assert.equal(rows[1].z, 1)
  assert.equal(ammFields({ numero_amm: 'A', expiry_date: '01-01-2020' }, '2026-10-10').xo, 1)
})

test('alertes AIRP et OMS', () => {
  const a = airpAlerts([
    { id: 599, title: 'AVIS DE RAPPEL LOTS DE PANTO-DENK 40 MG', filename: 'documents/AVIS DE RAPPEL.pdf', is_published_at: '2026-07-29T00:00:00Z', group: { name: 'Rappels de lots', slug: 'rappels-de-lots' } },
    { id: 600, title: 'NOTE', group: { name: 'Divers', slug: 'divers' } },
  ])
  assert.equal(a.length, 1)
  assert.equal(a[0].kind, 'rappel')
  assert.equal(a[0].date, '2026-07-29')
  assert.equal(a[0].url, 'https://api.airpdigital.com/storage/documents/AVIS%20DE%20RAPPEL.pdf')
  const html = '<a href="/news/item/03-07-2026-medical-product-alert-n-3-2026--falsified-darzalex">3 July 2026 Medical product alert Medical Product Alert N&#176;3/2026: Falsified DARZALEX (daratumumab)</a>'
    + '<a href="/news/item/22-12-2021-medical-product-alert-n-9-2021-falsified-soliris">old</a>'
  const w = parseWhoAlerts(html, '2025-01-01')
  assert.equal(w.length, 1)
  assert.equal(w[0].kind, 'falsifie')
  assert.equal(w[0].title, 'Alerte OMS n° 3/2026 : DARZALEX (daratumumab)')
})

test('flux RSS : titre, extrait court et lien', () => {
  const xml = `<rss><channel><item><title>Côte d’Ivoire-AIP/ Don de sang à Séguéla</title><link>https://www.aip.ci/123/</link>
    <pubDate>Fri, 09 Oct 2026 10:00:00 +0000</pubDate><guid>https://www.aip.ci/?p=123</guid>
    <description><![CDATA[<p>${'Texte '.repeat(100)}</p>]]></description><category><![CDATA[Santé]]></category></item></channel></rss>`
  const [a] = parseRss(xml, { prefix: 'aip', category: 'AIP — Santé' })
  assert.equal(a.id, 'aip-123')
  assert.equal(a.title, 'Don de sang à Séguéla')
  assert.ok(a.excerpt.length <= 281)
  assert.equal(a.url, 'https://www.aip.ci/123/')
})
