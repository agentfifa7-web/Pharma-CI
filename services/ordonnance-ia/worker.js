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
 *  - GEMINI_MODEL     (facultatif) modèle Gemini, par défaut « gemini-flash-latest »
 *  - ALLOWED_ORIGINS  (facultatif) origines autorisées, séparées par des virgules
 *
 * Requête : POST JSON { files: [{ mimeType: "image/jpeg" | "application/pdf" | …, data: "<base64>" }] }
 * Réponse : { lines: [{ texte, nom, dosage, forme, posologie, duree, quantite, confiance }] }
 */

const DEFAULT_ORIGINS = ['https://www.pharma-ci.org', 'https://pharma-ci.org', 'https://agentfifa7-web.github.io', 'http://localhost:5173', 'http://localhost:4173']
const MAX_FILES = 6
const MAX_BYTES = 12 * 1024 * 1024 // total des fichiers (base64 décodé)
const MIME_OK = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/

const PROMPT = `Tu es un assistant de pharmacie en Côte d'Ivoire. On te montre la photo d'une ordonnance médicale
(souvent manuscrite, parfois floue, de travers ou mal éclairée). Relève UNIQUEMENT les médicaments prescrits,
dans l'ordre où ils apparaissent.

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
    if (request.method === 'GET') return json({ ok: true, service: 'PHARMA CI — lecture des ordonnances', configured: !!env.GEMINI_API_KEY })
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

    const model = env.GEMINI_MODEL || 'gemini-flash-latest'
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [...files.map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data } })), { text: PROMPT }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
    })
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300)
      return json({ error: `Service de lecture indisponible (${res.status})`, detail }, 502)
    }
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    try {
      const parsed = JSON.parse(text)
      return json({ lines: Array.isArray(parsed.lines) ? parsed.lines : [], model })
    } catch {
      return json({ error: 'Réponse illisible du modèle' }, 502)
    }
  },
}
