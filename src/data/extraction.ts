import type { Medication, PrescriptionLine } from '../types'
import { MEDICATIONS } from './medications'
import { imagePreview } from '../lib/crypto'

/**
 * Lecture d'ordonnance.
 *
 * 1. Lecture par IA (recommandée, sait lire l'écriture manuscrite) : si l'adresse du service
 *    « ordonnance-ia » est configurée (VITE_ORDONNANCE_IA_URL ou ORDONNANCE_IA_URL ci-dessous), les photos
 *    (et PDF) sont envoyées à ce service (services/ordonnance-ia), qui interroge un modèle de vision.
 *    En cas d'échec (service saturé, délai dépassé), un message clair est renvoyé et le patient peut relancer
 *    la lecture ou saisir les lignes : on ne bascule pas sur l'OCR, incapable de lire une écriture manuscrite.
 * 2. Si le service n'est pas configuré : OCR tesseract.js exécuté dans le navigateur
 *    (efficace sur le texte imprimé, mais incapable de lire une écriture manuscrite).
 *
 * Le texte est lu tel quel sur le document : chaque ligne retenue garde son libellé EXACT
 * (jamais reformulé). Un rapprochement avec la base PHARMA MED est proposé à titre indicatif
 * (même nom commercial, dosage identique si possible) et le patient vérifie chaque ligne.
 * Si rien n'est reconnu, aucune ligne n'est inventée : la saisie manuelle prend le relais.
 *
 * Les fichiers du moteur (worker, cœur WebAssembly, données de langue « fra ») sont téléchargés
 * à la première utilisation depuis le CDN par défaut de tesseract.js, puis mis en cache par le navigateur.
 */

/** Adresse du service de lecture par IA (Cloudflare Worker). Vide = lecture par IA désactivée. */
export const ORDONNANCE_IA_URL = 'https://ordonnance-ia.agentfifa7.workers.dev'
const IA_URL = ((import.meta.env?.VITE_ORDONNANCE_IA_URL as string | undefined) || ORDONNANCE_IA_URL).trim()
export const aiReadingEnabled = () => !!IA_URL

export type OcrResult = {
  /** Moteur utilisé : « ia » (modèle de vision) ou « ocr » (tesseract.js). */
  engine: 'ia' | 'ocr'
  /** Texte brut lu sur l'ensemble des pages. */
  text: string
  lines: PrescriptionLine[]
  /** Documents non lus automatiquement (PDF) : saisie manuelle requise. */
  unsupported: string[]
  /** Échec de la lecture par IA (message à afficher au patient). */
  error?: string
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
  if (!IA_URL) return readWithOcr(files, onProgress)
  try {
    return await readWithAi(files, onProgress)
  } catch (e) {
    onProgress?.(1, 'Lecture interrompue')
    return { engine: 'ia', text: '', lines: [], unsupported: [], error: e instanceof Error ? e.message : String(e) }
  }
}

/** Type d'une ligne renvoyée par le service de lecture par IA. */
export type AiLine = { texte?: string; nom?: string; dosage?: string; forme?: string; posologie?: string; duree?: string; quantite?: number; confiance?: number }

const toBase64 = (file: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })

/** Délai maximal d'attente du service (le service lui-même abandonne à 55 s). */
const AI_TIMEOUT_MS = 70_000

class AiError extends Error {
  retry: boolean
  constructor(message: string, retry: boolean) {
    super(message)
    this.retry = retry
  }
}

async function callAi(payload: { mimeType: string; data: string }[]): Promise<AiLine[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(IA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: payload }), signal: ctrl.signal })
  } catch {
    throw ctrl.signal.aborted
      ? new AiError('La lecture a pris trop de temps. Vérifiez votre connexion puis relancez la lecture.', false)
      : new AiError('Pas de connexion au service de lecture. Vérifiez votre connexion internet puis relancez la lecture.', true)
  } finally {
    clearTimeout(timer)
  }
  const body = (await res.json().catch(() => ({}))) as { lines?: AiLine[]; error?: string }
  if (res.ok && Array.isArray(body.lines)) return body.lines
  const reason = body.error ?? `erreur ${res.status}`
  throw new AiError(`La lecture automatique a échoué (${reason}). Relancez la lecture ou saisissez les lignes.`, res.status >= 500 && res.status !== 504)
}

async function readWithAi(files: File[], onProgress?: (p: number, status: string) => void): Promise<OcrResult> {
  const report = (p: number, status: string) => onProgress?.(p, status)
  report(0.05, 'Préparation des photos')
  // Photos réduites à 1600 px en bonne qualité (lisibles, mais rapides à envoyer sur mobile) ; PDF envoyés tels quels.
  const payload = await Promise.all(
    files.map(async (f) => {
      if (isPdf(f)) return { mimeType: 'application/pdf', data: await toBase64(f) }
      const url = await imagePreview(f, 1600, 0.85).catch(() => undefined)
      return url ? { mimeType: 'image/jpeg', data: url.split(',')[1] ?? '' } : { mimeType: f.type || 'image/jpeg', data: await toBase64(f) }
    }),
  )
  // Progression estimée (le service ne renvoie rien avant la fin) : elle ralentit sans jamais rester figée.
  const t0 = Date.now()
  const timer = setInterval(() => {
    const s = (Date.now() - t0) / 1000
    const status = s < 20 ? "Lecture de l'écriture par l'IA" : s < 45 ? 'La lecture prend un peu plus de temps que prévu…' : 'Dernier essai en cours…'
    report(0.2 + 0.75 * (1 - Math.exp(-s / 15)), status)
  }, 500)
  try {
    let items: AiLine[]
    try {
      items = await callAi(payload)
    } catch (e) {
      // Une seule nouvelle tentative, et seulement pour une coupure réseau ou un service momentanément indisponible.
      if (!(e instanceof AiError) || !e.retry) throw e
      report(0.5, 'Nouvel essai de lecture')
      items = await callAi(payload)
    }
    report(1, 'Lecture terminée')
    const lines = linesFromAi(items)
    const text = items.map((l) => [l.texte, l.posologie, l.duree].filter(Boolean).join(' — ')).join('\n')
    return { engine: 'ia', text, lines, unsupported: [] }
  } finally {
    clearInterval(timer)
  }
}

