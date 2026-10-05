import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, Copy, FileText, Fingerprint, Lock, LockOpen } from 'lucide-react'
import { PRESCRIPTION_LABEL, useStore } from '../../store/useStore'
import { PRESCRIPTION_TONE } from '../../data/statusUi'
import { dateTimeFr } from '../../lib/format'
import { Badge, Card, PageHeader, Stat, cx } from '../../components/ui'
import { DataTable, Td } from './adminKit'
import { Link } from 'react-router-dom'

export default function AdminPrescriptions() {
  const prescriptions = useStore((s) => s.prescriptions)
  const profiles = useStore((s) => s.profiles)
  const duplicateAttempts = useStore((s) => s.duplicateAttempts)
  const [open, setOpen] = useState<string | null>(null)

  const locked = useMemo(() => prescriptions.filter((p) => p.locked).length, [prescriptions])

  return (
    <div>
      <PageHeader title="Ordonnances" subtitle="Registre, empreintes numériques et verrouillage" icon={<FileText />} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ordonnances" value={prescriptions.length} icon={<FileText size={20} />} />
        <Stat label="Verrouillées" value={locked} hint="mission en cours ou exécutée" icon={<Lock size={20} />} tone="accent" />
        <Stat label="Doublons bloqués" value={duplicateAttempts} hint="tentatives de réutilisation" icon={<Copy size={20} />} tone={duplicateAttempts ? 'red' : 'slate'} />
        <Stat label="Avec mission" value={prescriptions.filter((p) => p.missionId).length} icon={<Fingerprint size={20} />} tone="slate" />
      </div>

      <Card className="mb-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 flex items-center gap-2 font-bold"><Fingerprint size={18} className="text-brand-600" />Anti-duplication</p>
          <p className="text-sm text-slate-600">
            Chaque ordonnance reçoit une <strong>empreinte numérique SHA-256</strong> calculée sur le(s) fichier(s) envoyé(s) (indépendante de l'ordre des pages).
            Un nouvel envoi d'un document identique est automatiquement <strong>bloqué</strong>, comptabilisé et signalé à l'anti-fraude.
          </p>
        </div>
        <div>
          <p className="mb-1 flex items-center gap-2 font-bold"><Lock size={18} className="text-accent-600" />Verrouillage</p>
          <p className="text-sm text-slate-600">
            Dès qu'une mission est payée, l'ordonnance est <strong>verrouillée 🔒</strong> : elle ne peut être ni modifiée, ni supprimée, ni réutilisée.
            Elle est déverrouillée uniquement en cas d'annulation, ou sur demande de renouvellement à vérifier.
          </p>
        </div>
      </Card>

      {prescriptions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 py-10 text-center text-sm text-slate-500">Aucune ordonnance enregistrée pour le moment.</p>
      ) : (
        <DataTable head={['', 'ID', 'Empreinte', 'Profil', 'Statut', '🔒', 'Mission', 'Lignes', 'Reçue']}>
          {prescriptions.map((p) => {
            const isOpen = open === p.id
            return (
              <Fragment key={p.id}>
                <tr className={cx('hover:bg-slate-50', isOpen && 'bg-slate-50')}>
                  <Td>
                    <button onClick={() => setOpen(isOpen ? null : p.id)} aria-label="Historique" className="rounded p-1 text-slate-400 hover:bg-slate-200">
                      <ChevronDown size={16} className={cx('transition', isOpen && 'rotate-180')} />
                    </button>
                  </Td>
                  <Td className="font-mono text-xs font-semibold whitespace-nowrap">{p.id}</Td>
                  <Td><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs" title={p.fingerprint}>{p.fingerprint.slice(0, 10)}…</code></Td>
                  <Td>{profiles.find((x) => x.id === p.profileId)?.name ?? p.profileId}</Td>
                  <Td><Badge tone={PRESCRIPTION_TONE[p.status]}>{PRESCRIPTION_LABEL[p.status]}</Badge></Td>
                  <Td>{p.locked ? <Lock size={16} className="text-accent-600" aria-label="Verrouillée" /> : <LockOpen size={16} className="text-slate-300" aria-label="Non verrouillée" />}</Td>
                  <Td>{p.missionId ? <Link to="/admin/missions" className="font-mono text-xs font-semibold text-brand-600">{p.missionId}</Link> : <span className="text-slate-400">—</span>}</Td>
                  <Td className="tabular-nums">{p.lines.length}</Td>
                  <Td className="whitespace-nowrap text-slate-500">{dateTimeFr(p.createdAt)}</Td>
                </tr>
                {isOpen && (
                  <tr className="bg-slate-50">
                    <Td colSpan={9}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Historique</p>
                      <ol className="space-y-1.5 border-l-2 border-slate-200 pl-4">
                        {p.history.map((h, i) => (
                          <li key={i} className="text-sm">
                            <span className={cx(/bloqu/i.test(h.event) && 'font-semibold text-red-600')}>{h.event}</span>
                            <span className="ml-2 text-xs text-slate-400">{dateTimeFr(h.at)}</span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-2 text-xs text-slate-400">Empreinte complète : <code className="break-all">{p.fingerprint}</code></p>
                    </Td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </DataTable>
      )}
      <p className="mt-3 text-xs text-slate-500">Les documents d'ordonnance ne sont pas affichés dans cette vue : l'accès au contenu médical est limité et journalisé (voir Sécurité).</p>
    </div>
  )
}
