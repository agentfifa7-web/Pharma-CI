// Module « Parler à un pharmacien » : mise en relation directe avec la pharmacie choisie
// (WhatsApp, appel, SMS). Aucun serveur : le message part depuis le téléphone du patient.

export type ContactChannel = 'whatsapp' | 'appel' | 'sms'

export const CHANNEL_LABEL: Record<ContactChannel, string> = { whatsapp: 'WhatsApp', appel: 'Appel', sms: 'SMS' }

export type QuestionTopic = 'conseil' | 'disponibilite' | 'prix' | 'ordonnance' | 'effet' | 'petit_mal' | 'autre'

export const TOPICS: { value: QuestionTopic; label: string; emoji: string; placeholder: string }[] = [
  { value: 'conseil', label: 'Conseil sur un médicament', emoji: '💊', placeholder: 'Ex. : comment prendre ce médicament ? Avant ou après le repas ?' },
  { value: 'disponibilite', label: 'Disponibilité', emoji: '📦', placeholder: 'Ex. : avez-vous ce médicament en stock aujourd\'hui ?' },
  { value: 'prix', label: 'Prix', emoji: '💰', placeholder: 'Ex. : quel est le prix de ce médicament chez vous ?' },
  { value: 'ordonnance', label: 'Mon ordonnance', emoji: '📄', placeholder: 'Ex. : pouvez-vous préparer mon ordonnance ? Je vous envoie la photo.' },
  { value: 'effet', label: 'Effet indésirable', emoji: '⚠️', placeholder: 'Ex. : depuis que je prends ce médicament, j\'ai des démangeaisons.' },
  { value: 'petit_mal', label: 'Petit problème de santé', emoji: '🤒', placeholder: 'Ex. : mal de gorge depuis 2 jours, sans fièvre. Que me conseillez-vous ?' },
  { value: 'autre', label: 'Autre question', emoji: '💬', placeholder: 'Écrivez votre question au pharmacien.' },
]

export const topicInfo = (t: QuestionTopic) => TOPICS.find((x) => x.value === t) ?? TOPICS[TOPICS.length - 1]!

/**
 * Analyse un numéro ivoirien tel que publié par l'annuaire.
 * Depuis 2021 les numéros comptent 10 chiffres : 01, 05, 07 = mobiles ; 21, 25, 27 = fixes.
 * Les numéros à 8 chiffres (ancien format) sont conservés tels quels.
 */
export function parsePhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  const national = digits.length === 13 && digits.startsWith('225') ? digits.slice(3) : digits
  if (national.length === 10) {
    const mobile = ['01', '05', '07'].includes(national.slice(0, 2))
    return { valid: true, legacy: false, mobile, tel: `+225${national}`, intl: `225${national}` }
  }
  if (national.length === 8) return { valid: true, legacy: true, mobile: false, tel: national, intl: '' }
  return { valid: false, legacy: false, mobile: false, tel: '', intl: '' }
}

export const telHref = (phone: string) => `tel:${parsePhone(phone).tel}`
export const whatsappHref = (phone: string, text: string) => `https://wa.me/${parsePhone(phone).intl}?text=${encodeURIComponent(text)}`
export const smsHref = (phone: string, text: string) => `sms:${parsePhone(phone).tel}?body=${encodeURIComponent(text)}`

export function contactHref(channel: ContactChannel, phone: string, text: string) {
  if (channel === 'whatsapp') return whatsappHref(phone, text)
  if (channel === 'sms') return smsHref(phone, text)
  return telHref(phone)
}

/** Canaux possibles pour un numéro : WhatsApp et SMS seulement vers un mobile. */
export function channelsFor(phone: string): ContactChannel[] {
  const p = parsePhone(phone)
  if (!p.valid) return []
  return p.mobile ? ['whatsapp', 'appel', 'sms'] : ['appel']
}

export type MessageInput = {
  pharmacyName?: string
  topic: QuestionTopic
  forWhom?: string
  medication?: string
  question: string
  withPrescriptionPhoto?: boolean
}

/** Message prêt à envoyer, en français simple. */
export function buildMessage(m: MessageInput) {
  const lines = [
    `Bonjour${m.pharmacyName ? ` ${m.pharmacyName}` : ''},`,
    'Je vous contacte depuis PHARMA CI (www.pharma-ci.org).',
    '',
    `Sujet : ${topicInfo(m.topic).label}`,
  ]
  if (m.forWhom) lines.push(`Pour : ${m.forWhom}`)
  if (m.medication?.trim()) lines.push(`Médicament : ${m.medication.trim()}`)
  if (m.question.trim()) lines.push('', m.question.trim())
  if (m.withPrescriptionPhoto) lines.push('', 'Je vous envoie la photo de mon ordonnance juste après ce message.')
  lines.push('', 'Merci beaucoup.')
  return lines.join('\n')
}