async function readWithOcr(files: File[], onProgress?: (p: number, status: string) => void): Promise<OcrResult> {
  const images = files.filter((f) => !isPdf(f))
  const unsupported = files.filter(isPdf).map((f) => f.name)
  if (!images.length) return { engine: 'ocr', text: '', lines: [], unsupported }

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
  return { engine: 'ocr', text, lines: linesFromText(text), unsupported }
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

type Index = { size: number; byWord: Map<string, Medication[]>; byPrefix: Map<string, string[]>; byDci: Map<string, Medication[]> }
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
  // DCI d'un seul principe actif (ex. « PARACETAMOL ») → produits : sert quand l'ordonnance prescrit en DCI.
  const byDci = new Map<string, Medication[]>()
  for (const m of MEDICATIONS) {
    if (!m.dci || m.dci.includes('+')) continue
    const k = words(m.dci).join(' ')
    if (!k) continue
    const list = byDci.get(k)
    if (list) list.push(m)
    else byDci.set(k, [m])
  }
  INDEX = { size: MEDICATIONS.length, byWord, byPrefix, byDci }
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

/** Distance d'édition (Levenshtein) bornée : renvoie max + 1 dès que la borne est dépassée. */
function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
      rowMin = Math.min(rowMin, cur[j]!)
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]!
}

/** Tolérance selon la longueur du mot : 0 erreur sous 5 lettres, 1 jusqu'à 7, 2 au-delà. */
const tolerance = (w: string) => (w.length < 5 ? 0 : w.length < 8 ? 1 : 2)

/** Rapprochement d'un médicament lu par l'IA (nom commercial ou DCI) avec la base PHARMA MED. */
export function matchMedication(name: string, dosage?: string, form?: string): Medication | undefined {
  const idx = index()
  const tokens = words(`${name} ${form ?? ''}`)
  const nameTokens = words(name).filter((t) => !/^\d/.test(t))
  const dose = doseKey(dosage) ?? doseKey(name)

  // 1. Nom commercial (premier mot, avec tolérance aux fautes de lecture).
  let brand = findBrandWord(nameTokens, idx)
  if (!brand) {
    for (const t of nameTokens) {
      const tol = tolerance(t)
      if (!tol || GENERIC.has(t)) continue
      let best: [string, number] | undefined
      for (const w of idx.byPrefix.get(t.slice(0, 2)) ?? []) {
        const d = editDistance(t, w, tol)
        if (d <= tol && (!best || d < best[1])) best = [w, d]
      }
      if (best) {
        brand = best[0]
        break
      }
    }
  }
  const byBrand = brand ? idx.byWord.get(brand)! : []

  // 2. DCI (ex. « Paracétamol 1000 mg ») : produits de même DCI. Les deux listes sont comparées ensemble
  //    pour retenir le meilleur dosage (« PARACETAMOL 1000 mg » → un produit dosé à 1000 mg).
  const key = nameTokens.filter((t) => !GENERIC.has(t)).join(' ')
  let byDci = key ? idx.byDci.get(key) : undefined
  if (key && !byDci && !brand) {
    const tol = tolerance(key)
    let best: [string, number] | undefined
    for (const k of idx.byDci.keys()) {
      const d = editDistance(key, k, tol)
      if (d <= tol && (!best || d < best[1])) best = [k, d]
    }
    byDci = best ? idx.byDci.get(best[0]) : undefined
  }
  const candidates = [...byBrand, ...(byDci ?? [])]
  return candidates.length ? bestMatch(candidates, tokens, dose) : undefined
}

/** Transforme les lignes lues par l'IA en lignes d'ordonnance (libellé = texte lu sur le document). */
export function linesFromAi(items: AiLine[]): PrescriptionLine[] {
  const out: PrescriptionLine[] = []
  const seen = new Set<string>()
  items.forEach((it, n) => {
    const label = (it.texte || [it.nom, it.dosage, it.forme].filter(Boolean).join(' ')).trim()
    const name = (it.nom || it.texte || '').trim()
    if (label.length < 2 || !name) return
    const key = norm(label)
    if (seen.has(key)) return
    seen.add(key)
    const med = matchMedication(name, it.dosage, it.forme)
    const instructions = [it.posologie, it.duree && `pendant ${it.duree}`.replace(/^pendant pendant/, 'pendant')].filter(Boolean).join(', ')
    out.push({
      id: `ln-ia-${n}-${out.length}`,
      label,
      medicationId: med?.id,
      dosage: it.dosage?.trim() || med?.dosage || '',
      quantity: Math.max(1, Math.round(Number(it.quantite) || 1)),
      instructions: instructions || undefined,
    })
  })
  return out
}
