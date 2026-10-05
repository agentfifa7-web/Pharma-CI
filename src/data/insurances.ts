import type { Insurance } from '../types'

/**
 * Assureurs partenaires. Aucun partenariat n'est encore conclu : la liste reste vide plutôt que
 * d'afficher des offres fictives. À alimenter avec les données vérifiées fournies par les assureurs.
 */
export const INSURANCES: Insurance[] = []

export const insurerName = (id: string) => INSURANCES.find((i) => i.id === id)?.name ?? id
