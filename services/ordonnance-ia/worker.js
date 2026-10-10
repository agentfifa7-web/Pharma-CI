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
 *  - AGENT_CODE       (secret, pour les missions) code d'accès remis aux agents de livraison
 *  - DB               (liaison D1, pour les missions) base de données partagée entre patients et agents
 *
 * Requête : POST JSON { files: [{ mimeType: "image/jpeg" | "application/pdf" | …, data: "<base64>" }] }
 * Réponse : { lines: [{ texte, nom, dosage, forme, posologie, duree, quantite, confiance }] }
 *
 * Missions (commandes) partagées entre l'application du patient et celle de l'agent, voir handleMissions.
 */

const DEFAULT_ORIGINS = ['https://www.pharma-ci.org', 'https://pharma-ci.org', 'https://agentfifa7-web.github.io', 'http://localhost:5173', 'http://localhost:4173']
const VERSION = 6
const MAX_FILES = 6
const MAX_BYTES = 12 * 1024 * 1024 // total des fichiers (base64 décodé)
const MIME_OK = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/
// Modèles utilisés, par ordre de préférence. « startMs » : moment où le modèle démarre (ou plus tôt si les modèles
// déjà lancés ont tous échoué). Choix d'après le diagnostic du 10/10/2026 avec la clé de PHARMA CI :
// gemini-3.5-flash répond en ~1,3 s ; gemini-3.8-flash et gemini-flash-latest ne répondent pas (25 s).
// Le modèle « lite », très rapide mais moins précis sur l'écriture manuscrite, sert de secours.
// « thinking » : réglages de réflexion essayés dans l'ordre (le suivant si le modèle refuse le réglage ; null = aucun réglage).
const FAST_THINKING = [{ thinkingLevel: 'low' }, { thinkingBudget: 1024 }, null]
const PLAN = [
  { model: 'gemini-3.5-flash', startMs: 0, thinking: FAST_THINKING },
  { model: 'gemini-flash-lite-latest', startMs: 10_000, thinking: [null] },
]
// Modèles testés en plus par le diagnostic, pour comparaison.
const DIAGNOSTIC_EXTRA = [
  { model: 'gemini-3.8-flash', thinking: FAST_THINKING },
  { model: 'gemini-3.7-flash', thinking: FAST_THINKING },
  { model: 'gemini-3.6-flash', thinking: FAST_THINKING },
  { model: 'gemini-flash-latest', thinking: FAST_THINKING },
  { model: 'gemini-3.1-flash-lite', thinking: [null] },
]
const GRACE_MS = 6_000 // si un modèle moins précis répond d'abord, on attend encore un peu les modèles préférés
const TOTAL_BUDGET_MS = 50_000 // durée maximale de la lecture complète (le site abandonne à 70 s)

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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Agent-Code, X-Mission-Token',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    }
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } })

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(request.url)
    if (url.pathname.startsWith('/missions')) {
      if (!allowed) return json({ error: 'Origine non autorisée' }, 403)
      try {
        return await handleMissions(request, env, url, json)
      } catch (e) {
        return json({ error: `Erreur de la base de données : ${String(e?.message ?? e).slice(0, 200)}` }, 500)
      }
    }
    if (request.method === 'GET') {
      const info = { ok: true, service: 'PHARMA CI — lecture des ordonnances', version: VERSION, configured: !!env.GEMINI_API_KEY, missions: !!env.DB, agentCode: !!env.AGENT_CODE }
      // https://…workers.dev/?diagnostic : vérifie la clé et la disponibilité de chaque modèle (petite question texte).
      if (url.searchParams.has('diagnostic') && env.GEMINI_API_KEY) {
        const specs = [...plan(env), ...DIAGNOSTIC_EXTRA.filter((d) => !plan(env).some((p) => p.model === d.model))]
        const [models, available] = await Promise.all([Promise.all(specs.map((spec) => ping(env.GEMINI_API_KEY, spec))), listFlashModels(env.GEMINI_API_KEY)])
        info.models = models
        info.available = available
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

    const result = await readWithGemini(env.GEMINI_API_KEY, plan(env), files)
    if (result.lines) return json({ lines: result.lines, model: result.model, attempts: result.attempts })
    return json({ error: result.error, attempts: result.attempts }, result.status ?? 502)
  },
}

