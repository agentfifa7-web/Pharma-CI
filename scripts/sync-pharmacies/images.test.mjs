import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dciKey, exactMatches, findMedImages, isFreeLicense, pickFile, searchQueries, toImageEntry } from './images.mjs'

test('clés et requêtes de recherche', () => {
  assert.equal(dciKey('Céfalexine'), 'CEFALEXINE')
  assert.deepEqual(searchQueries('AMOXICILLINE').map((q) => `${q.lang}:${q.q}`), ['fr:amoxicilline', 'en:amoxicilline', 'en:amoxicillin'])
  assert.deepEqual(
    exactMatches([{ id: 'Q1', label: 'céfalexine', match: { text: 'céfalexine' } }, { id: 'Q2', label: 'céfalexine monohydrate' }], 'cefalexine'),
    ['Q1'],
  )
})

test('licences libres uniquement', () => {
  for (const ok of ['Public domain', 'CC0', 'CC BY 4.0', 'CC BY-SA 3.0', 'CC BY-SA 2.5 es', 'cc-by-sa-4.0']) assert.ok(isFreeLicense(ok), ok)
  for (const ko of ['CC BY-NC 4.0', 'CC BY-NC-SA 2.0', 'CC BY-ND 4.0', 'Fair use', '', 'Copyrighted']) assert.ok(!isFreeLicense(ko), ko)
})

test('choix du fichier : photo, sinon formule, et seulement pour une substance', () => {
  const claim = (v) => [{ rank: 'normal', mainsnak: { datavalue: { value: v } } }]
  assert.deepEqual(pickFile({ claims: { P231: claim('103-90-2'), P18: claim('Tablets.jpg'), P117: claim('Para.svg') } }), { file: 'Tablets.jpg', kind: 'photo' })
  assert.deepEqual(pickFile({ claims: { P662: claim('1983'), P117: claim('Para.svg') } }), { file: 'Para.svg', kind: 'structure' })
  assert.equal(pickFile({ claims: { P18: claim('Ville.jpg') } }), undefined) // homonyme sans identifiant chimique
})

test('crédit et licence extraits de Commons', () => {
  const page = { imageinfo: [{ thumburl: 'https://upload.wikimedia.org/t.jpg', url: 'https://upload.wikimedia.org/o.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:T.jpg',
    extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' }, Artist: { value: '<a href="//x">Jean&nbsp;Dupont</a>' } } }] }
  assert.deepEqual(toImageEntry(page, 'photo'), {
    src: 'https://upload.wikimedia.org/t.jpg', page: 'https://commons.wikimedia.org/wiki/File:T.jpg', credit: 'Jean Dupont',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', kind: 'photo',
  })
  page.imageinfo[0].extmetadata.LicenseShortName.value = 'CC BY-NC 2.0'
  assert.equal(toImageEntry(page, 'photo'), undefined)
})

test('recherche complète, cache et associations', async () => {
  const calls = []
  const get = async (url) => {
    calls.push(url)
    const u = new URL(url)
    const action = u.searchParams.get('action')
    if (action === 'wbsearchentities') {
      return u.searchParams.get('search') === 'paracetamol' && u.searchParams.get('language') === 'fr'
        ? { search: [{ id: 'Q57055', label: 'paracétamol', match: { text: 'paracétamol' } }] }
        : { search: [] }
    }
    if (action === 'wbgetentities') return { entities: { Q57055: { claims: { P231: [{ mainsnak: { datavalue: { value: '103-90-2' } } }], P117: [{ mainsnak: { datavalue: { value: 'Paracetamol-skeletal.svg' } } }] } } } }
    return { query: { pages: [{ imageinfo: [{ thumburl: 'https://upload.wikimedia.org/p.png', descriptionurl: 'https://commons.wikimedia.org/wiki/File:P.svg', extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: 'Ben Mills' } } }] }] } }
  }
  const now = Date.parse('2026-10-06T00:00:00Z')
  const previous = { ALBENDAZOLE: { dci: 'ALBENDAZOLE', none: true, checkedAt: '2026-10-01T00:00:00Z' } }
  const out = await findMedImages(['PARACETAMOL', 'ALBENDAZOLE', 'SULFADOXINE + PYRIMETHAMINE', 'XYZ'], previous, get, { now })
  assert.equal(out.PARACETAMOL.kind, 'structure')
  assert.equal(out.PARACETAMOL.credit, 'Ben Mills')
  assert.equal(out.PARACETAMOL.wikidata, 'https://www.wikidata.org/wiki/Q57055')
  assert.equal(out.ALBENDAZOLE, previous.ALBENDAZOLE) // vérifiée il y a moins de 30 jours : pas de nouvelle requête
  assert.equal(out['SULFADOXINE PYRIMETHAMINE'].none, true)
  assert.equal(out.XYZ.none, true)
  assert.ok(!calls.some((c) => c.includes('albendazole')))
  assert.ok(!calls.some((c) => c.includes('sulfadoxine')))
})
