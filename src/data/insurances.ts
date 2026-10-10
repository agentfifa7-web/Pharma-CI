import type { Insurance, InsuranceProduct } from '../types'

/**
 * Assureurs partenaires. Aucun partenariat n'est encore conclu : la liste reste vide plutôt que
 * d'afficher des offres fictives. À alimenter avec les données vérifiées fournies par les assureurs.
 */
export const INSURANCES: Insurance[] = []

export const insurerName = (id: string) => INSURANCES.find((i) => i.id === id)?.name ?? id

export const PERIOD_LABEL: Record<InsuranceProduct['period'], string> = { mois: 'mois', trimestre: 'trimestre', an: 'an' }
const MONTHS: Record<InsuranceProduct['period'], number> = { mois: 1, trimestre: 3, an: 12 }
/** Coût ramené au mois, pour comparer des offres payées au mois, au trimestre ou à l'année. */
export const monthlyCost = (p: InsuranceProduct) => Math.round(p.price / MONTHS[p.period])
