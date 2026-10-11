import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeRoster, parseAbidjan, parseEntry, parseInterior, parseWeek } from './roster-parse.mjs'

const C = ' '.repeat(50)
const ABIDJAN = `                        TOUR DE GARDE DU MOIS D’OCTOBRE 2026
                         SEMAINE DU SAMEDI 03 AU VENDREDI 09 OCTOBRE 2026
${C}Permanence 24 h/24 h
${C}ABOBO
PHCIE DU CENTRE / M. OUATTARA YACOUBA MARIUS – TEL. 07 47 85 90 09/ 01 40 27 54 76/ 05 85 02 61 52 / ABOBO
AVOCATIER VOIE EXPRESS ANYAMA PRES DE L’HOTEL DU CENTRE

${C}II PLATEAUX
PHCIE ANGRE / MME KOFFI AISSATOU CISSE - 22 42 11 06 / 57 04 SUR PROLONGEMENT BD LATRILLE
${C}YOPOUGON
Secteur 1 PHCIE STE MARIE / M. KOUAME – TEL. 01 03 33 94 73
YOPOUGON ANDOKOUA

                         SEMAINE DU SAMEDI 31 OCTOBRE AU VENDREDI 06 NOVEMBRE 2026
${C}ABOBO
PHCIE AZUR / M. CHINTOH ARMSTRONG - TEL. 07 59 85 10 59 / 01 40 27 50 02
ROUTE DU ZOO PLATEAU DOKUI AZUR
`
const INTERIOR = `                         SEMAINE DU SAMEDI 10 AU VENDREDI 16 OCTOBRE 2026
SINFRA            PHCIE KAVOUDROH (GDE) / M. TOURE MAMADOU – TEL. 27 30 68 07 11 / 07 79 78 87 22
                  QUARTIER DIOULABOUGOU

SONGON / KM 17    PHCIE NOTRE DAME DE LA PAIX / MME MIAN – TEL. 07 58 17 62 25/
                  01 42 24 16 78/ ADIAPODOUME A COTE DU RESTAURANT
                    TOUR DE GARDE DU MOIS D’OCTOBRE 2026 (VILLES DE L’INTERIEUR)
                                              SOUS SECTION DE BONDOUKOU
                                              SAMEDI 26 SEPTEMBRE AU SAMEDI 03 OCTOBRE 2026:
PHCIE DU ZANZAN / M. AFFRE KOUASSI FELIX - TEL. 27 35 91 56 09 / 07 07 02 92 64
                                              SOUS SECTION OUME
LUNDI 26 OCTOBRE AU DIMANCHE 01 NOVEMBRE: PHCIE SOURCE DE VIE / M. ESSE ABLE CYRILLE –
                                                 TEL. 07 67 33 81 31 / 27 21 74 86 39
`

test('semaines du tour de garde (samedi 8 h → samedi suivant 8 h)', () => {
  assert.deepEqual(parseWeek('SEMAINE DU SAMEDI 03 AU VENDREDI 09 OCTOBRE 2026'), {
    start: '2026-10-03T08:00:00.000Z', end: '2026-10-10T08:00:00.000Z', label: 'Semaine du samedi 3 au vendredi 9 octobre 2026',
  })
  assert.equal(parseWeek('SEMAINE DU SAMEDI 31 OCTOBRE AU VENDREDI 06 NOVEMBRE 2026').end, '2026-11-07T08:00:00.000Z')
  assert.equal(parseWeek('PERMANENCE 24 H/24'), undefined)
})

test('ligne de pharmacie : nom, numéros, adresse', () => {
  const e = parseEntry('PHCIE STE RITA SARLU / M. N’GORAN MONIQUE – TEL. 27 34 72 58 17 / 58 18/ ROUTE DU GABON RES MARACANA')
  assert.equal(e.name, 'STE RITA')
  assert.deepEqual(e.phones, ['2734725817'])
  assert.equal(e.address, 'Route du Gabon Res Maracana')
})

test('document d’Abidjan : communes, sous-zones et semaines', () => {
  const list = parseAbidjan(ABIDJAN)
  assert.deepEqual(list.map((e) => [e.week.slice(0, 10), e.commune, e.name]), [
    ['2026-10-03', 'Abobo', 'DU CENTRE'],
    ['2026-10-03', 'Cocody', 'ANGRE'],
    ['2026-10-03', 'Yopougon', 'STE MARIE'],
    ['2026-10-31', 'Abobo', 'AZUR'],
  ])
  assert.deepEqual(list[0].phones, ['0747859009', '0140275476', '0585026152'])
  assert.match(list[0].address, /^Abobo Avocatier/)
  assert.equal(list[1].address, 'Sur Prolongement Bd Latrille') // ancien numéro à 8 chiffres écarté
})

