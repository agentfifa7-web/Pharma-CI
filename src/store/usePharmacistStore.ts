import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '../lib/crypto'
import type { ContactChannel, QuestionTopic } from '../lib/pharmacist'

/** Échange avec un pharmacien, conservé uniquement sur le téléphone du patient. */
export type PharmacistExchange = {
  id: string
  at: string
  pharmacyId: string
  pharmacyName: string
  phone: string
  channel: ContactChannel
  topic: QuestionTopic
  forWhom?: string
  medication?: string
  question: string
  message: string
  /** Réponse du pharmacien notée par le patient (aide-mémoire). */
  answer?: string
  answeredAt?: string
  resolved: boolean
}

type State = {
  exchanges: PharmacistExchange[]
  addExchange: (e: Omit<PharmacistExchange, 'id' | 'at' | 'resolved'>) => string
  saveAnswer: (id: string, answer: string) => void
  toggleResolved: (id: string) => void
  removeExchange: (id: string) => void
  clearExchanges: () => void
}

// Stockage séparé du reste de l'application : ajouter ce module ne touche pas aux données existantes.
export const usePharmacistStore = create<State>()(
  persist(
    (set) => ({
      exchanges: [],
      addExchange: (e) => {
        const id = uid('ph-')
        set((s) => ({ exchanges: [{ ...e, id, at: new Date().toISOString(), resolved: false }, ...s.exchanges].slice(0, 100) }))
        return id
      },
      saveAnswer: (id, answer) =>
        set((s) => ({ exchanges: s.exchanges.map((x) => (x.id === id ? { ...x, answer: answer.trim() || undefined, answeredAt: answer.trim() ? new Date().toISOString() : undefined } : x)) })),
      toggleResolved: (id) => set((s) => ({ exchanges: s.exchanges.map((x) => (x.id === id ? { ...x, resolved: !x.resolved } : x)) })),
      removeExchange: (id) => set((s) => ({ exchanges: s.exchanges.filter((x) => x.id !== id) })),
      clearExchanges: () => set({ exchanges: [] }),
    }),
    { name: 'pharma-ci-pharmacien', version: 1 },
  ),
)
