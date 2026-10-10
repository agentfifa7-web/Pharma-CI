import type { Agent, Mission, MissionStatus, PrescriptionStatus } from '../types'

/** Tonalités compatibles avec <Badge tone> (src/components/ui.tsx). */
export type UiTone = 'green' | 'orange' | 'red' | 'slate' | 'blue' | 'violet'

export const PRESCRIPTION_TONE: Record<PrescriptionStatus, UiTone> = {
  nouvelle: 'blue',
  en_attente: 'orange',
  mission_lancee: 'violet',
  en_cours: 'violet',
  achat_effectue: 'blue',
  partiellement_executee: 'orange',
  livree: 'green',
  annulee: 'red',
  renouvellement: 'slate',
}

export const PRESCRIPTION_HELP: Record<PrescriptionStatus, string> = {
  nouvelle: 'Ordonnance reçue, éléments détectés à vérifier et confirmer.',
  en_attente: 'Éléments confirmés — prête pour lancer une mission.',
  mission_lancee: 'Mission payée, ordonnance verrouillée, recherche d\'un agent.',
  en_cours: 'Un agent PHARMA CI exécute la mission.',
  achat_effectue: 'Les médicaments ont été achetés en pharmacie, facture photographiée.',
  partiellement_executee: 'Une partie seulement des produits prescrits a pu être obtenue.',
  livree: 'Médicaments, facture originale et justificatif remis au patient.',
  annulee: 'Mission annulée — l\'ordonnance est déverrouillée.',
  renouvellement: 'Nouvelle exécution demandée, à vérifier selon les conditions de l\'ordonnance.',
}

export const MISSION_TONE: Record<MissionStatus, UiTone> = {
  payee: 'blue',
  agent_affecte: 'violet',
  en_pharmacie: 'violet',
  ecart_prix: 'orange',
  achat_effectue: 'blue',
  en_route: 'orange',
  livree: 'green',
  annulee: 'red',
}

export const MISSION_STEPS: { key: MissionStatus; label: string; emoji: string }[] = [
  { key: 'payee', label: 'Mission lancée', emoji: '🚀' },
  { key: 'agent_affecte', label: 'Agent affecté', emoji: '🧑🏾‍💼' },
  { key: 'en_pharmacie', label: 'En pharmacie', emoji: '💊' },
  { key: 'achat_effectue', label: 'Achat effectué', emoji: '🧾' },
  { key: 'en_route', label: 'En route', emoji: '🛵' },
  { key: 'livree', label: 'Livrée', emoji: '✅' },
]

/** Position dans le parcours (l'écart de prix se situe pendant le passage en pharmacie). */
export function missionStepIndex(status: MissionStatus) {
  if (status === 'ecart_prix') return 2
  if (status === 'annulee') return -1
  return MISSION_STEPS.findIndex((s) => s.key === status)
}

export const missionProgress = (status: MissionStatus) =>
  status === 'annulee' ? 0 : Math.round(((missionStepIndex(status) + 1) / MISSION_STEPS.length) * 100)

export const isMissionActive = (m: Mission) => m.status !== 'livree' && m.status !== 'annulee'

/** Rémunération agent (même formule que le store au moment de la livraison). */
export const agentEarning = (m: Mission) => Math.round(m.estimate.delivery * 0.8 + m.estimate.service * 0.3)

export const PAYMENT_METHODS = [
  { id: 'Orange Money', emoji: '🟠' },
  { id: 'MTN MoMo', emoji: '🟡' },
  { id: 'Moov Money', emoji: '🔵' },
  { id: 'Wave', emoji: '🌊' },
  { id: 'Carte bancaire', emoji: '💳' },
]

export const RELATION_LABEL = { moi: 'Moi', enfant: 'Enfant', parent: 'Parent', conjoint: 'Conjoint', autre: 'Autre' } as const

/** Télécharge un contenu texte / JSON en fichier (côté navigateur). */
export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Agent d'une mission. Pour une mission partagée, le nom et le téléphone viennent de la mission elle-même
 * (l'agent travaille sur son propre téléphone, inconnu de cet appareil).
 */
export function missionAgent(m: Mission | undefined, agents: Agent[]): Agent | undefined {
  if (!m?.agentId) return undefined
  const known = agents.find((a) => a.id === m.agentId)
  if (!m.remote || !m.agentName) return known
  return {
    id: m.agentId, name: m.agentName, phone: m.agentPhone ?? '', photo: '', zone: known?.zone ?? '', vehicle: known?.vehicle ?? 'moto',
    position: m.agentPosition ?? m.deliveryPosition, available: true, activeMissions: 0, rating: known?.rating ?? 0, completed: known?.completed ?? 0, earnings: 0,
  }
}
