import type { Agent } from '../types'

/**
 * Comptes agents de TEST (aucune identité réelle) : ils permettent d'essayer le parcours de mission
 * tant que les vrais agents PHARMA CI ne sont pas enregistrés. Statistiques remises à zéro.
 */
export const SEED_AGENTS: Agent[] = [
  { id: 'ag-01', name: 'Agent test 01', phone: '', photo: 'T1', zone: 'Cocody', vehicle: 'moto', position: { lat: 5.3550, lng: -3.9950 }, available: true, activeMissions: 0, rating: 0, completed: 0, earnings: 0 },
  { id: 'ag-02', name: 'Agent test 02', phone: '', photo: 'T2', zone: 'Yopougon', vehicle: 'moto', position: { lat: 5.3400, lng: -4.0750 }, available: true, activeMissions: 0, rating: 0, completed: 0, earnings: 0 },
  { id: 'ag-03', name: 'Agent test 03', phone: '', photo: 'T3', zone: 'Plateau', vehicle: 'voiture', position: { lat: 5.3250, lng: -4.0200 }, available: true, activeMissions: 0, rating: 0, completed: 0, earnings: 0 },
  { id: 'ag-04', name: 'Agent test 04', phone: '', photo: 'T4', zone: 'Abobo', vehicle: 'moto', position: { lat: 5.4150, lng: -4.0180 }, available: false, activeMissions: 0, rating: 0, completed: 0, earnings: 0 },
  { id: 'ag-05', name: 'Agent test 05', phone: '', photo: 'T5', zone: 'Marcory', vehicle: 'velo', position: { lat: 5.3030, lng: -3.9800 }, available: true, activeMissions: 0, rating: 0, completed: 0, earnings: 0 },
  { id: 'ag-06', name: 'Agent test 06', phone: '', photo: 'T6', zone: 'Koumassi', vehicle: 'moto', position: { lat: 5.2980, lng: -3.9520 }, available: true, activeMissions: 0, rating: 0, completed: 0, earnings: 0 },
  { id: 'ag-07', name: 'Agent test 07', phone: '', photo: 'T7', zone: 'Bouaké', vehicle: 'moto', position: { lat: 7.6880, lng: -5.0290 }, available: true, activeMissions: 0, rating: 0, completed: 0, earnings: 0 },
]

export const VEHICLE_LABEL: Record<Agent['vehicle'], string> = { moto: 'Moto', voiture: 'Voiture', velo: 'Vélo', a_pied: 'À pied' }
