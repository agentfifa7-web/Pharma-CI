import type { Agent } from '../types'

/** Agents PHARMA CI de démonstration (identités fictives). */
export const SEED_AGENTS: Agent[] = [
  { id: 'ag-01', name: 'Konan Yao', phone: '+225 07 00 00 01 01', photo: 'KY', zone: 'Cocody', vehicle: 'moto', position: { lat: 5.3550, lng: -3.9950 }, available: true, activeMissions: 0, rating: 4.9, completed: 312, earnings: 186000 },
  { id: 'ag-02', name: 'Aminata Traoré', phone: '+225 07 00 00 02 02', photo: 'AT', zone: 'Yopougon', vehicle: 'moto', position: { lat: 5.3400, lng: -4.0750 }, available: true, activeMissions: 1, rating: 4.8, completed: 254, earnings: 152000 },
  { id: 'ag-03', name: 'Serge Kouadio', phone: '+225 07 00 00 03 03', photo: 'SK', zone: 'Plateau', vehicle: 'voiture', position: { lat: 5.3250, lng: -4.0200 }, available: true, activeMissions: 0, rating: 4.7, completed: 198, earnings: 131000 },
  { id: 'ag-04', name: 'Fatou Bamba', phone: '+225 07 00 00 04 04', photo: 'FB', zone: 'Abobo', vehicle: 'moto', position: { lat: 5.4150, lng: -4.0180 }, available: false, activeMissions: 0, rating: 4.6, completed: 140, earnings: 87000 },
  { id: 'ag-05', name: 'Jean-Marc Gnahoré', phone: '+225 07 00 00 05 05', photo: 'JG', zone: 'Marcory', vehicle: 'velo', position: { lat: 5.3030, lng: -3.9800 }, available: true, activeMissions: 2, rating: 4.8, completed: 221, earnings: 119000 },
  { id: 'ag-06', name: 'Mariam Coulibaly', phone: '+225 07 00 00 06 06', photo: 'MC', zone: 'Koumassi', vehicle: 'moto', position: { lat: 5.2980, lng: -3.9520 }, available: true, activeMissions: 0, rating: 4.9, completed: 276, earnings: 164000 },
  { id: 'ag-07', name: 'Ibrahim Ouattara', phone: '+225 07 00 00 07 07', photo: 'IO', zone: 'Bouaké', vehicle: 'moto', position: { lat: 7.6880, lng: -5.0290 }, available: true, activeMissions: 0, rating: 4.7, completed: 95, earnings: 61000 },
]

export const VEHICLE_LABEL: Record<Agent['vehicle'], string> = { moto: 'Moto', voiture: 'Voiture', velo: 'Vélo', a_pied: 'À pied' }