test('document de l’intérieur : ville en colonne de gauche', () => {
  const list = parseInterior(INTERIOR)
  assert.deepEqual(list.map((e) => [e.city, e.commune, e.name]), [
    ['Sinfra', 'Sinfra', 'KAVOUDROH'], ['Abidjan', 'Songon', 'NOTRE DAME DE LA PAIX'], ['Bondoukou', 'Bondoukou', 'DU ZANZAN'], ['Oumé', 'Oumé', 'SOURCE DE VIE'],
  ])
  assert.deepEqual(list[1].phones, ['0758176225', '0142241678'])
  // Sous-sections : calendrier propre (couvre aussi les 1er et 2 octobre ; Oumé change le lundi)
  assert.deepEqual([list[2].week, list[2].end], ['2026-09-26T08:00:00.000Z', '2026-10-03T08:00:00.000Z'])
  assert.deepEqual([list[3].week, list[3].end, list[3].phones], ['2026-10-26T08:00:00.000Z', '2026-11-02T08:00:00.000Z', ['0767338131', '2721748639']])
})

test('fusion : semaines de garde, ajout des pharmacies inconnues, garde de la semaine en cours', () => {
  const weeks = [parseWeek('SEMAINE DU SAMEDI 03 AU VENDREDI 09 OCTOBRE 2026'), parseWeek('SEMAINE DU SAMEDI 31 OCTOBRE AU VENDREDI 06 NOVEMBRE 2026')]
  const rosters = [{ weeks, entries: parseAbidjan(ABIDJAN) }]
  const base = { id: 'pg-1', city: 'Abidjan', region: '', position: { lat: 5.43, lng: -4.03 }, hours: [], services: [], gardeGroup: -1 }
  const data = {
    garde: { start: '2026-10-03T00:00:00.000Z', end: '2026-10-10T08:00:00.000Z', label: 'ancienne' },
    counts: { total: 3, garde: 1 },
    pharmacies: [
      { ...base, id: 'pg-1', name: 'Pharmacie du Centre', commune: 'Abobo', phone: '+225 07 47 85 90 09', garde: { start: '2026-10-03T00:00:00.000Z', end: '2026-10-10T08:00:00.000Z' } },
      { ...base, id: 'pg-2', name: 'Pharmacie Azur', commune: 'Abobo', phone: '' },
      { ...base, id: 'pg-3', name: 'Pharmacie Autre', commune: 'Abobo', phone: '', garde: { start: '2026-10-03T00:00:00.000Z', end: '2026-10-10T08:00:00.000Z' } },
    ],
  }
  const out = mergeRoster(data, rosters, new Date('2026-11-02T12:00:00Z'))
  const byId = Object.fromEntries(out.pharmacies.map((p) => [p.id, p]))
  assert.deepEqual(byId['pg-1'].gardes, [{ start: '2026-10-03T08:00:00.000Z', end: '2026-10-10T08:00:00.000Z' }])
  assert.equal(byId['pg-1'].garde, undefined) // semaine passée
  assert.deepEqual(byId['pg-2'].garde, { start: '2026-10-31T08:00:00.000Z', end: '2026-11-07T08:00:00.000Z' })
  assert.equal(byId['pg-2'].phone, '+225 07 59 85 10 59') // numéro complété depuis le document
  assert.equal(byId['pg-3'].garde, undefined) // le document fait foi sur sa période
  assert.equal(out.garde.start, '2026-10-31T08:00:00.000Z')
  assert.equal(out.counts.garde, 1)
  const added = out.pharmacies.filter((p) => p.id.startsWith('rs-'))
  assert.deepEqual(added.map((p) => [p.name, p.commune]).sort(), [['Pharmacie Angre', 'Cocody'], ['Pharmacie Ste Marie', 'Yopougon']])
  // Idempotent
  const again = mergeRoster(out, rosters, new Date('2026-11-02T12:00:00Z'))
  assert.deepEqual([again.pharmacies, again.garde, again.counts], [out.pharmacies, out.garde, out.counts])
})
