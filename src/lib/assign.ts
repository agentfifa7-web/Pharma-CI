import type { Agent, LatLng } from '../types'
import { distanceKm, travelMinutes } from './geo'

export type AgentScore = { agent: Agent; km: number; minutes: number; score: number }

/**
 * Affectation automatique : choisit l'agent disponible le plus pertinent selon
 * distance, temps estimé (moyen de déplacement), charge de travail et qualité de service.
 * Plus le score est bas, meilleur est l'agent.
 */
export function rankAgents(agents: Agent[], target: LatLng): AgentScore[] {
  return agents
    .filter((a) => a.available && a.activeMissions < 3)
    .map((agent) => {
      const km = distanceKm(agent.position, target)
      const minutes = travelMinutes(km, agent.vehicle)
      const score = minutes + agent.activeMissions * 12 - (agent.rating - 4.5) * 10 + (km > 25 ? 500 : 0)
      return { agent, km, minutes, score }
    })
    .sort((a, b) => a.score - b.score)
}
