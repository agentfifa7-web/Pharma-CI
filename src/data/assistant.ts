import type { Medication } from '../types'
import { MEDICATIONS, medById, medShortName } from './medications'
import { dateFr, fcfa, normalize } from '../lib/format'

/**
 * PHARMA AI — moteur local à règles. Les réponses s'appuient uniquement sur les données disponibles
 * (base PHARMA MED synchronisée depuis pharmacies-de-garde.ci) ; rien n'est inventé.
 * Garde-fous : jamais de diagnostic, jamais de prescription, jamais de modification
 * d'ordonnance ou de posologie, jamais de substitution. Urgence → 185 (SAMU).
 */

export type AiLink = { label: string; to: string }
export type AiAnswer = { text: string; links?: AiLink[]; tone?: 'info' | 'warning' | 'danger' }

export const AI_SUGGESTIONS = [
  'Prix du Doliprane 1000 mg',
  'Le Coartem est-il pris en charge par la CMU ?',
  'Équivalents du paracétamol 500 mg',
  'L\'amlodipine est-elle sur la liste CMU ?',
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
const MISSING = (what: string) =>
  `${what} : cette information n'est pas renseignée dans la base PHARMA MED (les sources actuelles publient uniquement le nom, le code, la classe thérapeutique, le prix et, pour la liste CMU, la DCI et la présentation).\n\nConsultez la notice du médicament ou demandez à votre pharmacien.`

/* ───────────────────────── Recherche dans la base (≈ 4 500 produits) ───────────────────────── */

const tokens = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean)

const HAYSTACK = new WeakMap<Medication, string>()
/** Texte normalisé (sans accents) indexé pour la recherche : nom, DCI, classe, code. */
export function medHaystack(m: Medication): string {
  let h = HAYSTACK.get(m)
  if (h === undefined) {
    h = normalize([m.brand, m.dci, m.therapeuticClass, m.code, m.form].filter(Boolean).join(' '))
    HAYSTACK.set(m, h)
  }
  return h
}

/**
 * Recherche insensible aux accents (tous les mots saisis doivent apparaître). Les produits dont le nom
 * commence par la saisie sont classés en premier.
 */
export function searchMedications(query: string, keep: (m: Medication) => boolean = () => true): Medication[] {
  const n = normalize(query)
  const words = n.split(/\s+/).filter(Boolean)
  if (!words.length) return MEDICATIONS.filter(keep)
  const ranked: { m: Medication; r: number }[] = []
  for (const m of MEDICATIONS) {
    if (!keep(m)) continue
    const h = medHaystack(m)
    if (!words.every((w) => h.includes(w))) continue
    const b = normalize(m.brand)
    ranked.push({ m, r: m.code === query.trim() ? -1 : b.startsWith(n) ? 0 : b.includes(` ${words[0]}`) || b.startsWith(words[0]!) ? 1 : 2 })
  }
  return ranked.sort((a, b) => a.r - b.r).map((x) => x.m)
}

let NAME_OPTIONS: { src: Medication | undefined; list: string[] } = { src: undefined, list: [] }
/** Noms commerciaux courts (dédoublonnés) pour les listes de suggestions. */
export function medNameOptions(): string[] {
  if (NAME_OPTIONS.src !== MEDICATIONS[0] || (MEDICATIONS.length && !NAME_OPTIONS.list.length)) {
    NAME_OPTIONS = { src: MEDICATIONS[0], list: [...new Set(MEDICATIONS.map(medShortName))] }
  }
  return NAME_OPTIONS.list
}

