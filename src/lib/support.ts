import { useCallback, useEffect, useState } from 'react'
import type { SupportContact, TicketCategory, TicketStatus } from '../types'
import { useStore } from '../store/useStore'
import { getSupportContact } from './sync'

export const CATEGORIES: { value: TicketCategory; label: string; emoji: string; for: ('client' | 'agent')[] }[] = [
  { value: 'commande', label: 'Ma commande', emoji: '📦', for: ['client', 'agent'] },
  { value: 'livraison', label: 'Livraison', emoji: '🛵', for: ['client', 'agent'] },
  { value: 'paiement', label: 'Paiement / argent', emoji: '💰', for: ['client', 'agent'] },
  { value: 'application', label: "L'application ne marche pas", emoji: '📱', for: ['client', 'agent'] },
  { value: 'compte', label: 'Mon compte / code agent', emoji: '🔑', for: ['agent'] },
  { value: 'securite', label: 'Sécurité / comportement', emoji: '🛡️', for: ['client', 'agent'] },
  { value: 'autre', label: 'Autre souci', emoji: '💬', for: ['client', 'agent'] },
]

export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1]!

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: 'orange' | 'blue' | 'green' }> = {
  nouveau: { label: 'Reçu', tone: 'orange' },
  en_cours: { label: 'En cours de traitement', tone: 'blue' },
  resolu: { label: 'Résolu', tone: 'green' },
}

/** Numéro du service administratif donné par Assa (12/10/2026), utilisé tant qu'aucun contact n'est réglé dans Admin → Support. */
export const DEFAULT_SUPPORT: SupportContact = { phone: '+2250504151949', whatsapp: '+2250504151949' }

const hasAny = (c: SupportContact) => !!(c.phone || c.whatsapp || c.email)

/** Coordonnées du support : copie locale affichée tout de suite, puis actualisée depuis le service. */
export function useSupportContact() {
  const contact = useStore((s) => s.supportContact)
  const setContact = useStore((s) => s.setSupportContact)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    const r = await getSupportContact()
    setLoading(false)
    if ('contact' in r) {
      setContact(r.contact)
      setError('')
    } else setError(r.error)
  }, [setContact])

  useEffect(() => { void refresh() }, [refresh])
  return { contact, shown: hasAny(contact) ? contact : { ...DEFAULT_SUPPORT, ...contact, ...DEFAULT_SUPPORT }, loading, error, refresh }
}
