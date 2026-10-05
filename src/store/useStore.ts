import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Agent, FamilyProfile, FraudEvent, Invoice, LatLng, Mission, MissionStatus, Prescription,
  PrescriptionLine, PrescriptionStatus, Rating, Treatment, UserInsurance, VigilanceReport,
} from '../types'
import { SEED_AGENTS } from '../data/agents'
import { PHARMACIES } from '../data/pharmacies'
import { ABIDJAN, distanceKm, lerp, travelMinutes } from '../lib/geo'
import { otpCode, prescriptionIdFrom, randomCode, uid } from '../lib/crypto'
import { rankAgents } from '../lib/assign'
import { FRAUD_PRICE_GAP } from '../lib/pricing'

export type Notification = { id: string; at: string; title: string; body: string; read: boolean; link?: string; tone?: 'info' | 'success' | 'warning' | 'danger' }
export type AuditEntry = { id: string; at: string; actor: string; action: string; ref: string }

export const MISSION_LABEL: Record<MissionStatus, string> = {
  payee: 'Mission lancée — recherche d\'un agent',
  agent_affecte: 'Agent affecté',
  en_pharmacie: 'Agent en pharmacie',
  ecart_prix: 'Écart de prix — votre décision est requise',
  achat_effectue: 'Achat effectué',
  en_route: 'Agent en route',
  livree: 'Mission terminée',
  annulee: 'Mission annulée',
}

export const PRESCRIPTION_LABEL: Record<PrescriptionStatus, string> = {
  nouvelle: 'Nouvelle',
  en_attente: 'En attente',
  mission_lancee: 'Mission lancée',
  en_cours: 'En cours',
  achat_effectue: 'Achat effectué',
  partiellement_executee: 'Partiellement exécutée',
  livree: 'Livrée',
  annulee: 'Annulée',
  renouvellement: 'Renouvellement',
}

const now = () => new Date().toISOString()

type RegisterResult = { ok: true; prescription: Prescription } | { ok: false; existing: Prescription }

type State = {
  user: { name: string; phone: string; address: string; position: LatLng; commune: string }
  profiles: FamilyProfile[]
  activeProfileId: string
  seniorMode: boolean
  locationGranted: boolean
  insurance?: UserInsurance
  favorites: string[]
  prescriptions: Prescription[]
  missions: Mission[]
  agents: Agent[]
  currentAgentId: string
  treatments: Treatment[]
  reports: VigilanceReport[]
  fraud: FraudEvent[]
  notifications: Notification[]
  audit: AuditEntry[]
  duplicateAttempts: number

  // Profil
  setUser: (u: Partial<State['user']>) => void
  setPosition: (p: LatLng, granted: boolean) => void
  setSeniorMode: (on: boolean) => void
  addProfile: (p: Omit<FamilyProfile, 'id'>) => void
  updateProfile: (id: string, p: Partial<FamilyProfile>) => void
  removeProfile: (id: string) => void
  setActiveProfile: (id: string) => void
  setInsurance: (i?: UserInsurance) => void
  toggleFavorite: (pharmacyId: string) => void

  // Ordonnances
  registerPrescription: (input: { fingerprint: string; fileNames: string[]; previews: string[]; lines: PrescriptionLine[] }) => RegisterResult
  updatePrescriptionLines: (id: string, lines: PrescriptionLine[]) => void
  confirmPrescription: (id: string) => void
  requestRenewal: (id: string) => void
  deletePrescription: (id: string) => void
  logAccess: (actor: string, action: string, ref: string) => void

  // Missions
  launchMission: (input: { prescriptionId: string; estimate: Mission['estimate']; address: string; position: LatLng; paymentMethod: string }) => Mission
  assignAgent: (missionId: string) => void
  agentArrive: (missionId: string, pharmacyId: string) => void
  submitInvoice: (missionId: string, invoice: Invoice) => void
  reportUnavailable: (missionId: string, option: 'autre_pharmacie' | 'informer' | 'partielle' | 'annuler', note: string) => void
  decidePrice: (missionId: string, decision: 'accepte' | 'refuse') => void
  startDelivery: (missionId: string) => void
  tickDelivery: (missionId: string) => void
  confirmDelivery: (missionId: string, code: string) => boolean
  cancelMission: (missionId: string, reason: string) => void
  rateMission: (missionId: string, rating: Rating) => void

  // Agent
  setCurrentAgent: (id: string) => void
  setAgentAvailability: (id: string, available: boolean) => void

  // Traitements
  addTreatment: (t: Omit<Treatment, 'id' | 'takenLog'>) => void
  removeTreatment: (id: string) => void
  markTaken: (id: string, slot: string) => void

  // Pharmacovigilance
  addReport: (r: Omit<VigilanceReport, 'id' | 'createdAt' | 'status'>) => VigilanceReport

  // Anti-fraude / notifications
  addFraud: (f: Omit<FraudEvent, 'id' | 'at' | 'resolved'>) => void
  resolveFraud: (id: string) => void
  notify: (n: Omit<Notification, 'id' | 'at' | 'read'>) => void
  markNotificationsRead: () => void
  resetDemo: () => void
}

