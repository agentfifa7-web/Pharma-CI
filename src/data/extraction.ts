import type { Medication, PrescriptionLine } from '../types'
import { MEDICATIONS } from './medications'

/**
 * Lecture d'ordonnance par OCR (tesseract.js, exécuté dans le navigateur).
 *
 * Le texte est lu tel quel sur le document : chaque ligne retenue garde son libellé EXACT
 * (jamais reformulé). Un rapprochement avec la base PHARMA MED est proposé à titre indicatif
 * (même nom commercial, dosage identique si possible) et le patient vérifie chaque ligne.
 * Si rien n'est reconnu, aucune ligne n'est inventée : la saisie manuelle prend le relais.
 *
 * Les fichiers du moteur (worker, cœur WebAssembly, données de langue « fra ») sont téléchargés
 * à la première utilisation depuis le CDN par défaut de tesseract.js, puis mis en cache par le navigateur.
 */

export type OcrResult = {
  /** Texte brut lu sur l'ensemble des pages. */
  text: string
  lines: PrescriptionLine[]
  /** Documents non lus automatiquement (PDF) : saisie manuelle requise. */
  unsupported: string[]
}

const STATUS_FR: Record<string, string> = {
  'loading tesseract core': 'Chargement du moteur de lecture',
  'initializing tesseract': 'Initialisation du moteur',
  'initialized tesseract': 'Moteur prêt',
  'loading language traineddata': 'Chargement du français',
  'loaded language traineddata': 'Français chargé',
  'initializing api': 'Préparation de la lecture',
  'initialized api': 'Préparation terminée',
  'recognizing text': 'Lecture du document',
}

const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

export async function readPrescription(files: File[], onProgress?: (p: number, status: string) => void): Promise<OcrResult> {
  const images = files.filter((f) => !isPdf(f))
  const unsupported = files.filter(isPdf).map((f) => f.name)
  if (!images.length) return { text: '', lines: [], unsupported }

  let current = 0
  const report = (p: number, status: string) => onProgress?.(Math.min(1, Math.max(0, p)), status)
  report(0, 'Chargement du moteur de lecture')

  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('fra', 1, {
    logger: (m) => {
      const label = STATUS_FR[m.status] ?? 'Lecture du document'
      // Chargement ≈ 20 %, reconnaissance des pages ≈ 80 %.
      if (m.status === 'recognizing text') report(0.2 + (0.8 * (current + (m.progress || 0))) / images.length, label)
      else report(0.2 * (m.progress || 0), label)
    },
  })
  const texts: string[] = []
  try {
    for (current = 0; current < images.length; current++) {
      const { data } = await worker.recognize(images[current]!)
      texts.push(data.text ?? '')
    }
  } finally {
    await worker.terminate().catch(() => undefined)
  }
  report(1, 'Lecture terminée')
  const text = texts.join('\n')
  return { text, lines: linesFromText(text), unsupported }
}

// ---------------------------------------------------------------------------
// Rapprochement texte → base PHARMA MED

/** Mots trop génériques pour identifier un produit à eux seuls. */
const GENERIC = new Set(
  'VACCIN SOLUTION SOLUTE SIROP CREME POMMADE GELULE GELULES COMPRIME COMPRIMES SUSPENSION INJECTABLE COLLYRE SERUM SPRAY LAIT HUILE GOUTTES BAIN SAVON SHAMPOOING LOTION POUDRE SACHET SACHETS AMPOULE FLACON TUBE BOITE BTE PLAQUETTE DETAIL ENFANT ENFANTS ADULTE ADULTES BEBE NOURRISSON FORTE FORT PLUS SIMPLE DOUX DOUCE EAU GLUCOSE SODIUM CHLORURE VITAMINE VITAMINES CALCIUM MAGNESIUM POTASSIUM FER ZINC SPECIAL MEDICAL MEDICALE PHARMACIE DOCTEUR ORDONNANCE PATIENT TRAITEMENT JOUR JOURS MATIN SOIR MIDI PENDANT FOIS PRENDRE'.split(' '),
)

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()

const words = (s: string) => norm(s).split(/[^A-Z0-9]+/).filter(Boolean)

const DOSE_RE = /(\d+(?:[.,]\d+)?)\s*(MG|G|ML|µG|UG|MCG|UI|%)(?![A-Z])/i
const doseKey = (s?: string) => {
  const m = s ? DOSE_RE.exec(norm(s).replace(/µ/g, 'U')) : null
  return m ? `${m[1]!.replace(',', '.')}${m[2]!.toUpperCase().replace('MCG', 'UG')}` : undefined
}

