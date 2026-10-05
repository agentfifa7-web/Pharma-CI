import type { DrugAlert } from '../types'

/**
 * Alertes médicaments — EXEMPLES FICTIFS de démonstration.
 * En production, les alertes proviennent exclusivement des sources officielles
 * (AIRP — Autorité Ivoirienne de Régulation Pharmaceutique, ministère de la Santé).
 */
const SRC = 'Exemple de démonstration — en production : AIRP / ministère de la Santé'

export const ALERT_KIND: Record<DrugAlert['kind'], { label: string; emoji: string; tone: 'red' | 'orange' | 'violet' | 'blue' | 'slate'; bg: string }> = {
  rappel: { label: 'Rappel de lot', emoji: '🚨', tone: 'red', bg: 'bg-red-50 text-red-600' },
  qualite: { label: 'Défaut de qualité', emoji: '🧪', tone: 'orange', bg: 'bg-amber-50 text-amber-600' },
  falsifie: { label: 'Médicament falsifié', emoji: '🕵️', tone: 'violet', bg: 'bg-violet-50 text-violet-600' },
  information: { label: 'Information de sécurité', emoji: 'ℹ️', tone: 'blue', bg: 'bg-sky-50 text-sky-600' },
  reglementation: { label: 'Réglementation', emoji: '⚖️', tone: 'slate', bg: 'bg-slate-100 text-slate-600' },
}

export const DRUG_ALERTS: DrugAlert[] = [
  {
    id: 'al-001', kind: 'rappel', date: '2026-09-26', source: SRC,
    title: 'Rappel (démo) : Amoxicilline 500 mg — lot AMX500B199',
    description: 'Exemple fictif : un lot d\'Amoxicilline 500 mg gélules fait l\'objet d\'un rappel de démonstration. Si vous possédez ce lot, ne l\'utilisez pas et rapportez-le à votre pharmacie, qui vous orientera. N\'interrompez pas un traitement en cours sans avis : demandez à votre pharmacien un produit d\'un autre lot.',
    medication: 'med-amoxicilline-500', lots: ['AMX500B199'],
  },
  {
    id: 'al-002', kind: 'falsifie', date: '2026-09-10', source: SRC,
    title: 'Vigilance (démo) : antipaludiques vendus hors pharmacie',
    description: 'Exemple fictif : des boîtes d\'antipaludiques à l\'emballage douteux circuleraient hors du circuit pharmaceutique. Achetez vos médicaments uniquement en pharmacie et vérifiez le numéro de lot avec SCAN PHARMA.',
    medication: 'med-artemether-lumefantrine',
  },
  {
    id: 'al-003', kind: 'qualite', date: '2026-08-22', source: SRC,
    title: 'Défaut de qualité (démo) : sachets de SRO mal scellés',
    description: 'Exemple fictif : certains sachets de solution de réhydratation orale pourraient présenter un défaut de scellage. N\'utilisez pas un sachet ouvert, humide ou dont la poudre a changé d\'aspect ; signalez-le.',
    medication: 'med-sro-zinc',
  },
  {
    id: 'al-004', kind: 'information', date: '2026-08-05', source: SRC,
    title: 'Information (démo) : conservation des médicaments par forte chaleur',
    description: 'Exemple fictif d\'information de sécurité : la chaleur et l\'humidité peuvent altérer certains médicaments. Conservez-les à l\'abri du soleil, hors du véhicule, et respectez les conditions indiquées sur la boîte.',
  },
  {
    id: 'al-005', kind: 'information', date: '2026-07-21', source: SRC,
    title: 'Information (démo) : ibuprofène et fièvre d\'origine inconnue',
    description: 'Exemple fictif : en cas de fièvre en période de dengue, demandez conseil avant de prendre un anti-inflammatoire comme l\'ibuprofène. Le pharmacien vous orientera.',
    medication: 'med-ibuprofene-400',
  },
  {
    id: 'al-006', kind: 'reglementation', date: '2026-07-02', source: SRC,
    title: 'Réglementation (démo) : délivrance des antibiotiques sur ordonnance',
    description: 'Exemple fictif d\'alerte réglementaire : les antibiotiques sont des médicaments soumis à prescription. Les textes officiels applicables sont à consulter dans PHARMA LEGAL.',
  },
]
