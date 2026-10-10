/**
 * PHARMA CI — lecture des ordonnances manuscrites par IA (Cloudflare Worker).
 *
 * Le site est statique (GitHub Pages) : il ne peut pas contenir de clé secrète. Ce petit service
 * garde la clé de l'API Gemini (Google AI Studio) et transmet les photos d'ordonnance au modèle,
 * qui sait lire l'écriture manuscrite (contrairement à l'OCR Tesseract utilisé dans le navigateur).
 *
 * Mise en place : voir services/ordonnance-ia/README.md.
 *
 * Variables (Cloudflare → Worker → Settings → Variables and Secrets) :
 *  - GEMINI_API_KEY   (secret, obligatoire) clé créée sur https://aistudio.google.com/apikey
 *  - GEMINI_MODEL     (facultatif) modèle Gemini essayé en premier (sinon gemini-flash-latest)
 *  - ALLOWED_ORIGINS  (facultatif) origines autorisées, séparées par des virgules
 *
 * Requête : POST JSON { files: [{ mimeType: "image/jpeg" | "application/pdf" | …, data: "<base64>" }] }
 * Réponse : { lines: [{ texte, nom, dosage, forme, posologie, duree, quantite, confiance }] }
 */

const DEFAULT_ORIGINS = ['https://www.pharma-ci.org', 'https://pharma-ci.org', 'https://agentfifa7-web.github.io', 'http://localhost:5173', 'http://localhost:4173']
const VERSION = 2
const MAX_FILES = 6
const MAX_BYTES = 12 * 1024 * 1024 // total des fichiers (base64 décodé)
const MIME_OK = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/
// Modèles essayés dans l'ordre : si l'un est saturé (429/503), trop lent ou indisponible, on passe au suivant.
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite']
const ATTEMPT_TIMEOUT_MS = 25_000 // durée maximale d'un essai
const TOTAL_BUDGET_MS = 55_000 // durée maximale de la lecture complète (le site abandonne à 70 s)

const PROMPT = `Tu es un assistant de pharmacie en Côte d'Ivoire. On te montre la photo d'une ordonnance médicale
(souvent manuscrite, parfois floue, de travers ou mal éclairée). Relève UNIQUEMENT les médicaments prescrits,
dans l'ordre où ils apparaissent.

Abréviations courantes : cp = comprimé, gél = gélule, sp/sir = sirop, sach = sachet, inj = injectable, supp = suppositoire,
amp = ampoule, gttes = gouttes, bte = boîte, fl = flacon, QSP = quantité suffisante pour, « x 3/j » = trois fois par jour,
« pdt 5j » = pendant 5 jours, « 01 bte » = une boîte. Les lignes sont souvent numérotées (1/, 2/, ①…).

Pour chaque médicament :
- texte : la ligne telle qu'elle est écrite (nom, dosage, forme), sans la posologie, en recopiant fidèlement.
- nom : le nom du médicament (nom commercial ou DCI) écrit correctement en majuscules, en t'aidant de ta connaissance
  des médicaments vendus en Afrique de l'Ouest francophone pour déchiffrer l'écriture (ex. « Paracetamol », « Spasfon »,
  « Amoxicilline », « Fervex », « Doliprane », « Efferalgan », « Ciprofloxacine », « Metronidazole »).
- dosage : ex. « 500 mg », « 1 g », « 250 mg/5 ml » ; vide si absent.
- forme : comprimé, gélule, sirop, sachet, injectable, suppositoire, crème, gouttes… ; vide si absent.
- posologie : ex. « 1 cp x 3/j », « 2 cp le soir » ; vide si absente.
- duree : ex. « 5 jours » ; vide si absente.
- quantite : nombre de boîtes/flacons demandés (« 01 Bte » → 1, « QSP » → 1) ; 1 si non précisé.
- confiance : de 0 à 1, ta certitude sur la lecture du nom.

N'invente jamais un médicament qui n'est pas écrit. Ignore l'en-tête, le nom du patient, du médecin, les tampons,
les signatures et les dates. Si aucun médicament n'est lisible, renvoie une liste vide.`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    lines: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          texte: { type: 'STRING' },
          nom: { type: 'STRING' },
          dosage: { type: 'STRING' },
          forme: { type: 'STRING' },
          posologie: { type: 'STRING' },
          duree: { type: 'STRING' },
          quantite: { type: 'INTEGER' },
          confiance: { type: 'NUMBER' },
        },
        required: ['texte', 'nom'],
      },
    },
  },
  required: ['lines'],
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? ''
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : DEFAULT_ORIGINS).includes(origin)
    const cors = {
      'Access-Control-Allow-Origin': allowed ? origin : DEFAULT_ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    }
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } })

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method === 'GET') {
      const info = { ok: true, service: 'PHARMA CI — lecture des ordonnances', version: VERSION, configured: !!env.GEMINI_API_KEY }
      // https://…workers.dev/?diagnostic : vérifie la clé et la disponibilité de chaque modèle (petite question texte).
      if (new URL(request.url).searchParams.has('diagnostic') && env.GEMINI_API_KEY) {
        const models = [...new Set([env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean))]
        info.models = await Promise.all(models.map((m) => ping(env.GEMINI_API_KEY, m)))
      }
      return json(info)
    }
    if (request.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)
    if (!allowed) return json({ error: 'Origine non autorisée' }, 403)
    if (!env.GEMINI_API_KEY) return json({ error: 'Clé GEMINI_API_KEY absente' }, 500)

    let files
    try {
      files = (await request.json()).files
    } catch {
      return json({ error: 'Requête invalide' }, 400)
    }
    if (!Array.isArray(files) || !files.length || files.length > MAX_FILES) return json({ error: 'Envoyez entre 1 et 6 fichiers' }, 400)
    let total = 0
    for (const f of files) {
      if (!f || typeof f.data !== 'string' || !MIME_OK.test(f.mimeType ?? '')) return json({ error: 'Format de fichier non pris en charge' }, 400)
      total += Math.floor((f.data.length * 3) / 4)
    }
    if (total > MAX_BYTES) return json({ error: 'Fichiers trop volumineux' }, 413)

    const models = [...new Set([env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean))]
    const result = await readWithGemini(env.GEMINI_API_KEY, models, files)
    if (result.lines) return json({ lines: result.lines, model: result.model, attempts: result.attempts })
    return json({ error: result.error, attempts: result.attempts }, result.status ?? 502)
  },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Extrait l'objet JSON de la réponse du modèle (tolère un texte autour ou des balises ```json). */
