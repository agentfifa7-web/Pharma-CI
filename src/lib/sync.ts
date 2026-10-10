import type { Agent, Mission } from '../types'
import { SERVICE_URL } from '../data/extraction'

/**
 * Accès à la base partagée des missions (service Cloudflare « ordonnance-ia », voir
 * services/ordonnance-ia/worker.js) : la mission lancée par le patient est visible de l'agent sur son
 * propre téléphone, et chaque étape de l'agent remonte chez le patient.
 */

export type SyncAuth = { token?: string; agentCode?: string }
export type PushResult = { ok: true; rev: number } | { ok: false; status: number; error: string; mission?: Mission }

let available: Promise<boolean> | undefined

/** La base partagée est-elle activée sur le service ? (vérifié une fois par session) */
export function sharedMissionsAvailable(): Promise<boolean> {
  if (!SERVICE_URL) return Promise.resolve(false)
  available ??= fetch(SERVICE_URL, { signal: AbortSignal.timeout(10_000) })
    .then((r) => r.json())
    .then((info: { missions?: boolean }) => !!info.missions)
    .catch(() => {
      available = undefined // nouvel essai au prochain appel
      return false
    })
  return available
}

function headers(auth: SyncAuth) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth.token) h['X-Mission-Token'] = auth.token
  if (auth.agentCode) h['X-Agent-Code'] = auth.agentCode
  return h
}

async function call(path: string, init: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${SERVICE_URL}${path}`, { ...init, signal: AbortSignal.timeout(20_000) })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, body }
}

const failure = (status: number, body: Record<string, unknown>): PushResult => ({
  ok: false,
  status,
  error: typeof body.error === 'string' ? body.error : `Erreur ${status}`,
  mission: body.mission as Mission | undefined,
})

/** Ce qui est envoyé : la mission sans les champs propres à cet appareil. */
const payload = (m: Mission) => {
  const { syncPending: _s, remote: _r, rev: _v, ...rest } = m
  return rest
}

export async function createMission(m: Mission): Promise<PushResult> {
  try {
    const { status, body } = await call('/missions', { method: 'POST', headers: headers({}), body: JSON.stringify({ mission: payload(m) }) })
    return status === 200 ? { ok: true, rev: Number(body.rev) } : failure(status, body)
  } catch {
    return { ok: false, status: 0, error: 'Pas de connexion' }
  }
}

export async function updateMission(m: Mission, auth: SyncAuth, otp?: string): Promise<PushResult> {
  try {
    const data = payload(m)
    delete (data as Partial<Mission>).token
    const { status, body } = await call(`/missions/${encodeURIComponent(m.id)}`, {
      method: 'PUT',
      headers: headers(auth),
      body: JSON.stringify({ mission: data, baseRev: m.rev ?? 0, otp }),
    })
    return status === 200 ? { ok: true, rev: Number(body.rev) } : failure(status, body)
  } catch {
    return { ok: false, status: 0, error: 'Pas de connexion' }
  }
}

export async function fetchMission(id: string, auth: SyncAuth): Promise<Mission | undefined> {
  try {
    const { status, body } = await call(`/missions/${encodeURIComponent(id)}`, { headers: headers(auth) })
    return status === 200 ? (body.mission as Mission) : undefined
  } catch {
    return undefined
  }
}

/** Missions visibles des agents. Renvoie une erreur lisible si le code est refusé. */
export async function listMissions(agentCode: string): Promise<{ missions: Mission[] } | { error: string; status: number }> {
  try {
    const { status, body } = await call('/missions', { headers: headers({ agentCode }) })
    if (status === 200 && Array.isArray(body.missions)) return { missions: body.missions as Mission[] }
    if (status === 200) return { status: 502, error: 'Réponse inattendue du service PHARMA CI (adresse ou version du service à vérifier)' }
    return { status, error: typeof body.error === 'string' ? body.error : `Erreur ${status}` }
  } catch {
    return { status: 0, error: 'Pas de connexion' }
  }
}

/** Agents enregistrés sur le service (visibles des agents et de l'administration, avec le code agent). */
export async function listAgents(agentCode: string): Promise<{ agents: Agent[] } | { error: string; status: number }> {
  try {
    const { status, body } = await call('/agents', { headers: headers({ agentCode }) })
    if (status === 200 && Array.isArray(body.agents)) return { agents: body.agents as Agent[] }
    if (status === 200) return { status: 502, error: 'Réponse inattendue du service PHARMA CI (adresse ou version du service à vérifier)' }
    return { status, error: typeof body.error === 'string' ? body.error : `Erreur ${status}` }
  } catch {
    return { status: 0, error: 'Pas de connexion' }
  }
}

export async function saveAgent(agent: Agent, agentCode: string): Promise<boolean> {
  try {
    const { lastSeen: _l, activeMissions: _a, ...data } = agent
    const { status } = await call(`/agents/${encodeURIComponent(agent.id)}`, { method: 'PUT', headers: headers({ agentCode }), body: JSON.stringify({ agent: data }) })
    return status === 200
  } catch {
    return false
  }
}

export async function deleteAgent(id: string, agentCode: string): Promise<boolean> {
  try {
    const { status } = await call(`/agents/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers({ agentCode }) })
    return status === 200
  } catch {
    return false
  }
}

/** Vérifie le code de l'administratrice auprès du service (secret ADMIN_CODE). */
export async function checkAdminCode(code: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!SERVICE_URL) return { ok: false, status: 503, error: "Le service PHARMA CI n'est pas configuré sur ce site." }
  try {
    const { status, body } = await call('/admin-check', { headers: { 'X-Admin-Code': code } })
    if (status === 200 && body.admin === true) return { ok: true }
    if (status === 200 || status === 404 || status === 405) {
      return { ok: false, status: 502, error: 'Le service PHARMA CI doit être mis à jour (version 9) pour ouvrir l’espace Admin.' }
    }
    return { ok: false, status, error: typeof body.error === 'string' ? body.error : `Erreur ${status}` }
  } catch {
    return { ok: false, status: 0, error: 'Pas de connexion' }
  }
}
