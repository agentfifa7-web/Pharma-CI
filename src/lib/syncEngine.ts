import { useStore } from '../store/useStore'
import { fetchMission, listAgents, listMissions } from './sync'
import { isMissionActive } from '../data/statusUi'

export const SYNC_EVERY_MS = 8_000
/** Le profil de l'agent est renvoyé au moins toutes les 2 minutes : l'administration voit qui est connecté. */
const AGENT_HEARTBEAT_MS = 120_000

/** Synchronisation avec la base partagée : missions du patient, missions et agents (code agent), envois en attente. */
export async function syncOnce() {
  const s = useStore.getState()
  for (const m of s.missions) if (m.remote && m.syncPending) void s.syncMission(m.id)
  for (const m of s.missions) {
    if (!m.remote || !m.token || !isMissionActive(m)) continue
    const fresh = await fetchMission(m.id, { token: m.token })
    if (fresh) useStore.getState().applyRemoteMission(fresh)
  }
  if (!s.agentCode) return
  const [res, agents] = await Promise.all([listMissions(s.agentCode), listAgents(s.agentCode)])
  const st = useStore.getState()
  if ('missions' in res) {
    res.missions.forEach(st.applyRemoteMission)
    if (st.agentSyncError) st.setAgentSyncError(undefined)
    st.setLastSync(new Date().toISOString())
  } else if (res.status !== 0) st.setAgentSyncError(res.error)
  if ('agents' in agents) {
    st.setRemoteAgents(agents.agents)
    const own = useStore.getState().agents.find((a) => a.id === st.currentAgentId)
    const remoteOwn = agents.agents.find((a) => a.id === st.currentAgentId)
    if (own && (!remoteOwn?.lastSeen || Date.now() - new Date(remoteOwn.lastSeen).getTime() > AGENT_HEARTBEAT_MS)) void st.pushAgent(own.id)
  }
}
