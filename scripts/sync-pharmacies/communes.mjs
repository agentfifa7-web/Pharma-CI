// Référentiel des localités : rattache les libellés du site à une commune / ville
// et fournit un centre approximatif quand la fiche n'a pas de coordonnées GPS.

export const ABIDJAN_COMMUNES = {
  'Abobo': [5.418, -4.02],
  'Adjamé': [5.358, -4.023],
  'Anyama': [5.495, -4.052],
  'Attécoubé': [5.334, -4.042],
  'Bingerville': [5.356, -3.89],
  'Cocody': [5.36, -3.987],
  'Koumassi': [5.296, -3.949],
  'Marcory': [5.304, -3.984],
  'Plateau': [5.323, -4.019],
  'Port-Bouët': [5.256, -3.927],
  'Songon': [5.316, -4.26],
  'Treichville': [5.293, -4.005],
  'Yopougon': [5.3365, -4.085],
}

/** Zones d'Abidjan citées par le site, rattachées à leur commune. */
const ABIDJAN_ZONES = [
  [/WILLIAMSVILLE/, 'Adjamé'],
  [/AKOUEDO|PALMERAIE|ABATTA|RIVIERA|II PLATEAUX|DEUX PLATEAUX|ANGRE/, 'Cocody'],
  [/ALEPE|MONTEZO|BROFODOUME/, 'Bingerville'],
  [/VRIDI|ADJOUFFOU|GONZAQ|ANANI/, 'Port-Bouët'],
  [/ABOBODOUME|LOCODJORO/, 'Attécoubé'],
  [/ALLOKOI|NIANGON/, 'Yopougon'],
  [/ANOUMAB/, 'Marcory'],
  [/KM 17/, 'Songon'],
]

/** Villes de l'intérieur (coordonnées approximatives du centre-ville). */
export const CITIES = {
  'Abengourou': [6.73, -3.496], 'Aboisso': [5.468, -3.207], 'Adiaké': [5.286, -3.304], 'Adzopé': [6.107, -3.86],
  'Agboville': [5.928, -4.213], 'Agnibilékrou': [7.13, -3.204], 'Akoupé': [6.384, -3.888], 'Azaguié': [5.63, -4.08],
  'Bayota': [5.98, -5.82], 'Bondoukou': [8.04, -2.8], 'Bonoua': [5.272, -3.596], 'Bouaflé': [6.99, -5.744],
  'Bouaké': [7.69, -5.03], 'Dabou': [5.325, -4.377], 'Daloa': [6.877, -6.45], 'Danané': [7.26, -8.155],
  'Diégonéfla': [6.13, -5.53], 'Dimbokro': [6.65, -4.705], 'Divo': [5.837, -5.357], 'Duékoué': [6.742, -7.349],
  'Ferkessédougou': [9.593, -5.197], 'Gagnoa': [6.132, -5.95], 'Grand-Bassam': [5.211, -3.739], 'Grand-Béréby': [4.646, -6.92],
  'Guiglo': [6.543, -7.493], 'Hiré': [6.18, -5.29], 'Issia': [6.49, -6.585], 'Katiola': [8.137, -5.1], 'Korhogo': [9.458, -5.629],
  'Lakota': [5.85, -5.68], 'Man': [7.412, -7.554], 'Odienné': [9.51, -7.565], 'San-Pédro': [4.748, -6.636], 'Sassandra': [4.95, -6.083],
  'Sinfra': [6.62, -5.91], 'Soubré': [5.785, -6.594], 'Tabou': [4.423, -7.353], 'Tiassalé': [5.898, -4.823], 'Toumodi': [6.552, -5.019],
  'Vavoua': [7.38, -6.48], 'Yamoussoukro': [6.82, -5.277],
}

/** Graphies alternatives rencontrées sur le site. */
const CITY_ALIASES = { AGNIBILEKRO: 'Agnibilékrou', FERKESSEDOUGOU: 'Ferkessédougou', 'GRAND BEREBY': 'Grand-Béréby' }

export const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

const findKey = (dict, raw) => {
  const n = strip(raw)
  return Object.keys(dict).find((k) => n === strip(k) || n.startsWith(strip(k) + ' ') || strip(k).replace(/ /g, '') === n.replace(/ /g, ''))
}

/**
 * Résout un libellé de zone du site (« COCODY - RIVIERA », « YOPOUGON - Secteur 3 »,
 * « ZONE AKOUEDO + PALMERAIE… », « BOUAKE ») en { city, commune, quartier }.
 */
export function resolveZone(label, table) {
  const n = strip(label)
  if (table === 'abidjan' || Object.keys(ABIDJAN_COMMUNES).some((c) => n.startsWith(strip(c)))) {
    let commune = Object.keys(ABIDJAN_COMMUNES).find((c) => n.startsWith(strip(c)) || n.startsWith(strip(c).replace(' ', '')))
    if (!commune && n.startsWith('PORT BOUET')) commune = 'Port-Bouët'
    if (!commune) {
      const zone = ABIDJAN_ZONES.find(([re]) => re.test(n))?.[1]
      if (zone) return { city: 'Abidjan', commune: zone, quartier: titleCase(label.replace(/^ZONE\s+/i, '').replace(/\s*\+\s*/g, ' / ')) }
    }
    if (commune) {
      const quartier = label.split(/\s[-–]\s/).slice(1).join(' - ').trim() || undefined
      return { city: 'Abidjan', commune, quartier: quartier ? titleCase(quartier) : undefined }
    }
    if (table === 'abidjan') return { city: 'Abidjan', commune: titleCase(label.replace(/^ZONE\s+/i, '')), quartier: undefined }
  }
  const city = CITY_ALIASES[n] ?? findKey(CITIES, label) ?? titleCase(label)
  return { city, commune: city, quartier: undefined }
}

export function centerOf(city, commune) {
  const c = (city === 'Abidjan' ? ABIDJAN_COMMUNES[commune] : CITIES[city]) ?? CITIES[city] ?? ABIDJAN_COMMUNES[commune]
  return c ? { lat: c[0], lng: c[1] } : undefined
}

const SMALL = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l', 'au', 'aux', 'en'])
export function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) =>
      w
        .split(/([-'’])/)
        .map((p) => (i > 0 && SMALL.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
        .join(''),
    )
    .join(' ')
    .replace(/\bSt\b/g, 'St')
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III')
}