function parseLines(text) {
  const tries = [text, text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)]
  for (const t of tries) {
    try {
      const parsed = JSON.parse(t)
      if (Array.isArray(parsed?.lines)) return parsed.lines
      if (Array.isArray(parsed)) return parsed
    } catch {
      // essai suivant
    }
  }
  return null
}

/**
 * Interroge Gemini avec reprise automatique : chaque essai est limité dans le temps, et en cas de saturation
 * (429, 500, 503), de délai dépassé ou de réponse illisible, le modèle suivant de la liste est essayé.
 */
async function readWithGemini(apiKey, models, files) {
  const started = Date.now()
  const attempts = []
  const parts = [...files.map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data } })), { text: PROMPT }]
  let lastError = 'Service de lecture indisponible'

  for (const model of models) {
    // Premier essai avec une réflexion du modèle limitée (plus rapide et plus régulier) ; sans ce réglage si le modèle le refuse.
    for (const fast of [true, false]) {
      const left = TOTAL_BUDGET_MS - (Date.now() - started)
      if (left < 4_000) return { error: 'La lecture a pris trop de temps', status: 504, attempts }
      const generationConfig = { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA, maxOutputTokens: 4096 }
      if (fast) generationConfig.thinkingConfig = { thinkingBudget: 1024 }
      const t0 = Date.now()
      let res
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
          signal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, left)),
        })
      } catch (e) {
        attempts.push({ model, fast, ms: Date.now() - t0, error: e?.name === 'TimeoutError' ? 'délai dépassé' : 'réseau' })
        lastError = 'Le service de lecture ne répond pas'
        break // modèle suivant
      }
      const entry = { model, fast, ms: Date.now() - t0, status: res.status }
      attempts.push(entry)
      if (res.ok) {
        const data = await res.json().catch(() => null)
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
        const lines = parseLines(text)
        if (lines) return { lines, model, attempts }
        entry.error = `réponse illisible (${data?.candidates?.[0]?.finishReason ?? 'vide'})`
        lastError = 'Réponse illisible du service de lecture'
        break
      }
      const detail = (await res.text().catch(() => '')).slice(0, 200)
      entry.error = detail
      if (res.status === 400 && fast && /think/i.test(detail)) continue // réessayer ce modèle sans le réglage « rapide »
      if (res.status === 401 || res.status === 403) return { error: 'Clé GEMINI_API_KEY refusée par Google', status: 502, attempts }
      if (res.status === 429) lastError = 'Quota de lecture atteint, réessayez dans une minute'
      else if (res.status === 404) lastError = 'Modèle de lecture introuvable'
      else lastError = `Service de lecture indisponible (${res.status})`
      if (res.status === 429 || res.status >= 500) await sleep(800)
      break // modèle suivant
    }
  }
  return { error: lastError, status: 502, attempts }
}

/** Petite requête texte pour vérifier qu'un modèle répond avec cette clé (diagnostic). */
async function ping(apiKey, model) {
  const t0 = Date.now()
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Réponds seulement : OK' }] }], generationConfig: { maxOutputTokens: 20 } }),
      signal: AbortSignal.timeout(15_000),
    })
    return { model, status: res.status, ms: Date.now() - t0, ...(res.ok ? {} : { error: (await res.text()).slice(0, 160) }) }
  } catch (e) {
    return { model, ms: Date.now() - t0, error: e?.name === 'TimeoutError' ? 'délai dépassé' : 'réseau' }
  }
}
