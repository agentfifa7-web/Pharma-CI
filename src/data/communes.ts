import type { LatLng } from '../types'

export type Commune = { name: string; city: string; region: string; center: LatLng; population: number }

/**
 * Centres approximatifs des communes. Population : 0 = non renseignée (à importer depuis les
 * résultats officiels du recensement — INS) ; les calculs de couverture l'exigent.
 */
export const COMMUNES: Commune[] = [
  { name: 'Cocody', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.3599, lng: -3.9870 }, population: 0 },
  { name: 'Yopougon', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.3365, lng: -4.0850 }, population: 0 },
  { name: 'Abobo', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.4180, lng: -4.0200 }, population: 0 },
  { name: 'Adjamé', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.3580, lng: -4.0230 }, population: 0 },
  { name: 'Plateau', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.3230, lng: -4.0190 }, population: 0 },
  { name: 'Treichville', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.2930, lng: -4.0050 }, population: 0 },
  { name: 'Marcory', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.3040, lng: -3.9840 }, population: 0 },
  { name: 'Koumassi', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.2960, lng: -3.9490 }, population: 0 },
  { name: 'Port-Bouët', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.2560, lng: -3.9270 }, population: 0 },
  { name: 'Attécoubé', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.3340, lng: -4.0420 }, population: 0 },
  { name: 'Bingerville', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.3560, lng: -3.8900 }, population: 0 },
  { name: 'Anyama', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.4950, lng: -4.0520 }, population: 0 },
  { name: 'Songon', city: 'Abidjan', region: 'District autonome d\'Abidjan', center: { lat: 5.3160, lng: -4.2600 }, population: 0 },
  { name: 'Bouaké', city: 'Bouaké', region: 'Gbêkê', center: { lat: 7.6900, lng: -5.0300 }, population: 0 },
  { name: 'Yamoussoukro', city: 'Yamoussoukro', region: 'District autonome de Yamoussoukro', center: { lat: 6.8200, lng: -5.2770 }, population: 0 },
  { name: 'San-Pédro', city: 'San-Pédro', region: 'San-Pédro', center: { lat: 4.7480, lng: -6.6360 }, population: 0 },
  { name: 'Daloa', city: 'Daloa', region: 'Haut-Sassandra', center: { lat: 6.8770, lng: -6.4500 }, population: 0 },
  { name: 'Korhogo', city: 'Korhogo', region: 'Poro', center: { lat: 9.4580, lng: -5.6290 }, population: 0 },
  { name: 'Man', city: 'Man', region: 'Tonkpi', center: { lat: 7.4120, lng: -7.5540 }, population: 0 },
  { name: 'Gagnoa', city: 'Gagnoa', region: 'Gôh', center: { lat: 6.1320, lng: -5.9500 }, population: 0 },
]

export const CITIES = [...new Set(COMMUNES.map((c) => c.city))]
