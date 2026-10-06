/**
 * Forme galénique : déduction depuis le libellé commercial (quand la source ne la donne pas)
 * et regroupement en familles pour les pictogrammes. Les pictogrammes sont des illustrations
 * de la forme, jamais une photo du produit.
 */

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

// Ordre important : les formes les plus spécifiques d'abord (ex. « SUSP INJ » est un injectable).
const FORM_RULES: [string, RegExp][] = [
  ['Spray', /\bSPRAY\b|AEROSOL|INHAL|NEBUL|DISKUS|\bPULV/],
  ['Injectable', /\bINJ|[A-Z]INJ\b|\bIN J\b|\bAMP(OULE)?S?\b|SERINGUE|\bPERF|\bSERUM\b/],
  ['Collyre', /COLLYRE|\bCOLL\b|\bCY\b|[A-Z]CY(?= \d| FL\b)|\bOPHT|\bOPTH/],
  ['Suppositoire', /SUPPO|\bSUPP\b|GEL RECTAL/],
  ['Ovule', /\bOVULES?\b/],
  ['Gouttes', /\bGOUTTES?\b|\bGTTES?\b|AURIC|NASAL/],
  ['Sirop', /SIROP|\bSP FL\b/],
  ['Suspension buvable', /\bSUSP|\bSUP BUV/],
  ['Sachet', /SACHETS?|\bSACH\b|GRANUL|\bSTICK\b|P(DRE|OUDRE) ORALE/],
  ['Crème', /CREME/],
  ['Pommade', /POMMADE|\bPDE|[A-Z]PDE\b/],
  ['Lotion', /LOTION|\bLAIT\b|EMULS|SHAMP|\bTALC\b|[A-Z]TALC\b|P(DRE|OUDRE)|\bP APPL/],
  ['Gel', /\bGEL (\d|P APPL|TUBE|T \d|BUCAL|GINGIVAL|DERM|EN RECIPIENT)|[A-Z]GEL \d|GEL \d/],
  ['Gélule', /GELULE|GELLULE|\bGLES?\b|\bGEL B\b|CAPS\b|CAPSULE/],
  ['Comprimé', /\bCPR?\b|COMP\b|COMPRIM|CPR?B\b|CPR?(?=\d| \d| B\b| PELL| DISP| EFF| SEC)|[A-Z]CP\b/],
  ['Solution', /\bSOL\b|SOLUTION|\bSOL\d|\bBUV|BAIN DE BOUCHE/],
]

/** Forme déduite du libellé (ex. « ADRIDECP2MG B/30 » → « Comprimé »), ou undefined si incertaine. */
export function guessForm(name: string): string | undefined {
  const n = norm(name)
  return FORM_RULES.find(([, re]) => re.test(n))?.[0]
}

export type FormFamily = 'comprime' | 'gelule' | 'liquide' | 'injectable' | 'topique' | 'gouttes' | 'suppositoire' | 'inhalation' | 'sachet' | 'autre'

export const FORM_FAMILY_LABEL: Record<FormFamily, string> = {
  comprime: 'Comprimé',
  gelule: 'Gélule',
  liquide: 'Forme buvable',
  injectable: 'Injectable',
  topique: 'Application sur la peau',
  gouttes: 'Gouttes',
  suppositoire: 'Suppositoire / ovule',
  inhalation: 'Spray / inhalation',
  sachet: 'Sachet',
  autre: 'Forme non précisée',
}

export function formFamily(form?: string): FormFamily {
  if (!form) return 'autre'
  const f = norm(form)
  if (/INJECT/.test(f)) return 'injectable'
  if (/COLLYRE|AURICUL|NASAL|GOUTTE|OPHTA/.test(f)) return 'gouttes'
  if (/SUPPO|OVULE/.test(f)) return 'suppositoire'
  if (/SPRAY|AEROSOL|INHAL/.test(f)) return 'inhalation'
  if (/CREME|POMMADE|\bGEL\b|LOTION|DERMIQUE|EXTERNE/.test(f)) return 'topique'
  if (/SACHET|GRANUL|POUDRE/.test(f)) return 'sachet'
  if (/GELULE|CAPSULE/.test(f)) return 'gelule'
  if (/COMPRIM/.test(f)) return 'comprime'
  if (/SIROP|SUSPENSION|SOLUTION|BUVABLE|FLACON/.test(f)) return 'liquide'
  return 'autre'
}
