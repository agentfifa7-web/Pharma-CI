import { useStore } from '../store/useStore'
import { fetchMission, listMissions } from './sync'
import { isMissionActive } from '../data/statusUi'

export const SYNC_EVERY_MS = 8_000

/** Synchronisation avec la base partagée : missions du patient, missions visibles de l'agent, envois en attente. */
export async function syncOnce() {
  const s = useStore.getState()
  for (const m of s.missions) if (m.remote && m.syncPending) void s.syncMission(m.id)
  for (const m of s.missions) {
    if (!m.remote || !m.token || !isMissionActive(m)) continue
    const fresh = await fetchMission(m.id, { token: m.token })
    if (fresh) useStore.getState().applyRemoteMission(fresh)
  }
  if (s.agentCode) {
    const res = await listMissions(s.agentCode)
    const st = useStore.getState()
    if ('missions' in res) {
      res.missions.forEach(st.applyRemoteMission)
      if (st.agentSyncError) st.setAgentSyncError(undefined)
    } else if (res.status !== 0) st.setAgentSyncError(res.error)
  }
}

