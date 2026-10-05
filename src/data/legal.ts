/**
 * PHARMA LEGAL — bibliothèque réglementaire.
 * Aucune référence (numéro, date) n'est inventée : chaque entrée décrit une catégorie
 * de textes et renvoie vers les portails officiels où les textes seront intégrés.
 */

export type LegalSource = { label: string; url: string }

export const OFFICIAL_SOURCES = {
  depps: { label: 'E-DEPPS — Direction de l\'Exercice de la Profession et de la Pharmacie', url: 'https://depps.sante.gouv.ci' },
  sante: { label: 'Ministère de la Santé', url: 'https://www.sante.gouv.ci' },
  donnees: { label: 'Autorité de protection des données personnelles', url: 'https://www.autoritedeprotection.ci' },
} satisfies Record<string, LegalSource>

export type LegalCategory = {
  id: string
  title: string
  emoji: string
  description: string
  covers: string[]
  audience: ('Patients' | 'Pharmaciens' | 'Professionnels de santé' | 'Tous')[]
  sources: LegalSource[]
}

const { depps, sante, donnees } = OFFICIAL_SOURCES

export const LEGAL_CATEGORIES: LegalCategory[] = [
  {
    id: 'deontologie', title: 'Code de déontologie', emoji: '📜',
    description: 'Règles de conduite professionnelle qui s\'imposent aux pharmaciens dans l\'exercice de leur profession.',
    covers: ['Devoirs envers les patients', 'Secret professionnel', 'Relations entre confrères', 'Publicité et information', 'Indépendance professionnelle'],
    audience: ['Pharmaciens'], sources: [depps, sante],
  },
  {
    id: 'textes', title: 'Textes réglementaires', emoji: '📚',
    description: 'Ensemble des textes encadrant le secteur de la santé et de la pharmacie : organisation, autorisations, contrôles.',
    covers: ['Organisation du secteur pharmaceutique', 'Autorisations et agréments', 'Inspections et contrôles'],
    audience: ['Tous'], sources: [sante, depps],
  },
  {
    id: 'lois', title: 'Lois', emoji: '🏛️',
    description: 'Textes votés par le Parlement relatifs à la santé publique, à la pharmacie et aux droits des usagers.',
    covers: ['Santé publique', 'Exercice de la pharmacie', 'Protection des données personnelles de santé'],
    audience: ['Tous'], sources: [sante, donnees],
  },
  {
    id: 'decrets', title: 'Décrets', emoji: '🖋️',
    description: 'Textes d\'application pris par le Gouvernement pour préciser les modalités des lois dans le domaine de la santé.',
    covers: ['Modalités d\'application', 'Organisation des institutions sanitaires', 'Régimes d\'autorisation'],
    audience: ['Professionnels de santé', 'Pharmaciens'], sources: [sante],
  },
  {
    id: 'arretes', title: 'Arrêtés', emoji: '📋',
    description: 'Décisions ministérielles fixant des règles précises : listes, procédures, organisation des gardes, prix, etc.',
    covers: ['Organisation des gardes', 'Listes de médicaments', 'Procédures administratives'],
    audience: ['Pharmaciens', 'Professionnels de santé'], sources: [sante, depps],
  },
  {
    id: 'pharmaceutique', title: 'Réglementation pharmaceutique', emoji: '🏪',
    description: 'Règles relatives à l\'ouverture, au fonctionnement et à la gestion des officines et établissements pharmaceutiques.',
    covers: ['Ouverture et transfert d\'officine', 'Bonnes pratiques officinales', 'Distribution en gros', 'Personnel des officines'],
    audience: ['Pharmaciens'], sources: [depps],
  },
  {
    id: 'droits-patients', title: 'Droits des patients', emoji: '🧑🏾‍🤝‍🧑🏾',
    description: 'Droits des usagers du système de santé : information, consentement, confidentialité, accès aux soins, réclamations.',
    covers: ['Droit à l\'information', 'Consentement éclairé', 'Confidentialité des données de santé', 'Voies de recours'],
    audience: ['Patients'], sources: [sante, donnees],
  },
  {
    id: 'obligations', title: 'Obligations professionnelles', emoji: '🩺',
    description: 'Obligations des pharmaciens et de leurs équipes : dispensation, conseil, traçabilité, formation continue, participation aux gardes.',
    covers: ['Acte de dispensation', 'Traçabilité', 'Participation au service de garde', 'Formation continue'],
    audience: ['Pharmaciens'], sources: [depps],
  },
  {
    id: 'pharmacovigilance', title: 'Pharmacovigilance', emoji: '🚨',
    description: 'Dispositif de surveillance des effets indésirables et des problèmes de qualité des médicaments, et obligations de déclaration.',
    covers: ['Déclaration des effets indésirables', 'Rôle de l\'autorité de régulation (AIRP)', 'Rappels de lots', 'Médicaments falsifiés'],
    audience: ['Tous'], sources: [sante, depps],
  },
  {
    id: 'medicaments', title: 'Réglementation des médicaments', emoji: '💊',
    description: 'Autorisation de mise sur le marché, enregistrement, conditions de prescription et de délivrance, prix et prise en charge.',
    covers: ['Autorisation de mise sur le marché', 'Médicaments soumis à prescription', 'Médicaments génériques', 'Liste CMU'],
    audience: ['Tous'], sources: [sante, depps],
  },
]