const initial = () => ({
  user: { name: 'Moi', phone: '', address: '', position: { lat: 5.3364, lng: -4.0267 }, commune: '' },
  profiles: [
    { id: 'pf-moi', name: 'Moi', relation: 'moi', consent: true } as FamilyProfile,
  ],
  activeProfileId: 'pf-moi',
  seniorMode: false,
  locationGranted: false,
  insurance: undefined,
  favorites: [] as string[],
  prescriptions: [] as Prescription[],
  missions: [] as Mission[],
  agents: SEED_AGENTS,
  currentAgentId: SEED_AGENTS[0]!.id,
  treatments: [] as Treatment[],
  reports: [] as VigilanceReport[],
  fraud: [] as FraudEvent[],
  notifications: [
    { id: 'n-welcome', at: now(), title: 'Bienvenue sur PHARMA CI 👋', body: 'Envoyez une ordonnance, trouvez une pharmacie de garde ou recherchez un médicament.', read: false, tone: 'info' as const },
  ],
  audit: [] as AuditEntry[],
  duplicateAttempts: 0,
})

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patchMission = (id: string, fn: (m: Mission) => Partial<Mission>) =>
        set((s) => ({ missions: s.missions.map((m) => (m.id === id ? { ...m, ...fn(m) } : m)) }))
      const patchPrescription = (id: string, fn: (p: Prescription) => Partial<Prescription>) =>
        set((s) => ({ prescriptions: s.prescriptions.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)) }))
      const patchAgent = (id: string, fn: (a: Agent) => Partial<Agent>) =>
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...fn(a) } : a)) }))
      const step = (m: Mission, status: MissionStatus | 'info', label: string) => [...m.timeline, { at: now(), status, label }]
      const setPrescriptionStatus = (id: string, status: PrescriptionStatus, event: string) =>
        patchPrescription(id, (p) => ({ status, history: [...p.history, { at: now(), event }] }))
      const releaseAgent = (m: Mission) => m.agentId && patchAgent(m.agentId, (a) => ({ activeMissions: Math.max(0, a.activeMissions - 1) }))

      return {
        ...initial(),

        setUser: (u) => set((s) => ({ user: { ...s.user, ...u } })),
        setPosition: (position, granted) => set((s) => ({ user: { ...s.user, position }, locationGranted: granted })),
        setSeniorMode: (seniorMode) => set({ seniorMode }),
        addProfile: (p) => set((s) => ({ profiles: [...s.profiles, { ...p, id: uid('pf-') }] })),
        updateProfile: (id, p) => set((s) => ({ profiles: s.profiles.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
        removeProfile: (id) =>
          set((s) => ({
            profiles: s.profiles.filter((x) => x.id !== id || x.relation === 'moi'),
            activeProfileId: s.activeProfileId === id ? 'pf-moi' : s.activeProfileId,
          })),
        setActiveProfile: (activeProfileId) => set({ activeProfileId }),
        setInsurance: (insurance) => set({ insurance }),
        toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id] })),

        registerPrescription: ({ fingerprint, fileNames, previews, lines }) => {
          const existing = get().prescriptions.find((p) => p.fingerprint === fingerprint)
          if (existing) {
            set((s) => ({ duplicateAttempts: s.duplicateAttempts + 1 }))
            get().addFraud({
              kind: 'doublon_ordonnance',
              severity: existing.locked ? 'elevee' : 'moyenne',
              description: `Nouvel envoi d'une ordonnance déjà enregistrée (${existing.id}, statut « ${PRESCRIPTION_LABEL[existing.status]} »).`,
              ref: existing.id,
            })
            patchPrescription(existing.id, (p) => ({ history: [...p.history, { at: now(), event: 'Tentative de nouvel envoi détectée et bloquée' }] }))
            return { ok: false, existing }
          }
          let id = prescriptionIdFrom(fingerprint)
          while (get().prescriptions.some((p) => p.id === id)) id = `ORD-CI-${new Date().getFullYear()}-${randomCode(5)}`
          const prescription: Prescription = {
            id, fingerprint, fileNames, previews, lines, profileId: get().activeProfileId, createdAt: now(),
            confirmed: false, status: 'nouvelle', locked: false,
            history: [{ at: now(), event: 'Ordonnance reçue — empreinte numérique enregistrée' }],
          }
          set((s) => ({ prescriptions: [prescription, ...s.prescriptions] }))
          get().logAccess('Patient', 'Dépôt d\'ordonnance', id)
          return { ok: true, prescription }
        },
        updatePrescriptionLines: (id, lines) => patchPrescription(id, (p) => (p.locked ? {} : { lines })),
        confirmPrescription: (id) =>
          patchPrescription(id, (p) => ({ confirmed: true, status: 'en_attente', history: [...p.history, { at: now(), event: 'Éléments détectés confirmés par le patient' }] })),
        requestRenewal: (id) =>
          patchPrescription(id, (p) => ({
            status: 'renouvellement', locked: false, missionId: undefined,
            history: [...p.history, { at: now(), event: 'Renouvellement demandé — à vérifier selon les conditions de l\'ordonnance' }],
          })),
        deletePrescription: (id) => set((s) => ({ prescriptions: s.prescriptions.filter((p) => p.id !== id || p.locked) })),
        logAccess: (actor, action, ref) => set((s) => ({ audit: [{ id: uid('au-'), at: now(), actor, action, ref }, ...s.audit].slice(0, 300) })),

        launchMission: ({ prescriptionId, estimate, address, position, paymentMethod }) => {
          const p = get().prescriptions.find((x) => x.id === prescriptionId)!
          const profile = get().profiles.find((x) => x.id === p.profileId)
          const mission: Mission = {
            id: `MIS-${randomCode(6)}`, prescriptionId, profileId: p.profileId, patientName: profile?.name ?? get().user.name,
            deliveryAddress: address, deliveryPosition: position, createdAt: now(), status: 'payee', estimate,
            partial: false, otp: otpCode(), paymentMethod,
            timeline: [{ at: now(), status: 'payee', label: `Paiement du service confirmé (${paymentMethod})` }],
          }
          set((s) => ({ missions: [mission, ...s.missions] }))
          patchPrescription(prescriptionId, (x) => ({
            locked: true, missionId: mission.id, status: 'mission_lancee',
            history: [...x.history, { at: now(), event: `🔒 Ordonnance verrouillée — mission ${mission.id}` }],
          }))
          get().notify({ title: 'Mission lancée 🚀', body: `Votre mission ${mission.id} est payée. Recherche de l'agent le plus proche…`, link: `/missions/${mission.id}`, tone: 'success' })
          return mission
        },

        assignAgent: (missionId) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m || m.status !== 'payee') return
          const best = rankAgents(get().agents, m.deliveryPosition)[0]
          if (!best) {
            patchMission(missionId, (x) => ({ timeline: step(x, 'info', 'Aucun agent disponible pour le moment — nouvelle tentative automatique') }))
            return
          }
          patchAgent(best.agent.id, (a) => ({ activeMissions: a.activeMissions + 1 }))
          patchMission(missionId, (x) => ({
            status: 'agent_affecte', agentId: best.agent.id, agentPosition: best.agent.position, eta: best.minutes + 25,
            timeline: step(x, 'agent_affecte', `${best.agent.name} affecté(e) automatiquement (${best.km.toFixed(1)} km, ~${best.minutes} min)`),
          }))
          setPrescriptionStatus(m.prescriptionId, 'en_cours', `Agent affecté : ${best.agent.name}`)
          get().logAccess(`Agent ${best.agent.name}`, 'Accès ordonnance (mission)', m.prescriptionId)
          get().notify({ title: 'Agent affecté 🧑🏾‍💼', body: `${best.agent.name} prend en charge votre mission.`, link: `/missions/${missionId}`, tone: 'info' })
        },

        agentArrive: (missionId, pharmacyId) => {
          const ph = PHARMACIES.find((p) => p.id === pharmacyId)
          patchMission(missionId, (x) => ({
            status: 'en_pharmacie', pharmacyId, agentPosition: ph?.position ?? x.agentPosition,
            timeline: step(x, 'en_pharmacie', `Agent arrivé à ${ph?.name ?? 'la pharmacie'} — présentation de l'ordonnance`),
          }))
          const m = get().missions.find((x) => x.id === missionId)
          if (m && ph && m.agentId) {
            // Contrôle de cohérence : la pharmacie choisie doit être raisonnablement proche du patient.
            if (distanceKm(ph.position, m.deliveryPosition) > 30)
              get().addFraud({ kind: 'localisation_incoherente', severity: 'moyenne', description: `Pharmacie à plus de 30 km du lieu de livraison (mission ${missionId}).`, ref: missionId })
          }
        },

        submitInvoice: (missionId, invoice) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m) return
          const partial = invoice.lines.some((l) => !l.obtained)
          const gap = invoice.amount - m.estimate.medications
          const over = gap > 0
          if (m.estimate.medications > 0 && gap / m.estimate.medications > FRAUD_PRICE_GAP)
            get().addFraud({
              kind: 'ecart_facture', severity: gap / m.estimate.medications > 0.6 ? 'elevee' : 'moyenne',
              description: `Facture ${invoice.pharmacyName} supérieure de ${Math.round((gap / m.estimate.medications) * 100)} % à l'estimation (mission ${missionId}).`, ref: missionId,
            })
          patchMission(missionId, (x) => ({
            invoice, partial,
            status: over ? 'ecart_prix' : 'achat_effectue',
            timeline: step(x, over ? 'ecart_prix' : 'achat_effectue',
              over ? `Facture pharmacie : ${invoice.amount} FCFA — supérieure à l'estimation` : `Achat effectué — facture de ${invoice.amount} FCFA photographiée`),
          }))
          setPrescriptionStatus(m.prescriptionId, partial ? 'partiellement_executee' : 'achat_effectue', partial ? 'Achat partiel (produit(s) indisponible(s))' : 'Médicaments achetés — facture enregistrée')
          get().logAccess('Agent', 'Dépôt facture pharmacie', missionId)
          get().notify(
            over
              ? { title: '⚠️ Montant supérieur à l\'estimation', body: 'Le montant réel de la pharmacie est supérieur à l\'estimation. Acceptez ou refusez.', link: `/missions/${missionId}`, tone: 'warning' }
              : { title: 'Achat effectué 🧾', body: 'Vos médicaments ont été achetés. La facture originale vous sera remise.', link: `/missions/${missionId}`, tone: 'success' },
          )
        },

        reportUnavailable: (missionId, option, note) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m) return
          const labels = {
            autre_pharmacie: 'Médicament indisponible — l\'agent cherche une autre pharmacie',
            informer: 'Médicament indisponible — le patient est informé',
            partielle: 'Mission partiellement exécutée',
            annuler: 'Mission annulée (médicament indisponible)',
          }
          if (option === 'annuler') return get().cancelMission(missionId, note || labels.annuler)
          patchMission(missionId, (x) => ({ unavailableNote: note, partial: option === 'partielle' || x.partial, timeline: step(x, 'info', `${labels[option]}${note ? ` : ${note}` : ''}`) }))
          get().notify({ title: 'Information sur votre mission', body: `${labels[option]}. Aucun médicament prescrit ne sera remplacé sans l'avis d'un professionnel.`, link: `/missions/${missionId}`, tone: 'warning' })
        },

        decidePrice: (missionId, decision) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m) return
          if (decision === 'refuse') {
            patchMission(missionId, (x) => ({ priceDecision: 'refuse', timeline: step(x, 'info', 'Le patient a refusé le montant réel') }))
            return get().cancelMission(missionId, 'Montant réel refusé par le patient')
          }
          patchMission(missionId, (x) => ({ priceDecision: 'accepte', status: 'achat_effectue', timeline: step(x, 'achat_effectue', 'Montant réel accepté par le patient') }))
        },

        startDelivery: (missionId) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m) return
          const agent = get().agents.find((a) => a.id === m.agentId)
          const from = m.agentPosition ?? agent?.position ?? ABIDJAN
          patchMission(missionId, (x) => ({
            status: 'en_route', eta: travelMinutes(distanceKm(from, x.deliveryPosition), agent?.vehicle),
            timeline: step(x, 'en_route', 'Agent en route vers vous'),
          }))
          get().notify({ title: 'Agent en route 🛵', body: 'Préparez votre code de livraison.', link: `/missions/${missionId}`, tone: 'info' })
        },

        tickDelivery: (missionId) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m || m.status !== 'en_route' || !m.agentPosition) return
          const agent = get().agents.find((a) => a.id === m.agentId)
          const km = distanceKm(m.agentPosition, m.deliveryPosition)
          if (km < 0.05) return patchMission(missionId, () => ({ eta: 0 }))
          const next = lerp(m.agentPosition, m.deliveryPosition, Math.min(1, 0.35 / Math.max(km, 0.35)))
          patchMission(missionId, () => ({ agentPosition: next, eta: travelMinutes(distanceKm(next, m.deliveryPosition), agent?.vehicle) }))
          if (agent) patchAgent(agent.id, () => ({ position: next }))
        },

        confirmDelivery: (missionId, code) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m || m.status !== 'en_route' || m.otp !== code.trim()) return false
          patchMission(missionId, (x) => ({ status: 'livree', eta: 0, agentPosition: x.deliveryPosition, timeline: step(x, 'livree', 'Code OTP validé — médicaments, facture originale et justificatif remis ✅') }))
          setPrescriptionStatus(m.prescriptionId, m.partial ? 'partiellement_executee' : 'livree', 'Livraison confirmée par code OTP')
          if (m.agentId) patchAgent(m.agentId, (a) => ({ activeMissions: Math.max(0, a.activeMissions - 1), completed: a.completed + 1, earnings: a.earnings + Math.round(m.estimate.delivery * 0.8 + m.estimate.service * 0.3) }))
          get().notify({ title: 'Mission terminée ✅', body: 'Merci ! Notez votre agent et le service PHARMA CI.', link: `/missions/${missionId}`, tone: 'success' })
          return true
        },

        cancelMission: (missionId, reason) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m || m.status === 'livree' || m.status === 'annulee') return
          releaseAgent(m)
          patchMission(missionId, (x) => ({ status: 'annulee', timeline: step(x, 'annulee', `Mission annulée : ${reason}`) }))
          patchPrescription(m.prescriptionId, (p) => ({ status: 'annulee', locked: false, history: [...p.history, { at: now(), event: `Mission ${missionId} annulée — ordonnance déverrouillée` }] }))
          get().notify({ title: 'Mission annulée', body: reason, link: `/missions/${missionId}`, tone: 'danger' })
        },

        rateMission: (missionId, rating) => {
          patchMission(missionId, () => ({ rating }))
          const m = get().missions.find((x) => x.id === missionId)
          if (m?.agentId) {
            const avg = (rating.agent.ponctualite + rating.agent.courtoisie + rating.agent.respect) / 3
            patchAgent(m.agentId, (a) => ({ rating: Math.round(((a.rating * Math.max(0, a.completed - 1) + avg) / Math.max(1, a.completed)) * 100) / 100 }))
          }
        },

        setCurrentAgent: (currentAgentId) => set({ currentAgentId }),
        setAgentAvailability: (id, available) => patchAgent(id, () => ({ available })),

        addTreatment: (t) => set((s) => ({ treatments: [...s.treatments, { ...t, id: uid('tr-'), takenLog: [] }] })),
        removeTreatment: (id) => set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) })),
        markTaken: (id, slot) =>
          set((s) => ({ treatments: s.treatments.map((t) => (t.id === id ? { ...t, takenLog: t.takenLog.includes(slot) ? t.takenLog.filter((x) => x !== slot) : [...t.takenLog, slot] } : t)) })),

        addReport: (r) => {
          const report: VigilanceReport = { ...r, id: `SIG-${randomCode(6)}`, createdAt: now(), status: r.kind === 'pharmacovigilance' && r.severity === 'grave' ? 'transmis_airp' : 'recu' }
          set((s) => ({ reports: [report, ...s.reports] }))
          return report
        },

        addFraud: (f) => set((s) => ({ fraud: [{ ...f, id: uid('fr-'), at: now(), resolved: false }, ...s.fraud] })),
        resolveFraud: (id) => set((s) => ({ fraud: s.fraud.map((f) => (f.id === id ? { ...f, resolved: true } : f)) })),
        notify: (n) => set((s) => ({ notifications: [{ ...n, id: uid('n-'), at: now(), read: false }, ...s.notifications].slice(0, 50) })),
        markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
        resetDemo: () => set(initial()),
      }
    },
    { name: 'pharma-ci', version: 2, migrate: () => initial() as unknown as State },
  ),
)

// Synchronisation entre onglets : l'app Agent et l'app Patient ouvertes côte à côte restent à jour.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'pharma-ci') void useStore.persist.rehydrate()
  })
}

export const useActiveProfile = () => useStore((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles[0]!)
