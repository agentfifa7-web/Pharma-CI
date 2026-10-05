import type { DrugAlert } from '../types'

export const ALERT_KIND: Record<DrugAlert['kind'], { label: string; emoji: string; tone: 'red' | 'orange' | 'violet' | 'blue' | 'slate'; bg: string }> = {
  rappel: { label: 'Rappel de lot', emoji: '🚨', tone: 'red', bg: 'bg-red-50 text-red-600' },
  qualite: { label: 'Défaut de qualité', emoji: '🧪', tone: 'orange', bg: 'bg-amber-50 text-amber-600' },
  falsifie: { label: 'Médicament falsifié', emoji: '🕵️', tone: 'violet', bg: 'bg-violet-50 text-violet-600' },
  information: { label: 'Information de sécurité', emoji: 'ℹ️', tone: 'blue', bg: 'bg-sky-50 text-sky-600' },
  reglementation: { label: 'Réglementation', emoji: '⚖️', tone: 'slate', bg: 'bg-slate-100 text-slate-600' },
}

/**
 * Alertes médicaments (rappels de lots, produits falsifiés…). Aucune source officielle n'est encore
 * branchée : la liste reste vide plutôt que d'afficher des alertes fictives. À alimenter depuis l'AIRP
 * (Autorité Ivoirienne de Régulation Pharmaceutique) ou le ministère de la Santé.
 */
export const DRUG_ALERTS: DrugAlert[] = []