type Index = { size: number; byWord: Map<string, Medication[]>; byPrefix: Map<string, string[]> }
let INDEX: Index | null = null

/** Index « premier mot du nom commercial » → produits (recalculé si la base a changé). */
function index(): Index {
  if (INDEX && INDEX.size === MEDICATIONS.length) return INDEX
  const byWord = new Map<string, Medication[]>()
  for (const m of MEDICATIONS) {
    const w = words(m.brand)[0]
    if (!w || w.length < 4 || /^\d/.test(w) || GENERIC.has(w)) continue
    const list = byWord.get(w)
    if (list) list.push(m)
    else byWord.set(w, [m])
  }
  const byPrefix = new Map<string, string[]>()
  for (const w of byWord.keys()) {
    const k = w.slice(0, 2)
    const list = byPrefix.get(k)
    if (list) list.push(w)
    else byPrefix.set(k, [w])
  }
  INDEX = { size: MEDICATIONS.length, byWord, byPrefix }
  return INDEX
}

/** Distance d'édition bornée à 1 (tolérance aux erreurs d'OCR sur les noms longs). */
function withinOneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else {
      i++
      j++
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

function findBrandWord(tokens: string[], idx: Index) {
  for (const t of tokens) if (t.length >= 4 && idx.byWord.has(t)) return t
  for (const t of tokens) {
    if (t.length < 6 || /\d/.test(t)) continue
    const near = idx.byPrefix.get(t.slice(0, 2))?.find((w) => withinOneEdit(t, w))
    if (near) return near
  }
  return undefined
}

/** Familles de formes galéniques (abréviations usuelles des ordonnances et des libellés). */
const FORMS: [string, RegExp][] = [
  ['cp', /\b(CP|CPR|CPS|COMP|COMPRIMES?|CPRS?)\b/],
  ['gel', /\b(GEL|GELU|GELULES?)\b/],
  ['buv', /\b(SACH|SACHETS?|SUSP|SUSPENSION|SIROP|SIR|BUV|BUVABLE|SOL BUV)\b/],
  ['inj', /\b(INJ|INJECTABLE|AMP|AMPOULES?|IV|IM|PERF)\b/],
  ['top', /\b(CREME|CR|POMMADE|POM|GEL DERM|LOTION|COLLYRE|GTTES?|GOUTTES)\b/],
  ['sup', /\b(SUPPO|SUPP|SUPPOSITOIRES?)\b/],
]
const formsOf = (text: string) => new Set(FORMS.filter(([, re]) => re.test(text)).map(([k]) => k))

function bestMatch(candidates: Medication[], tokens: string[], dose?: string) {
  const set = new Set(tokens)
  const lineForms = formsOf(tokens.join(' '))
  let best: Medication | undefined
  let bestScore = -1
  for (const m of candidates) {
    const mw = words(m.brand)
    let score = mw.filter((w) => set.has(w)).length
    if (dose && (doseKey(m.dosage) === dose || doseKey(m.brand) === dose)) score += 5
    if (lineForms.size) {
      const mf = formsOf(`${norm(m.brand)} ${norm(m.form ?? '')}`)
      for (const f of lineForms) if (mf.has(f)) score += 2
    }
    if (m.price) score += 0.5
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

/** Transforme le texte OCR en lignes candidates (libellé conservé à l'identique). */
export function linesFromText(text: string): PrescriptionLine[] {
  const idx = index()
  const out: PrescriptionLine[] = []
  const seen = new Set<string>()
  text.split(/\r?\n/).forEach((raw, n) => {
    const label = raw.trim()
    if (label.length < 3) return
    const tokens = words(label)
    if (!tokens.some((t) => /[A-Z]{3,}/.test(t))) return
    const brand = findBrandWord(tokens, idx)
    const doseMatch = DOSE_RE.exec(label)
    if (!brand && !doseMatch) return
    const key = norm(label)
    if (seen.has(key)) return
    seen.add(key)
    const dose = doseKey(label)
    const med = brand ? bestMatch(idx.byWord.get(brand)!, tokens, dose) : undefined
    out.push({
      id: `ln-ocr-${n}-${out.length}`,
      label,
      medicationId: med?.id,
      dosage: doseMatch ? doseMatch[0] : (med?.dosage ?? ''),
      quantity: 1,
    })
  })
  return out
}
