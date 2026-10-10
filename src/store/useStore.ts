import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Agent, FamilyProfile, FraudEvent, InsurerPartner, Invoice, LatLng, Mission, MissionStatus, Prescription,
  PrescriptionLine, PrescriptionStatus, Rating, Treatment, UserInsurance, VigilanceReport,
} from '../types'
import { PHARMACIES } from '../data/pharmacies'
import { ABIDJAN, distanceKm, lerp, travelMinutes } from '../lib/geo'
import { otpCode, prescriptionIdFrom, randomCode, uid } from '../lib/crypto'
import { rankAgents } from '../lib/assign'
import { FRAUD_PRICE_GAP } from '../lib/pricing'
import { createMission, deleteAgent, saveAgent, updateMission, type SyncAuth } from '../lib/sync'

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
  /** Code d'accès des agents (missions partagées), saisi une fois sur le téléphone de l'agent. */
  agentCode: string
  /** Dernière erreur de synchronisation côté agent (ex. code refusé). */
  agentSyncError?: string
  /** Dernière synchronisation réussie avec le service (code agent). */
  lastSync?: string
  /** Code de l'administratrice (vérifié par le service) : seul ce téléphone voit l'espace Admin. */
  adminCode: string
  /** Assureurs partenaires (copie du service, gardée pour l'affichage hors connexion). */
  partners: InsurerPartner[]
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
  /** Enregistre la mission sur le service des agents ; rien n'est verrouillé si l'envoi échoue. */
  launchMission: (input: { prescriptionId: string; estimate: Mission['estimate']; address: string; position: LatLng; paymentMethod: string; patientPhone?: string }) => Promise<{ ok: true; mission: Mission } | { ok: false; error: string }>
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

  // Missions partagées (patient ↔ agent)
  syncMission: (missionId: string) => Promise<void>
  applyRemoteMission: (m: Mission) => void
  acceptMission: (missionId: string) => void
  confirmDeliveryRemote: (missionId: string, code: string) => Promise<{ ok: boolean; error?: string }>
  setAgentPosition: (missionId: string, position: LatLng) => void

  // Agent
  setCurrentAgent: (id: string) => void
  setAgentAvailability: (id: string, available: boolean) => void
  setAgentCode: (code: string) => void
  setAdminCode: (code: string) => void
  setPartners: (partners: InsurerPartner[]) => void
  setAgentSyncError: (error?: string) => void
  setLastSync: (at: string) => void
  saveAgentProfile: (p: Pick<Agent, 'name' | 'phone' | 'zone' | 'vehicle'>) => void
  /** Liste des agents enregistrés sur le service (remplace la liste locale). */
  setRemoteAgents: (agents: Agent[]) => void
  /** Envoie le profil d'un agent au service (code agent requis). */
  pushAgent: (id: string) => Promise<boolean>
  removeAgent: (id: string) => Promise<boolean>

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
  agents: [] as Agent[],
  currentAgentId: '',
  agentCode: '',
  agentSyncError: undefined as string | undefined,
  adminCode: '',
  partners: [] as InsurerPartner[],
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
      const replaceMission = (id: string, fn: (m: Mission) => Partial<Mission>) =>
        set((s) => ({ missions: s.missions.map((m) => (m.id === id ? { ...m, ...fn(m) } : m)) }))
      // Toute modification d'une mission partagée est envoyée à la base (regroupée sur 400 ms).
      const syncTimers = new Map<string, ReturnType<typeof setTimeout>>()
      const scheduleSync = (id: string) => {
        clearTimeout(syncTimers.get(id))
        syncTimers.set(id, setTimeout(() => void get().syncMission(id), 400))
      }
      const patchMission = (id: string, fn: (m: Mission) => Partial<Mission>) => {
        replaceMission(id, (m) => ({ ...fn(m), ...(m.remote ? { syncPending: true } : {}) }))
        if (get().missions.find((m) => m.id === id)?.remote) scheduleSync(id)
      }
      const inflight = new Set<string>()
      const authFor = (m: Mission): SyncAuth => (m.token ? { token: m.token } : { agentCode: get().agentCode })
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

        launchMission: async ({ prescriptionId, estimate, address, position, paymentMethod, patientPhone }) => {
          const p = get().prescriptions.find((x) => x.id === prescriptionId)
          if (!p) return { ok: false, error: 'Ordonnance introuvable' }
          const profile = get().profiles.find((x) => x.id === p.profileId)
          const mission: Mission = {
            id: `MIS-${randomCode(6)}`, prescriptionId, profileId: p.profileId, patientName: profile?.name ?? get().user.name,
            deliveryAddress: address, deliveryPosition: position, createdAt: now(), status: 'payee', estimate,
            partial: false, otp: otpCode(), paymentMethod,
            timeline: [{ at: now(), status: 'payee', label: `Paiement du service confirmé (${paymentMethod})` }],
            remote: true, token: randomCode(24), patientPhone: patientPhone || get().user.phone,
            // Copie de l'ordonnance pour l'agent : 3 photos au plus, pour rester léger.
            prescription: { id: p.id, lines: p.lines, previews: p.previews.slice(0, 3), fileNames: p.fileNames.slice(0, 3) },
          }
          const res = await createMission(mission)
          if (!res.ok) return { ok: false, error: res.error }
          set((s) => ({ missions: [{ ...mission, rev: res.rev, syncPending: false }, ...s.missions] }))
          patchPrescription(prescriptionId, (x) => ({
            locked: true, missionId: mission.id, status: 'mission_lancee',
            history: [...x.history, { at: now(), event: `🔒 Ordonnance verrouillée — mission ${mission.id}` }],
          }))
          get().notify({ title: 'Mission lancée 🚀', body: `Votre mission ${mission.id} est transmise aux agents PHARMA CI.`, link: `/missions/${mission.id}`, tone: 'success' })
          return { ok: true, mission }
        },

        assignAgent: (missionId) => {
          const m = get().missions.find((x) => x.id === missionId)
          if (!m || m.status !== 'payee' || m.remote) return
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
          if (!m || m.status !== 'en_route' || !m.agentPosition || m.remote) return
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

        syncMission: async (id) => {
          const m = get().missions.find((x) => x.id === id)
          if (!m?.remote || !m.syncPending) return
          if (inflight.has(id)) return scheduleSync(id)
          inflight.add(id)
          const res = m.rev ? await updateMission(m, authFor(m)) : await createMission(m)
          inflight.delete(id)
          if (res.ok) {
            // Si la mission a encore changé pendant l'envoi, la nouvelle version part au tour suivant.
            const changed = get().missions.find((x) => x.id === id) !== m
            replaceMission(id, () => ({ rev: res.rev, syncPending: changed }))
            if (changed) scheduleSync(id)
            return
          }
          if (res.status === 0) return // pas de réseau : nouvel essai automatique
          if (res.status === 409 && res.mission) {
            replaceMission(id, () => ({ syncPending: false }))
            get().applyRemoteMission(res.mission)
            get().notify({ title: 'Mission mise à jour entre-temps', body: `La mission ${id} a été modifiée par ailleurs. Vérifiez son état puis recommencez si besoin.`, link: m.token ? `/missions/${id}` : `/agent/missions/${id}`, tone: 'warning' })
            return
          }
          replaceMission(id, () => ({ syncPending: false }))
          get().notify({ title: 'Mission non transmise', body: `${res.error}. La mission ${id} n'a pas pu être enregistrée sur le service.`, link: m.token ? `/missions/${id}` : `/agent/missions/${id}`, tone: 'danger' })
        },

        applyRemoteMission: (remote) => {
          const local = get().missions.find((x) => x.id === remote.id)
          if (local && (remote.rev ?? 0) <= (local.rev ?? 0)) return
          const merged: Mission = { ...remote, remote: true, syncPending: false, token: local?.token, otp: remote.otp ?? local?.otp ?? '' }
          set((s) => ({ missions: local ? s.missions.map((x) => (x.id === remote.id ? merged : x)) : [merged, ...s.missions] }))
          if (merged.token) {
            // Côté patient : l'ordonnance et les notifications suivent l'avancement donné par l'agent.
            if (local && local.status !== merged.status) {
              const pres: Partial<Record<MissionStatus, PrescriptionStatus>> = {
                agent_affecte: 'en_cours', en_pharmacie: 'en_cours',
                achat_effectue: merged.partial ? 'partiellement_executee' : 'achat_effectue',
                livree: merged.partial ? 'partiellement_executee' : 'livree',
              }
              const next = pres[merged.status]
              if (next) setPrescriptionStatus(merged.prescriptionId, next, MISSION_LABEL[merged.status])
              if (merged.status === 'annulee')
                patchPrescription(merged.prescriptionId, (p) => ({ status: 'annulee', locked: false, history: [...p.history, { at: now(), event: `Mission ${merged.id} annulée — ordonnance déverrouillée` }] }))
              get().notify({
                title: MISSION_LABEL[merged.status],
                body: merged.timeline.at(-1)?.label ?? '',
                link: `/missions/${merged.id}`,
                tone: merged.status === 'ecart_prix' ? 'warning' : merged.status === 'annulee' ? 'danger' : 'info',
              })
            }
          } else if (!local && merged.status === 'payee') {
            get().notify({ title: 'Nouvelle mission disponible 🛵', body: `${merged.id} · ${merged.deliveryAddress}`, link: `/agent/missions/${merged.id}`, tone: 'info' })
          }
        },

        acceptMission: (missionId) => {
          const m = get().missions.find((x) => x.id === missionId)
          const agent = get().agents.find((a) => a.id === get().currentAgentId)
          if (!m || m.status !== 'payee' || !agent) return
          patchAgent(agent.id, (a) => ({ activeMissions: a.activeMissions + 1, available: true }))
          patchMission(missionId, (x) => ({
            status: 'agent_affecte', agentId: agent.id, agentName: agent.name, agentPhone: agent.phone, agentPosition: agent.position,
            eta: travelMinutes(distanceKm(agent.position, x.deliveryPosition), agent.vehicle) + 25,
            timeline: step(x, 'agent_affecte', `${agent.name} a accepté la mission`),
          }))
        },

        confirmDeliveryRemote: async (missionId, code) => {
          await get().syncMission(missionId)
          const m = get().missions.find((x) => x.id === missionId)
          if (!m || m.status !== 'en_route') return { ok: false, error: 'Mission introuvable ou pas en cours de livraison' }
          const next: Mission = { ...m, status: 'livree', eta: 0, agentPosition: m.deliveryPosition, timeline: step(m, 'livree', 'Code OTP validé — médicaments, facture originale et justificatif remis ✅') }
          const res = await updateMission(next, authFor(m), code.trim())
          if (!res.ok) {
            if (res.status === 409 && res.mission) get().applyRemoteMission(res.mission)
            return { ok: false, error: res.status === 403 ? 'Code incorrect. Demandez au patient le code affiché dans son application.' : res.status === 0 ? 'Pas de connexion. Réessayez dans un instant.' : res.error }
          }
          replaceMission(missionId, () => ({ ...next, rev: res.rev, syncPending: false }))
          if (m.agentId) {
            patchAgent(m.agentId, (a) => ({ activeMissions: Math.max(0, a.activeMissions - 1), completed: a.completed + 1, earnings: a.earnings + Math.round(m.estimate.delivery * 0.8 + m.estimate.service * 0.3) }))
            void get().pushAgent(m.agentId)
          }
          return { ok: true }
        },

        setAgentPosition: (missionId, position) => {
          const m = get().missions.find((x) => x.id === missionId)
          const agent = get().agents.find((a) => a.id === m?.agentId)
          if (!m) return
          patchMission(missionId, (x) => ({ agentPosition: position, eta: travelMinutes(distanceKm(position, x.deliveryPosition), agent?.vehicle) }))
        },

        setCurrentAgent: (currentAgentId) => set({ currentAgentId }),
        setAgentAvailability: (id, available) => {
          patchAgent(id, () => ({ available }))
          void get().pushAgent(id)
        },
        setAgentCode: (agentCode) => set({ agentCode: agentCode.trim(), agentSyncError: undefined }),
        setAgentSyncError: (agentSyncError) => set({ agentSyncError }),
        setAdminCode: (adminCode) => set({ adminCode: adminCode.trim() }),
        setPartners: (partners) => set({ partners }),
        setLastSync: (lastSync) => set({ lastSync }),
        saveAgentProfile: (p) => {
          const current = get().agents.find((a) => a.id === get().currentAgentId)
          if (current) patchAgent(current.id, () => p)
          else {
            const agent: Agent = { id: uid('ag-'), photo: '', position: ABIDJAN, available: true, activeMissions: 0, rating: 0, completed: 0, earnings: 0, ...p }
            set((s) => ({ agents: [...s.agents, agent], currentAgentId: agent.id }))
          }
          void get().pushAgent(get().currentAgentId)
        },
        setRemoteAgents: (remote) =>
          set((s) => {
            // Missions en cours de chaque agent, comptées sur les missions connues de cet appareil.
            const active = (id: string) => s.missions.filter((m) => m.agentId === id && !['livree', 'annulee'].includes(m.status)).length
            const own = s.agents.find((a) => a.id === s.currentAgentId)
            // Le profil de ce téléphone fait foi pour lui-même (modifications pas encore envoyées comprises).
            const list = remote.map((a) => (own && a.id === own.id ? { ...own, lastSeen: a.lastSeen } : { ...a, photo: a.photo ?? '', activeMissions: active(a.id) }))
            if (own && !list.some((a) => a.id === own.id)) list.push(own)
            return { agents: list }
          }),
        pushAgent: async (id) => {
          const agent = get().agents.find((a) => a.id === id)
          const code = get().agentCode
          if (!agent || !code) return false
          const ok = await saveAgent(agent, code)
          if (ok) patchAgent(id, () => ({ lastSeen: now() }))
          return ok
        },
        removeAgent: async (id) => {
          const code = get().agentCode
          if (code && !(await deleteAgent(id, code))) return false
          set((s) => ({ agents: s.agents.filter((a) => a.id !== id), currentAgentId: s.currentAgentId === id ? '' : s.currentAgentId }))
          return true
        },

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
    {
      name: 'pharma-ci',
      version: 3,
      migrate: (persisted, version) => {
        if (version < 2 || !persisted) return initial() as unknown as State
        // Version 3 : suppression des comptes agents de test (ag-01 à ag-07) et des missions de démonstration
        // qui n'existaient que sur cet appareil ; les ordonnances concernées redeviennent utilisables.
        const s = persisted as State
        const isSeed = (id?: string) => !!id && /^ag-0\d$/.test(id)
        const dropped = new Set(s.missions.filter((m) => !m.remote).map((m) => m.id))
        return {
          ...s,
          agents: s.agents.filter((a) => !isSeed(a.id)),
          currentAgentId: isSeed(s.currentAgentId) ? '' : s.currentAgentId,
          missions: s.missions.filter((m) => m.remote),
          prescriptions: s.prescriptions.map((p) =>
            p.missionId && dropped.has(p.missionId)
              ? { ...p, missionId: undefined, locked: false, status: p.status === 'livree' || p.status === 'partiellement_executee' ? p.status : 'en_attente' }
              : p,
          ),
        } as State
      },
    },
  ),
)

// Synchronisation entre onglets : l'app Agent et l'app Patient ouvertes côte à côte restent à jour.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'pharma-ci') void useStore.persist.rehydrate()
  })
}

export const useActiveProfile = () => useStore((s) => s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles[0]!)
