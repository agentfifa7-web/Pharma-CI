import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FileText, HelpCircle, Lock, Plus } from 'lucide-react'
import type { PrescriptionStatus } from '../../types'
import { PRESCRIPTION_LABEL, useStore } from '../../store/useStore'
import { Badge, ButtonLink, Card, Chips, EmptyState, PageHeader } from '../../components/ui'
import { dateTimeFr } from '../../lib/format'
import { PRESCRIPTION_HELP, PRESCRIPTION_TONE } from '../../data/statusUi'

type Group = 'all' | 'a_traiter' | 'en_cours' | 'terminees' | 'annulees'
const GROUPS: Record<Exclude<Group, 'all'>, PrescriptionStatus[]> = {
  a_traiter: ['nouvelle', 'en_attente', 'renouvellement'],
  en_cours: ['mission_lancee', 'en_cours', 'achat_effectue'],
  terminees: ['livree', 'partiellement_executee'],
  annulees: ['annulee'],
}

export default function Prescriptions() {
  const prescriptions = useStore((s) => s.prescriptions)
  const profiles = useStore((s) => s.profiles)
  const [group, setGroup] = useState<Group>('all')

  const list = useMemo(
    () => (group === 'all' ? prescriptions : prescriptions.filter((p) => GROUPS[group].includes(p.status))),
    [prescriptions, group],
  )
  const count = (g: Exclude<Group, 'all'>) => prescriptions.filter((p) => GROUPS[g].includes(p.status)).length

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Mes ordonnances"
        subtitle="Chaque ordonnance possède un identifiant unique et une empreinte numérique."
        icon={<FileText size={22} />}
        action={<ButtonLink to="/ordonnance" className="hidden sm:inline-flex"><Plus size={16} /> Nouvelle</ButtonLink>}
      />

      <ButtonLink to="/ordonnance" variant="accent" className="mb-4 w-full py-3.5 text-base sm:hidden"><Plus size={18} /> Envoyer une ordonnance</ButtonLink>

      <Chips
        value={group}
        onChange={setGroup}
        options={[
          { value: 'all', label: `Toutes (${prescriptions.length})` },
          { value: 'a_traiter', label: `À traiter (${count('a_traiter')})` },
          { value: 'en_cours', label: `En cours (${count('en_cours')})` },
          { value: 'terminees', label: `Terminées (${count('terminees')})` },
          { value: 'annulees', label: `Annulées (${count('annulees')})` },
        ]}
      />

      <div className="mt-4 space-y-3">
        {list.length === 0 ? (
          <EmptyState
            icon={<FileText size={26} />}
            title={prescriptions.length ? 'Aucune ordonnance dans cette catégorie' : 'Aucune ordonnance pour le moment'}
            text="Prenez une photo de votre ordonnance : un agent PHARMA CI achète vos médicaments et vous les livre."
            action={<ButtonLink to="/ordonnance"><Plus size={16} /> Envoyer une ordonnance</ButtonLink>}
          />
        ) : (
          list.map((p) => {
            const profile = profiles.find((x) => x.id === p.profileId)
            return (
              <Link key={p.id} to={`/ordonnances/${p.id}`} className="block">
                <Card className="flex items-center gap-3 transition hover:border-brand-200 hover:shadow-md">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {p.previews[0] ? (
                      <img src={p.previews[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-slate-400"><FileText size={22} /></div>
                    )}
                    {p.locked && <span className="absolute right-0.5 bottom-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-white"><Lock size={11} /></span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-sm font-bold">{p.id}</span>
                      <Badge tone={PRESCRIPTION_TONE[p.status]}>{p.locked && '🔒 '}{PRESCRIPTION_LABEL[p.status]}</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {profile?.name ?? 'Profil supprimé'} · {p.lines.length} ligne{p.lines.length > 1 ? 's' : ''}
                      {!p.confirmed && <span className="font-semibold text-amber-600"> · à confirmer</span>}
                    </p>
                    <p className="text-xs text-slate-400">{dateTimeFr(p.createdAt)}</p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-300" />
                </Card>
              </Link>
            )
          })
        )}
      </div>

      <details className="group mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-bold">
          <HelpCircle size={18} className="text-brand-600" /> Comprendre les statuts
          <ChevronRight size={16} className="ml-auto text-slate-400 transition group-open:rotate-90" />
        </summary>
        <ul className="mt-3 space-y-2.5">
          {(Object.keys(PRESCRIPTION_LABEL) as PrescriptionStatus[]).map((s) => (
            <li key={s} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
              <Badge tone={PRESCRIPTION_TONE[s]} className="w-fit shrink-0 sm:w-40 sm:justify-center">{PRESCRIPTION_LABEL[s]}</Badge>
              <span className="text-sm text-slate-600">{PRESCRIPTION_HELP[s]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Lock size={12} /> Une ordonnance verrouillée ne peut pas être réutilisée tant que la mission est en cours ou après livraison.</p>
      </details>
    </div>
  )
}