/* Index « premier mot du nom commercial » → produits, pour retrouver un médicament cité dans une question. */
const STOP = new Set([
  'les', 'des', 'une', 'est', 'que', 'qui', 'son', 'ses', 'pas', 'par', 'sur', 'mon', 'car', 'lot', 'pour', 'avec', 'dans', 'quel',
  'quels', 'quelle', 'comment', 'effet', 'effets', 'prix', 'sont', 'etre', 'cette', 'notice', 'mes', 'aux', 'cmu', 'faut', 'peut',
  'puis', 'prendre', 'pris', 'charge', 'combien', 'quoi', 'sert', 'servir', 'generique', 'generiques', 'equivalent', 'medicament',
  'medicaments', 'conserver', 'conservation', 'vous', 'nous', 'elle', 'ils', 'mal', 'bonjour', 'merci', 'aide', 'tout', 'tous',
  'ordonnance', 'pharmacie', 'garde', 'livraison', 'assurance', 'contre', 'indications', 'precautions', 'secondaires', 'coute',
])
const GENERIC_HEAD = new Set([
  'sirop', 'creme', 'gel', 'solution', 'comprime', 'pommade', 'collyre', 'serum', 'eau', 'lait', 'savon', 'huile', 'vaccin', 'acide',
  'vitamine', 'spray', 'gelule', 'poudre', 'suppositoire', 'baume', 'lotion', 'shampooing', 'test', 'bande', 'compresse', 'gants',
])
type Entry = { m: Medication; words: string[] }
let INDEX: { src: Medication | undefined; size: number; brands: Map<string, Entry[]>; dcis: Map<string, Medication[]> } | undefined

function getIndex() {
  if (INDEX && INDEX.src === MEDICATIONS[0] && INDEX.size === MEDICATIONS.length) return INDEX
  const brands = new Map<string, Entry[]>()
  const dcis = new Map<string, Medication[]>()
  for (const m of MEDICATIONS) {
    const words = tokens(medShortName(m))
    const head = words[0]
    if (head && head.length >= 3 && !STOP.has(head)) {
      const l = brands.get(head)
      if (l) l.push({ m, words })
      else brands.set(head, [{ m, words }])
    }
    if (m.dci) {
      for (const part of normalize(m.dci).split(/[+/,]/)) {
        const k = part.trim()
        if (k.length < 4) continue
        const l = dcis.get(k)
        if (l) l.push(m)
        else dcis.set(k, [m])
      }
    }
  }
  INDEX = { src: MEDICATIONS[0], size: MEDICATIONS.length, brands, dcis }
  return INDEX
}