const API = 'https://generativelanguage.googleapis.com/v1beta'

/** Liste des modèles : GEMINI_MODEL (facultatif) est ajouté en tête, avec un démarrage immédiat. */
function plan(env) {
  return env.GEMINI_MODEL ? [{ model: env.GEMINI_MODEL, startMs: 0, thinking: FAST_THINKING }, ...PLAN.filter((p) => p.model !== env.GEMINI_MODEL)] : PLAN
}

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
 * Essaie un modèle, avec ses réglages de réflexion dans l'ordre (le suivant si Gemini refuse le réglage).
 * Renvoie { lines, model } ou { error, fatal? }.
 */
async function tryModel(apiKey, spec, parts, signal, attempts) {
  for (const thinking of spec.thinking) {
    const generationConfig = { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA, maxOutputTokens: 8192 }
    if (thinking) generationConfig.thinkingConfig = thinking
    const entry = { model: spec.model, reflexion: thinking ? Object.values(thinking)[0] : 'défaut' }
    attempts.push(entry)
    const t0 = Date.now()
    let res
    try {
      res = await fetch(`${API}/models/${encodeURIComponent(spec.model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
        signal,
      })
    } catch {
      entry.ms = Date.now() - t0
      entry.error = signal.aborted ? 'interrompu (délai dépassé ou autre modèle plus rapide)' : 'réseau'
      return { error: 'Le service de lecture ne répond pas' }
    }
    entry.ms = Date.now() - t0
    entry.status = res.status
    if (res.ok) {
      const data = await res.json().catch(() => null)
      const text = data?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? ''
      const lines = parseLines(text)
      if (lines) return { lines, model: spec.model }
      entry.error = `réponse illisible (${data?.candidates?.[0]?.finishReason ?? 'vide'})`
      return { error: 'Réponse illisible du service de lecture' }
    }
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    entry.error = detail
    if (res.status === 400 && thinking && /think/i.test(detail)) continue // réglage refusé : essayer le suivant
    if (res.status === 401 || res.status === 403) return { error: 'Clé GEMINI_API_KEY refusée par Google', fatal: true }
    if (res.status === 429) return { error: 'Quota de lecture atteint, réessayez dans une minute' }
    if (res.status === 404) return { error: 'Modèle de lecture introuvable' }
    return { error: `Service de lecture indisponible (${res.status})` }
  }
  return { error: 'Modèle de lecture incompatible' }
}

/**
 * Lecture « en relais » : chaque modèle démarre à son « startMs » (ou plus tôt si tous les modèles lancés ont échoué).
 * La lecture du modèle le mieux placé est préférée, mais si un modèle moins bien placé répond d'abord, on n'attend
 * les autres que GRACE_MS de plus. La lecture complète ne dépasse jamais TOTAL_BUDGET_MS.
 */
function readWithGemini(apiKey, models, files) {
  const parts = [...files.map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data } })), { text: PROMPT }]
  return race(models, (spec, signal, attempts) => tryModel(apiKey, spec, parts, signal, attempts))
}

function race(models, run) {
  const started = Date.now()
  const attempts = []
  const runs = models.map((spec) => ({ spec, ctrl: new AbortController(), started: false, result: null }))
  const timers = []
  return new Promise((resolve) => {
    let finished = false
    let grace = null
    const finish = (out) => {
      if (finished) return
      finished = true
      timers.forEach(clearTimeout)
      clearTimeout(grace)
      runs.forEach((r) => r.ctrl.abort())
      resolve({ ...out, attempts })
    }
    const best = () => runs.find((r) => r.result?.lines)
    const launch = (i) => {
      const r = runs[i]
      if (!r || r.started || finished || Date.now() - started > TOTAL_BUDGET_MS - 4_000) return
      r.started = true
      run(r.spec, r.ctrl.signal, attempts).then((res) => {
        r.result = res
        settle()
      })
    }
    const settle = () => {
      const fatal = runs.find((r) => r.result?.fatal)
      if (fatal) return finish({ error: fatal.result.error, status: 502 })
      const win = best()
      if (win) {
        // Un modèle mieux placé est encore en train de lire : lui laisser un court délai.
        const pendingBefore = runs.slice(0, runs.indexOf(win)).some((r) => r.started && !r.result)
        if (!pendingBefore) return finish({ lines: win.result.lines, model: win.spec.model })
        grace ??= setTimeout(() => finish({ lines: best().result.lines, model: best().spec.model }), GRACE_MS)
        return
      }
      // Pas encore de lecture réussie et plus aucun modèle en cours : démarrer le suivant sans attendre.
      const next = runs.findIndex((r) => !r.started)
      if (next !== -1 && !runs.some((r) => r.started && !r.result)) launch(next)
      if (runs.every((r) => !r.started || r.result) && !runs.some((r) => !r.started && Date.now() - started <= TOTAL_BUDGET_MS - 4_000)) {
        const last = [...runs].reverse().find((r) => r.result)
        finish({ error: last?.result.error ?? 'La lecture a pris trop de temps', status: 502 })
      }
    }
    runs.forEach((r, i) => (r.spec.startMs ? timers.push(setTimeout(() => launch(i), r.spec.startMs)) : launch(i)))
    timers.push(setTimeout(() => {
      runs.forEach((r) => r.ctrl.abort())
      if (!best()) finish({ error: 'La lecture a pris trop de temps', status: 504 })
    }, TOTAL_BUDGET_MS))
  })
}

/** Petite lecture sans image, avec les mêmes réglages que les vraies lectures (diagnostic). */
async function ping(apiKey, spec) {
  const attempts = []
  const t0 = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25_000)
  const res = await tryModel(apiKey, spec, [{ text: "Aucune ordonnance n'est jointe : renvoie une liste vide." }], ctrl.signal, attempts)
  clearTimeout(timer)
  return { model: spec.model, ok: !!res.lines, ms: Date.now() - t0, attempts }
}

/** Modèles « flash » ouverts à cette clé (diagnostic, pour choisir un autre modèle si besoin). */
async function listFlashModels(apiKey) {
  try {
    const res = await fetch(`${API}/models?pageSize=1000`, { headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return `erreur ${res.status}`
    const data = await res.json()
    return (data.models ?? [])
      .filter((m) => /flash/.test(m.name) && m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
  } catch {
    return 'indisponible'
  }
}

/* ------------------------------------------------------------------------------------------------
 * Missions partagées (base Cloudflare D1, liaison « DB »).
 *
 *  POST /missions              (patient)  crée la mission { mission } ; mission.token = secret du patient
 *  GET  /missions/:id          (patient : en-tête X-Mission-Token ; agent : X-Agent-Code)
 *  PUT  /missions/:id          (patient ou agent) { mission, baseRev, otp? } ; refusé (409) si la mission a changé entre-temps
 *  GET  /missions              (agent)    missions en cours et missions des 7 derniers jours
 *
 * Le secret du patient et le code de livraison (OTP) ne sont jamais envoyés aux agents : l'agent saisit le code
 * donné par le patient et le service le vérifie lui-même avant d'accepter le statut « livrée ».
 * ---------------------------------------------------------------------------------------------- */
const MAX_MISSION_BYTES = 1_800_000
let schemaReady = false

async function ensureSchema(db) {
  if (schemaReady) return
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, rev INTEGER NOT NULL, status TEXT NOT NULL, token TEXT NOT NULL, otp TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
  ).run()
  schemaReady = true
}

/** Mission telle qu'enregistrée : sans le secret du patient ni le code de livraison. */
function stripSecrets(m) {
  const { token: _t, otp: _o, rev: _r, ...rest } = m
  return rest
}

function view(row, forPatient) {
  const m = JSON.parse(row.data)
  m.rev = row.rev
  if (forPatient) m.otp = row.otp
  return m
}

async function handleMissions(request, env, url, json) {
  if (!env.DB) return json({ error: "La base de données des missions n'est pas encore activée (liaison D1 « DB »)." }, 503)
  await ensureSchema(env.DB)
  const id = decodeURIComponent(url.pathname.split('/')[2] ?? '')
  const agentCode = request.headers.get('X-Agent-Code') ?? ''
  const isAgent = !!env.AGENT_CODE && agentCode === env.AGENT_CODE
  const token = request.headers.get('X-Mission-Token') ?? ''

  if (request.method === 'GET' && !id) {
    if (!env.AGENT_CODE) return json({ error: "Le code des agents n'est pas encore configuré (secret AGENT_CODE)." }, 503)
    if (!isAgent) return json({ error: 'Code agent incorrect' }, 401)
    const since = Date.now() - 7 * 24 * 3600 * 1000
    const { results } = await env.DB.prepare(
      "SELECT rev, data FROM missions WHERE status NOT IN ('livree', 'annulee') OR updated_at > ? ORDER BY created_at DESC LIMIT 200",
    ).bind(since).all()
    return json({ missions: results.map((r) => view(r, false)) })
  }

  if (request.method === 'POST' && !id) {
    const body = await request.json().catch(() => null)
    const m = body?.mission
    if (!m || !/^MIS-[A-Z0-9]{4,12}$/.test(m.id ?? '') || typeof m.token !== 'string' || m.token.length < 16 || typeof m.otp !== 'string') {
      return json({ error: 'Mission invalide' }, 400)
    }
    if (m.status !== 'payee') return json({ error: 'Une nouvelle mission doit être au statut « payée »' }, 400)
    const data = JSON.stringify(stripSecrets(m))
    if (data.length > MAX_MISSION_BYTES) return json({ error: 'Mission trop volumineuse (photos)' }, 413)
    const now = Date.now()
    const res = await env.DB.prepare('INSERT OR IGNORE INTO missions (id, rev, status, token, otp, data, created_at, updated_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?)')
      .bind(m.id, m.status, m.token, m.otp, data, now, now).run()
    if (!res.meta?.changes) return json({ error: 'Cette mission existe déjà' }, 409)
    return json({ rev: 1 })
  }

  if (!id) return json({ error: 'Méthode non autorisée' }, 405)
  const row = await env.DB.prepare('SELECT rev, status, token, otp, data FROM missions WHERE id = ?').bind(id).first()
  if (!row) return json({ error: 'Mission introuvable' }, 404)
  const isPatient = token.length >= 16 && token === row.token
  if (!isPatient && !isAgent) return json({ error: 'Accès refusé' }, 401)

  if (request.method === 'GET') return json({ mission: view(row, isPatient) })

  if (request.method === 'PUT') {
    const body = await request.json().catch(() => null)
    const m = body?.mission
    if (!m || m.id !== id) return json({ error: 'Mission invalide' }, 400)
    if (body.baseRev !== row.rev) return json({ error: 'La mission a été modifiée entre-temps', mission: view(row, isPatient) }, 409)
    // Seul le code donné par le patient permet à un agent de déclarer la mission livrée.
    if (!isPatient && m.status === 'livree' && row.status !== 'livree' && String(body.otp ?? '').trim() !== row.otp) {
      return json({ error: 'Code de livraison incorrect' }, 403)
    }
    const data = JSON.stringify(stripSecrets(m))
    if (data.length > MAX_MISSION_BYTES) return json({ error: 'Mission trop volumineuse (photos)' }, 413)
    const res = await env.DB.prepare('UPDATE missions SET rev = rev + 1, status = ?, data = ?, updated_at = ? WHERE id = ? AND rev = ?')
      .bind(m.status, data, Date.now(), id, row.rev).run()
    if (!res.meta?.changes) {
      const fresh = await env.DB.prepare('SELECT rev, status, token, otp, data FROM missions WHERE id = ?').bind(id).first()
      return json({ error: 'La mission a été modifiée entre-temps', mission: view(fresh, isPatient) }, 409)
    }
    return json({ rev: row.rev + 1 })
  }
  return json({ error: 'Méthode non autorisée' }, 405)
}
