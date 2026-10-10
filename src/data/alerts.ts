import type { DrugAlert } from '../types'

export const ALERT_KIND: Record<DrugAlert['kind'], { label: string; emoji: string; tone: 'red' | 'orange' | 'violet' | 'blue' | 'slate'; bg: string }> = {
  rappel: { label: 'Rappel de lot', emoji: '🚨', tone: 'red', bg: 'bg-red-50 text-red-600' },
  qualite: { label: 'Défaut de qualité', emoji: '🧪', tone: 'orange', bg: 'bg-amber-50 text-amber-600' },
  falsifie: { label: 'Médicament falsifié', emoji: '🕵️', tone: 'violet', bg: 'bg-violet-50 text-violet-600' },
  information: { label: 'Information de sécurité', emoji: 'ℹ️', tone: 'blue', bg: 'bg-sky-50 text-sky-600' },
  reglementation: { label: 'Réglementation', emoji: '⚖️', tone: 'slate', bg: 'bg-slate-100 text-slate-600' },
}

/**
 * Alertes médicaments — alimentées au démarrage par /data/alertes.json, produit par
 * scripts/sync-pharmacies/official.mjs : avis de l'AIRP (Autorité Ivoirienne de Régulation Pharmaceutique :
 * rappels de lots, mises en quarantaine, arrêts de commercialisation) et alertes produits médicaux de l'OMS.
 * Aucune alerte n'est inventée : sans fichier, la liste reste vide.
 */
export const DRUG_ALERTS: DrugAlert[] = []

export function replaceAlerts(list: DrugAlert[]) {
  DRUG_ALERTS.splice(0, DRUG_ALERTS.length, ...list)
}
