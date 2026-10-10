/**
 * Numéros de Côte d'Ivoire (plan à 10 chiffres depuis 2021) : mobiles 01 (Moov), 05 (MTN), 07 (Orange),
 * fixes 21, 25, 27. L'indicatif +225 / 00225 est accepté et retiré.
 */
const CI_PHONE = /^(01|05|07|21|25|27)\d{8}$/

/** Renvoie le numéro au format « 07 77 77 66 55 », ou undefined s'il n'est pas un numéro ivoirien valide. */
export function normalizeCiPhone(input: string): string | undefined {
  let d = input.replace(/[^\d+]/g, '')
  if (d.startsWith('+225')) d = d.slice(4)
  else if (d.startsWith('00225')) d = d.slice(5)
  else if (d.startsWith('225') && d.length === 13) d = d.slice(3)
  if (!CI_PHONE.test(d)) return undefined
  return d.replace(/(\d{2})(?=\d)/g, '$1 ')
}

export const CI_PHONE_HINT = 'Numéro ivoirien à 10 chiffres commençant par 01, 05 ou 07 (mobile), ou 21, 25, 27 (fixe). Ex. 07 08 09 10 11'
