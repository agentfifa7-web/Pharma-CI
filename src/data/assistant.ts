import type { Medication } from '../types'
import { MEDICATIONS, medById } from './medications'
import { fcfa, normalize } from '../lib/format'

/**
 * PHARMA AI — moteur local à règles (démonstration).
 * Garde-fous : jamais de diagnostic, jamais de prescription, jamais de modification
 * d'ordonnance ou de posologie, jamais de substitution. Urgence → 185 (SAMU).
 */

export type AiLink = { label: string; to: string }
export type AiAnswer = { text: string; links?: AiLink[]; tone?: 'info' | 'warning' | 'danger' }

export const AI_SUGGESTIONS = [
  'À quoi sert l\'amoxicilline ?',
  'Effets secondaires du paracétamol',
  'Le Coartem est-il pris en charge par la CMU ?',
  'Comment conserver la metformine ?',
  'Quels génériques du Doliprane ?',
  'Comment lire mon ordonnance ?',
  'Comment trouver une pharmacie de garde ?',
  'Comment fonctionne la livraison ?',
]

const has = (q: string, words: string[]) => words.some((w) => q.includes(normalize(w)))

const EMERGENCY = [
  'convulsion', 'convulse', 'inconscient', 'perte de connaissance', 'evanoui', 'ne respire', 'difficulte a respirer',
  'difficulte respiratoire', 'n\'arrive pas a respirer', 'etouffe', 'saignement abondant', 'saigne beaucoup', 'hemorragie',
  'douleur thoracique', 'douleur dans la poitrine', 'avc', 'paralysie', 'overdose', 'surdosage', 'intoxication', 'empoisonn',
  'idees suicidaires', 'suicide', 'me tuer', 'avale par erreur', 'brulure grave',
]
const DIAGNOSIS = [
  'j\'ai mal', 'j ai mal', 'qu\'est-ce que j\'ai', 'qu est ce que j ai', 'quelle maladie', 'est-ce grave', 'c\'est grave',
  'je suis malade', 'j\'ai de la fievre', 'j\'ai la fievre', 'symptome', 'diagnostic', 'mon enfant a', 'je tousse', 'j\'ai des boutons',
  'ai-je le', 'est-ce que j\'ai', 'mal a la tete', 'mal au ventre', 'mal de gorge', 'je vomis', 'diarrhee depuis',
]
const PRESCRIBE = [
  'quel medicament prendre', 'quel medicament pour', 'que dois-je prendre', 'que dois je prendre', 'que prendre', 'quoi prendre',
  'que me conseilles', 'que me conseillez', 'prescris', 'prescrire', 'ordonne-moi', 'donne-moi un medicament', 'quel traitement',
  'combien dois-je prendre', 'quelle dose', 'quelle posologie', 'combien de comprimes',
]
const DOSE_CHANGE = [
  'augmenter la dose', 'augmenter ma dose', 'diminuer la dose', 'diminuer ma dose', 'baisser la dose', 'doubler', 'double dose',
  'arreter mon traitement', 'arreter le traitement', 'arreter de prendre', 'sauter une prise', 'prendre plus', 'prendre moins',
]
const REPLACE = [
  'remplacer', 'a la place de', 'substituer', 'au lieu de', 'changer de medicament', 'changer mon medicament', 'echanger',
]

const PRO = 'Parlez-en à votre pharmacien ou à votre médecin : eux seuls peuvent évaluer votre situation.'

