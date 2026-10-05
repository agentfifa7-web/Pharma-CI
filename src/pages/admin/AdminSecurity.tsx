import { Lock, ScrollText } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { dateTimeFr } from '../../lib/format'
import { Badge, Notice, PageHeader, cx } from '../../components/ui'
import { DataTable, Panel, Td } from './adminKit'

type Status = 'demo' | 'partiel' | 'serveur'
const STATUS: Record<Status, { label: string; tone: 'green' | 'orange' | 'slate' }> = {
  demo: { label: 'Implémenté côté démo', tone: 'green' },
  partiel: { label: 'Partiel (démo)', tone: 'orange' },
  serveur: { label: 'À implémenter côté serveur', tone: 'slate' },
}

const MEASURES: { label: string; status: Status; detail: string }[] = [
  { label: 'Chiffrement', status: 'serveur', detail: 'TLS en transit et chiffrement au repos (base, stockage des documents). La démo stocke les données en clair dans le navigateur (localStorage).' },
  { label: 'Authentification forte', status: 'serveur', detail: 'OTP SMS / 2FA pour patients, agents et administrateurs. Absente de la démo.' },
  { label: 'Contrôle des rôles', status: 'partiel', detail: 'Espaces Patient / Agent / Admin séparés dans l\'interface ; les autorisations doivent être appliquées par l\'API.' },
  { label: 'Journalisation', status: 'demo', detail: 'Journal d\'audit des actions sensibles (dépôt d\'ordonnance, accès agent, facture) — voir ci-dessous.' },
  { label: 'Accès limité aux ordonnances', status: 'partiel', detail: 'L\'agent n\'accède à l\'ordonnance que pendant sa mission ; à faire respecter côté serveur.' },
  { label: 'Traçabilité des consultations', status: 'demo', detail: 'Chaque accès à une ordonnance est inscrit dans le journal (acteur, action, référence, horodatage).' },
  { label: 'Protection des documents', status: 'partiel', detail: 'Empreinte SHA-256 et verrouillage après paiement. URL signées et filigrane à prévoir côté serveur.' },
  { label: 'Sauvegardes', status: 'serveur', detail: 'Sauvegardes chiffrées, testées régulièrement, hébergement conforme.' },
  { label: 'Politique de conservation', status: 'serveur', detail: 'Durées de conservation définies par type de donnée, purge automatique.' },
  { label: 'Suppression contrôlée', status: 'partiel', detail: 'Une ordonnance verrouillée ne peut pas être supprimée ; suppression définitive et journalisée côté serveur.' },
  { label: 'Consentement', status: 'partiel', detail: 'Consentement par profil familial dans la démo ; recueil et preuve horodatée à implémenter.' },
  { label: 'Gestion des droits', status: 'serveur', detail: 'Droits d\'accès, de rectification, d\'effacement et de portabilité : formulaire et traitement à mettre en place.' },
]

const PERMS = ['Ordonnances (contenu)', 'Missions', 'Factures', 'Données agrégées', 'Annuaire pharmacies', 'Comptes & rôles', 'Journal d\'audit']
const ROLES: { role: string; v: string[] }[] = [
  { role: 'Patient', v: ['Les siennes', 'Les siennes', 'Les siennes', '—', 'Lecture', 'Son compte', '—'] },
  { role: 'Agent', v: ['Mission en cours', 'Affectées', 'Dépôt', '—', 'Lecture', 'Son compte', '—'] },
  { role: 'Pharmacie', v: ['Présentée au comptoir', '—', 'Émission', '—', 'Sa fiche', 'Son compte', '—'] },
  { role: 'Partenaire institutionnel', v: ['—', '—', '—', 'Lecture (anonymisé)', 'Lecture', '—', '—'] },
  { role: 'Admin', v: ['Sur motif, journalisé', 'Gestion', 'Contrôle', 'Lecture', 'Gestion', 'Gestion', 'Lecture'] },
]

const cellTone = (v: string) => (v === '—' ? 'text-slate-300' : /Gestion|Émission|Dépôt|Contrôle/.test(v) ? 'font-semibold text-brand-700' : 'text-slate-700')

export default function AdminSecurity() {
  const audit = useStore((s) => s.audit)
  const counts = MEASURES.reduce<Record<Status, number>>((acc, m) => ({ ...acc, [m.status]: acc[m.status] + 1 }), { demo: 0, partiel: 0, serveur: 0 })

  return (
    <div>
      <PageHeader title="Sécurité & protection des données" subtitle="État honnête des mesures — démo vs production" icon={<Lock />} />

      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        {(Object.keys(STATUS) as Status[]).map((s) => <Badge key={s} tone={STATUS[s].tone} className="px-3 py-1 text-sm">{counts[s]} · {STATUS[s].label}</Badge>)}
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {MEASURES.map((m) => (
          <div key={m.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{m.label}</p>
              <Badge tone={STATUS[m.status].tone}>{m.status === 'demo' ? '✓' : m.status === 'partiel' ? '◐' : '○'} {STATUS[m.status].label}</Badge>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">{m.detail}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-base font-bold">Matrice des rôles et permissions</h2>
      <DataTable head={['Rôle', ...PERMS]} className="mb-6">
        {ROLES.map((r) => (
          <tr key={r.role}>
            <Td className="font-semibold whitespace-nowrap">{r.role}</Td>
            {r.v.map((v, i) => <Td key={i} className={cx('text-xs', cellTone(v))}>{v}</Td>)}
          </tr>
        ))}
      </DataTable>

      <Panel title={<span className="flex items-center gap-2"><ScrollText size={16} />Journal d'audit ({audit.length})</span>} className="mb-6">
        {audit.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Aucune entrée. Les dépôts d'ordonnance, accès agents et factures y seront inscrits.</p>
        ) : (
          <DataTable head={['Horodatage', 'Acteur', 'Action', 'Référence']} className="max-h-[420px] overflow-y-auto border-0 shadow-none">
            {audit.map((a) => (
              <tr key={a.id}>
                <Td className="whitespace-nowrap text-slate-500">{dateTimeFr(a.at)}</Td>
                <Td className="font-semibold">{a.actor}</Td>
                <Td>{a.action}</Td>
                <Td className="font-mono text-xs">{a.ref}</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <Notice tone="orange">
        PHARMA CI traite des <strong>données de santé</strong>, particulièrement sensibles. Avant toute mise en production, travaillez avec un <strong>spécialiste de la conformité</strong>
        et effectuez les formalités auprès de l'<strong>Autorité de protection des données à caractère personnel</strong> (ARTCI — <a href="https://www.autoritedeprotection.ci" target="_blank" rel="noreferrer" className="underline">autoritedeprotection.ci</a>), conformément à la loi ivoirienne n° 2013-450 relative à la protection des données à caractère personnel.
      </Notice>
    </div>
  )
}