/** Recherche du médicament cité dans la question (nom commercial le plus long, puis DCI ; sans accents). */
export function findMedication(question: string): Medication | undefined {
  const q = normalize(question.replace(/[’`]/g, "'"))
  const qt = tokens(q)
  if (!qt.length) return undefined
  const { brands, dcis } = getIndex()
  const scores = new Map<Medication, number>()
  const bump = (m: Medication, s: number) => scores.set(m, Math.max(scores.get(m) ?? 0, s))

  // 1. Nom commercial : plus longue correspondance mot à mot à partir du premier mot.
  qt.forEach((t, i) => {
    const list = brands.get(t)
    if (!list) return
    for (const { m, words } of list) {
      let k = 1
      while (k < words.length && qt[i + k] === words[k]) k++
      if (k === 1 && GENERIC_HEAD.has(t) && words.length > 1) continue
      let score = 100 + words.slice(0, k).join('').length * 2 + (k === words.length ? 20 : 0)
      const dose = m.dosage?.match(/\d+/)?.[0]
      if (dose && qt.includes(dose)) score += 10
      bump(m, score)
    }
  })
  // 2. DCI (molécule) citée.
  for (const [k, list] of dcis) {
    if (!q.includes(k)) continue
    for (const m of list) {
      let score = 50 + k.length
      const dose = m.dosage?.match(/\d+/)?.[0]
      if (dose && qt.includes(dose)) score += 10
      bump(m, (scores.get(m) ?? 0) + score)
    }
  }
  let best: { m: Medication; score: number } | undefined
  for (const [m, s] of scores) {
    const score = s + (m.cmu.status === 'pris_en_charge' ? 1 : 0) + (m.price ? 0.5 : 0)
    if (!best || score > best.score) best = { m, score }
  }
  return best?.m
}

const cmuDate = (m: Medication) => dateFr(m.cmu.updatedAt)

function medicationAnswer(q: string, m: Medication): AiAnswer {
  const details = [m.dci, m.dosage, m.form?.toLowerCase()].filter(Boolean).join(', ')
  const name = details ? `${m.brand} (${details})` : m.brand
  const fiche: AiLink = { label: 'Voir la fiche', to: `/medicaments/${m.id}` }
  const disclaimer = '\n\nCes informations ne remplacent pas la notice ni l\'avis de votre pharmacien.'
  const doc = (label: string, value: string | undefined, extra = '') =>
    value ? `${label} pour ${name} :\n${value}${extra}${disclaimer}` : MISSING(`${label} pour ${name}`)

  if (has(q, ['effet', 'secondaire', 'indesirable', 'reaction'])) {
    return {
      text: m.sideEffects
        ? `Effets indésirables mentionnés pour ${name} :\n${m.sideEffects}\n\nSi vous ressentez un effet inhabituel, contactez votre pharmacien ou médecin et signalez-le via MON EXPÉRIENCE.${disclaimer}`
        : `${MISSING(`Effets indésirables de ${name}`)}\n\nSi vous ressentez un effet inhabituel, contactez votre pharmacien ou votre médecin, et signalez-le via MON EXPÉRIENCE.`,
      links: [fiche, { label: 'Signaler un effet', to: `/vigilance?med=${m.id}` }],
    }
  }
  if (has(q, ['conserv', 'stock', 'chaleur', 'frigo', 'refrigerat', 'temperature'])) {
    return { text: doc('Conservation', m.storage), links: [fiche] }
  }
  if (has(q, ['contre-indic', 'contre indic', 'contreindic', 'ne pas prendre', 'interdit'])) {
    return { text: doc('Contre-indications', m.contraindications, `\n\n${PRO}`), links: [fiche] }
  }
  if (has(q, ['precaution', 'attention', 'grossesse', 'enceinte', 'allait', 'alcool', 'interaction'])) {
    return { text: doc("Précautions d'emploi", m.precautions, `\n\n${PRO}`), links: [fiche] }
  }
  if (has(q, ['cmu', 'couverture maladie', 'pris en charge', 'rembours'])) {
    const candidates = (m.cmuCandidates ?? []).map((id) => medById(id)).filter((x): x is Medication => !!x)
    const status =
      m.cmu.status === 'pris_en_charge'
        ? `✅ ${m.brand} figure sur la liste publique des médicaments pris en charge par la CMU (mise à jour du ${cmuDate(m)}).`
        : m.cmu.status === 'non_pris_en_charge'
          ? `❌ ${m.brand} est indiqué comme non pris en charge (source : ${m.cmu.source}, ${cmuDate(m)}).`
          : `⚠️ ${m.brand} ne figure pas, sous ce libellé, sur la liste CMU publique (mise à jour du ${cmuDate(m)}).${m.cmu.conditions ? `\n${m.cmu.conditions}` : ''}`
    const cand = candidates.length
      ? `\n\nProduits de la même marque présents sur la liste CMU (cela ne signifie pas que ce produit-ci est pris en charge) :\n${candidates.slice(0, 5).map((c) => `• ${c.brand}`).join('\n')}`
      : ''
    return {
      text: `${status}${cand}\n\nSeule la liste officielle publiée par les autorités (CNAM, ministère de la Santé — sante.gouv.ci) fait foi. Vérifiez auprès de votre pharmacien.`,
      links: [fiche, { label: 'PHARMA CMU', to: `/cmu?q=${encodeURIComponent(m.dci ?? medShortName(m))}` }, ...candidates.slice(0, 2).map((c) => ({ label: c.brand, to: `/medicaments/${c.id}` }))],
    }
  }
  if (has(q, ['generique', 'equivalent', 'similaire', 'meme molecule', 'moins cher'])) {
    const eq = m.equivalents.map((id) => medById(id)).filter((x): x is Medication => !!x)
    return {
      text: eq.length
        ? `Produits de même DCI, même dosage et même forme (${[m.dci, m.dosage, m.form].filter(Boolean).join(' · ')}) dans la base PHARMA MED :\n${eq.slice(0, 8).map((e) => `• ${e.brand}${e.price ? ` — ${fcfa(e.price.amount)}` : ''}`).join('\n')}\n\n⚠️ Ne substituez jamais un médicament sans l'avis de votre pharmacien ou de votre prescripteur.`
        : m.dci
          ? `Aucun autre produit de même DCI, même dosage et même forme que ${name} n'est référencé dans la base PHARMA MED. Votre pharmacien peut vous renseigner.`
          : `La DCI (molécule) de ${m.brand} n'est pas renseignée par la source : je ne peux pas identifier d'équivalent. Votre pharmacien peut vous renseigner.`,
      links: [fiche, ...eq.slice(0, 3).map((e) => ({ label: e.brand, to: `/medicaments/${e.id}` }))],
    }
  }
  if (has(q, ['prix', 'cout', 'tarif', 'combien ca', 'combien coute', 'combien vaut'])) {
    return {
      text: m.price
        ? `Prix publié de ${m.brand} : ${fcfa(m.price.amount)}.\nSource : ${m.price.source} (mise à jour du ${dateFr(m.price.updatedAt)}).\n\nLe prix réel peut varier ; seul le prix payé en pharmacie fait foi.`
        : `Aucun prix n'est publié par nos sources pour ${m.brand}. Renseignez-vous auprès de votre pharmacien.`,
      links: [fiche],
    }
  }
  if (has(q, ['notice', 'mode d\'emploi', 'comment prendre', 'comment utiliser', 'a quoi sert', 'sert a', 'indication'])) {
    const info = m.leaflet ?? m.indications
    return {
      text: info
        ? `${name} :\n${info}\n\nSuivez toujours la posologie indiquée sur votre ordonnance. Je ne peux pas vous indiquer de dose personnalisée.${disclaimer}`
        : `${MISSING(`Notice et indications de ${name}`)}${m.therapeuticClass ? `\n\nClasse thérapeutique publiée par la source : ${m.therapeuticClass}.` : ''}\n\nJe ne peux pas vous indiquer de dose personnalisée.`,
      links: [fiche],
    }
  }
  const lines = [
    m.code && `• Code produit : ${m.code}`,
    m.dci && `• DCI : ${m.dci}`,
    m.therapeuticClass && `• Classe thérapeutique : ${m.therapeuticClass}`,
    m.price && `• Prix publié : ${fcfa(m.price.amount)} (mise à jour du ${dateFr(m.price.updatedAt)})`,
    `• CMU : ${m.cmu.status === 'pris_en_charge' ? 'figure sur la liste CMU publiée' : m.cmu.status === 'non_pris_en_charge' ? 'non pris en charge' : 'absent de la liste CMU publiée — à vérifier'}`,
  ].filter(Boolean)
  return {
    text: `${name}\n${lines.join('\n')}\n\nVous pouvez me demander son prix, son statut CMU ou ses équivalents. Les indications, effets indésirables et précautions ne sont pas renseignés par nos sources : référez-vous à la notice.${disclaimer}`,
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
      text: 'La CMU (Couverture Maladie Universelle) prend en charge une liste de médicaments définie par les autorités, selon la DCI, le dosage et la forme.\n\nDans PHARMA CMU, recherchez un médicament pour savoir s\'il figure sur la liste CMU publique. Seule la liste officielle publiée par la CNAM et le ministère de la Santé (sante.gouv.ci) fait foi.',
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
    return { text: 'PHARMA ASSUR vous permet d\'enregistrer votre assurance sur votre appareil. Aucun assureur partenaire n\'est encore référencé : pour connaître vos garanties, contactez directement votre assureur.', links: [{ label: 'PHARMA ASSUR', to: '/assurances' }] }
  }
  if (has(q, ['faux', 'falsifi', 'contrefa', 'lot', 'rappel', 'scan'])) {
    return {
      text: 'Aucune base officielle de lots n\'est encore connectée à PHARMA CI. SCAN PHARMA permet de retrouver un produit par son code ; vérifiez l\'emballage (aspect, date de péremption, numéro de lot) et achetez vos médicaments en pharmacie. En cas de doute, ne consommez pas le produit et demandez conseil à un pharmacien.',
      links: [{ label: 'SCAN PHARMA', to: '/scan' }, { label: 'Alertes', to: '/alertes' }],
    }
  }
  if (has(q, ['bonjour', 'salut', 'bonsoir', 'merci', 'aide'])) {
    return { text: 'Bonjour 👋 Je suis PHARMA AI. Je peux vous informer sur un médicament de la base PHARMA MED (prix publié, liste CMU, équivalents), sur la lecture d\'une ordonnance, la CMU, les pharmacies de garde ou la livraison.\n\nJe ne pose pas de diagnostic et je ne prescris pas.' }
  }
  return {
    text: 'Je n\'ai pas trouvé de réponse précise. Essayez de citer le nom d\'un médicament (ex. « prix du Doliprane » ou « Coartem CMU ») ou un thème : ordonnance, CMU, garde, livraison, réglementation.\n\nPour toute question sur votre santé, adressez-vous à votre pharmacien.',
    links: [{ label: 'Rechercher un médicament', to: '/medicaments' }],
  }
}