/** Recherche du médicament cité dans la question (nom commercial ou DCI, sans accents). */
export function findMedication(question: string): Medication | undefined {
  const q = normalize(question.replace(/[’`]/g, "'"))
  let best: { m: Medication; score: number } | undefined
  for (const m of MEDICATIONS) {
    const keys = new Set<string>()
    const brandHead = normalize(m.brand).split(/[\s(/]/)[0] ?? ''
    if (brandHead.length >= 4) keys.add(brandHead)
    for (const part of normalize(m.dci).split(/[+/]/)) {
      const k = part.trim()
      if (k.length >= 4) keys.add(k)
    }
    let score = 0
    for (const k of keys) if (q.includes(k)) score += k.length
    if (!score) continue
    if (q.includes(normalize(m.brand))) score += 50
    const dose = m.dosage.match(/\d+/)?.[0]
    if (dose && new RegExp(`\\b${dose}\\b`).test(q)) score += 10
    if (normalize(m.brand).includes('generique')) score += 1 // préfère le générique à égalité
    if (!best || score > best.score) best = { m, score }
  }
  return best?.m
}

function medicationAnswer(q: string, m: Medication): AiAnswer {
  const name = `${m.brand} (${m.dci}, ${m.dosage}, ${m.form.toLowerCase()})`
  const fiche: AiLink = { label: 'Voir la fiche', to: `/medicaments/${m.id}` }
  const disclaimer = '\n\nCes informations sont générales et ne remplacent pas la notice ni l\'avis de votre pharmacien.'

  if (has(q, ['effet', 'secondaire', 'indesirable', 'reaction'])) {
    return {
      text: `Effets indésirables possibles de ${name} :\n${m.sideEffects}\n\nSi vous ressentez un effet inhabituel, contactez votre pharmacien ou médecin et signalez-le via MON EXPÉRIENCE.${disclaimer}`,
      links: [fiche, { label: 'Signaler un effet', to: `/vigilance?med=${m.id}` }],
    }
  }
  if (has(q, ['conserv', 'stock', 'chaleur', 'frigo', 'refrigerat', 'temperature'])) {
    return { text: `Conservation de ${name} :\n${m.storage}\n\nGardez le médicament dans sa boîte d'origine, hors de portée des enfants, à l'abri de la chaleur et de l'humidité.${disclaimer}`, links: [fiche] }
  }
  if (has(q, ['contre-indic', 'contre indic', 'contreindic', 'ne pas prendre', 'interdit'])) {
    return { text: `Contre-indications mentionnées pour ${name} :\n${m.contraindications}\n\n${PRO}${disclaimer}`, links: [fiche] }
  }
  if (has(q, ['precaution', 'attention', 'grossesse', 'enceinte', 'allait', 'alcool', 'interaction'])) {
    return { text: `Précautions d'emploi pour ${name} :\n${m.precautions}\n\nPour une situation particulière (grossesse, allaitement, autres traitements), ${PRO.charAt(0).toLowerCase() + PRO.slice(1)}${disclaimer}`, links: [fiche] }
  }
  if (has(q, ['cmu', 'couverture maladie', 'pris en charge', 'rembours'])) {
    const s = { pris_en_charge: '✅ indiqué comme pris en charge', non_pris_en_charge: '❌ indiqué comme non pris en charge', a_verifier: '⚠️ statut à vérifier' }[m.cmu.status]
    return {
      text: `CMU — ${name} : ${s}.${m.cmu.reference ? `\nRéférence : ${m.cmu.reference}` : ''}${m.cmu.conditions ? `\nConditions : ${m.cmu.conditions}` : ''}\nSource : ${m.cmu.source} (mise à jour ${m.cmu.updatedAt}).\n\nSeule la liste officielle publiée par les autorités fait foi. Vérifiez auprès de votre pharmacien.`,
      links: [fiche, { label: 'PHARMA CMU', to: `/cmu?q=${encodeURIComponent(m.dci)}` }],
    }
  }
  if (has(q, ['generique', 'equivalent', 'similaire', 'meme molecule', 'moins cher'])) {
    const eq = m.equivalents.map((id) => medById(id)).filter((x): x is Medication => !!x)
    return {
      text: eq.length
        ? `Produits contenant la même substance (${m.dci} ${m.dosage}) dans la base PHARMA MED :\n${eq.map((e) => `• ${e.brand} — ${e.form}`).join('\n')}\n\n⚠️ Ne substituez jamais un médicament sans l'avis de votre pharmacien ou de votre prescripteur.`
        : `Aucun équivalent de ${name} n'est référencé dans la base de démonstration. Votre pharmacien peut vous renseigner.`,
      links: [fiche, ...eq.slice(0, 3).map((e) => ({ label: e.brand, to: `/medicaments/${e.id}` }))],
    }
  }
  if (has(q, ['prix', 'cout', 'tarif', 'combien ca', 'combien coute', 'combien vaut'])) {
    const level = { indicatif: 'prix indicatif (non vérifié)', communique: 'prix communiqué (non confirmé par facture)', confirme: 'prix confirmé par une facture récente' }[m.price.level]
    return {
      text: `Prix de ${name} : environ ${fcfa(m.price.amount)} — ${level}, relevé le ${m.price.updatedAt}.\n\nCe prix peut varier d'une pharmacie à l'autre et n'a pas de valeur officielle.`,
      links: [fiche],
    }
  }
  if (has(q, ['notice', 'mode d\'emploi', 'comment prendre', 'comment utiliser'])) {
    return { text: `Notice de ${name} :\n${m.leaflet}\n\nSuivez toujours la posologie indiquée sur votre ordonnance. Je ne peux pas vous indiquer de dose personnalisée.`, links: [fiche] }
  }
  return {
    text: `${name}\n• Classe : ${m.therapeuticClass}\n• Indications : ${m.indications}\n• Statut : ${m.regulatoryStatus}${m.prescriptionRequired ? ' — délivré sur ordonnance' : ''}\n\nVous pouvez me demander ses effets indésirables, sa conservation, ses précautions, son statut CMU, son prix ou ses équivalents.${disclaimer}`,
    links: [fiche],
  }
}

export function answer(question: string): AiAnswer {
  const q = normalize(question.replace(/[’`]/g, "'"))
  if (!q) return { text: 'Posez-moi une question sur un médicament, la CMU, les pharmacies de garde ou votre ordonnance.' }

  // 1. Urgence
  if (has(q, EMERGENCY)) {
    return {
      tone: 'danger',
      text: '🚨 Cela ressemble à une situation d\'urgence.\n\nAppelez immédiatement le SAMU au 185 (ou les sapeurs-pompiers au 180). Ne restez pas seul(e) et ne tentez pas de traitement par vous-même.\n\nJe ne suis pas en mesure d\'évaluer une urgence médicale.',
      links: [{ label: 'Page URGENCE', to: '/urgences' }],
    }
  }
  // 2. Garde-fous
  if (has(q, DOSE_CHANGE)) {
    return {
      tone: 'warning',
      text: '❌ Je ne peux pas vous conseiller de modifier une dose ou d\'arrêter un traitement.\n\nToute modification de posologie doit être décidée par votre médecin, ou discutée avec votre pharmacien. Ne changez rien de vous-même, même si vous vous sentez mieux ou moins bien.',
      links: [{ label: 'Trouver une pharmacie', to: '/pharmacies' }],
    }
  }
  if (has(q, REPLACE)) {
    return {
      tone: 'warning',
      text: '❌ Je ne peux pas remplacer un médicament prescrit.\n\nSeul votre prescripteur, ou votre pharmacien dans le cadre prévu par la réglementation, peut proposer un autre produit. Présentez votre ordonnance en pharmacie pour en discuter.',
      links: [{ label: 'Trouver une pharmacie', to: '/pharmacies' }],
    }
  }
  if (has(q, PRESCRIBE)) {
    return {
      tone: 'warning',
      text: '❌ Je ne peux pas vous prescrire de médicament ni vous indiquer une dose.\n\nVotre pharmacien peut vous conseiller pour les petits maux, et votre médecin pourra établir une prescription adaptée. En cas de signe grave, appelez le 185.',
      links: [{ label: 'Pharmacies proches', to: '/pharmacies' }, { label: 'Autres services de santé', to: '/sante' }],
    }
  }
  if (has(q, DIAGNOSIS)) {
    return {
      tone: 'warning',
      text: '❌ Je ne peux pas poser de diagnostic ni interpréter vos symptômes.\n\nConsultez un médecin ou demandez conseil à un pharmacien. Si les symptômes sont intenses, s\'aggravent ou concernent un nourrisson, une femme enceinte ou une personne âgée, consultez sans attendre. En cas d\'urgence : 185 (SAMU).',
      links: [{ label: 'Services de santé', to: '/sante' }, { label: 'Urgences', to: '/urgences' }],
    }
  }

  // 3. Médicament cité
  const med = findMedication(question)
  if (med) return medicationAnswer(q, med)

  // 4. Thèmes
  if (has(q, ['ordonnance', 'prescription', 'doublon', 'renouvel'])) {
    return {
      text: 'Lire et envoyer une ordonnance :\n• Une ordonnance indique le prescripteur, le patient, la date et, pour chaque médicament, le nom, le dosage, la forme, la posologie et la durée.\n• Dans PHARMA CI, prenez-la en photo : les éléments détectés vous sont présentés et vous les confirmez. Le texte de l\'ordonnance n\'est jamais modifié.\n• Anti-duplication : chaque ordonnance reçoit une empreinte numérique unique. Une ordonnance déjà utilisée pour une mission est verrouillée et ne peut pas être renvoyée.\n\nEn cas de doute sur la lecture, demandez à votre pharmacien.',
      links: [{ label: 'Envoyer une ordonnance', to: '/ordonnance' }, { label: 'Mes ordonnances', to: '/ordonnances' }],
    }
  }
  if (has(q, ['cmu', 'couverture maladie'])) {
    return {
      text: 'La CMU (Couverture Maladie Universelle) prend en charge une liste de médicaments définie par les autorités, selon la DCI, le dosage et la forme.\n\nDans PHARMA CMU, recherchez un médicament pour voir son statut (✅ pris en charge, ❌ non pris en charge, ⚠️ à vérifier). Seule la liste officielle publiée sur sante.gouv.ci fait foi.',
      links: [{ label: 'PHARMA CMU', to: '/cmu' }],
    }
  }
  if (has(q, ['garde', 'nuit', 'dimanche', 'ouverte', 'ouvert maintenant', 'ferie'])) {
    return {
      text: 'Les pharmacies de garde assurent la continuité du service la nuit, le week-end et les jours fériés. En Côte d\'Ivoire, les tours de garde sont organisés par semaine.\n\nLa page « De garde » affiche les pharmacies de garde les plus proches de vous, avec itinéraire et appel direct. Pensez à appeler avant de vous déplacer.',
      links: [{ label: 'Pharmacies de garde', to: '/garde' }, { label: 'Carte', to: '/carte' }],
    }
  }
  if (has(q, ['livraison', 'livrer', 'mission', 'agent', 'coursier', 'otp'])) {
    return {
      text: 'PHARMA CI n\'est pas une pharmacie en ligne et ne vend pas de médicaments.\n\nLe service de mission fonctionne ainsi : vous envoyez votre ordonnance, vous payez le service, un agent se rend dans une pharmacie, achète les médicaments en votre nom et vous les livre avec la facture originale. Si le prix réel dépasse l\'estimation, vous décidez. La remise se fait avec un code de confirmation (OTP).',
      links: [{ label: 'Lancer une mission', to: '/ordonnance' }, { label: 'Mes missions', to: '/missions' }],
    }
  }
  if (has(q, ['reglement', 'la loi', 'les lois', 'une loi', 'decret', 'arrete', 'deontolog', 'legal', 'airp', 'ordre des pharmaciens'])) {
    return {
      text: 'PHARMA LEGAL rassemble les grandes catégories de textes (déontologie, lois, décrets, arrêtés, pharmacovigilance, réglementation des médicaments) et renvoie vers les portails officiels (ministère de la Santé, E-DEPPS).\n\nJe ne cite pas de références de textes : consultez toujours la source officielle.',
      links: [{ label: 'PHARMA LEGAL', to: '/reglementation' }, { label: 'Ordre des pharmaciens', to: '/ordre' }],
    }
  }
  if (has(q, ['assurance', 'mutuelle', 'assureur'])) {
    return { text: 'PHARMA ASSUR vous permet d\'enregistrer votre assurance et de trouver les pharmacies qui l\'acceptent (données de démonstration).', links: [{ label: 'PHARMA ASSUR', to: '/assurances' }] }
  }
  if (has(q, ['faux', 'falsifi', 'contrefa', 'lot', 'rappel', 'scan'])) {
    return {
      text: 'Pour vérifier un médicament, utilisez SCAN PHARMA : saisissez ou scannez le numéro de lot. Consultez aussi les alertes médicaments. En cas de doute, ne consommez pas le produit et demandez conseil à un pharmacien.',
      links: [{ label: 'SCAN PHARMA', to: '/scan' }, { label: 'Alertes', to: '/alertes' }],
    }
  }
  if (has(q, ['bonjour', 'salut', 'bonsoir', 'merci', 'aide'])) {
    return { text: 'Bonjour 👋 Je suis PHARMA AI. Je peux vous informer sur un médicament (usage, effets, conservation, CMU, prix, équivalents), sur la lecture d\'une ordonnance, la CMU, les pharmacies de garde ou la livraison.\n\nJe ne pose pas de diagnostic et je ne prescris pas.' }
  }
  return {
    text: 'Je n\'ai pas trouvé de réponse précise. Essayez de citer le nom d\'un médicament (ex. « effets secondaires de l\'amoxicilline ») ou un thème : ordonnance, CMU, garde, livraison, réglementation.\n\nPour toute question sur votre santé, adressez-vous à votre pharmacien.',
    links: [{ label: 'Rechercher un médicament', to: '/medicaments' }],
  }
}
