import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, CreditCard, Info, Pencil, ShieldPlus, Store } from 'lucide-react'
import type { Insurance as InsuranceT } from '../../types'
import { INSURANCES, insurerName } from '../../data/insurances'
import { useStore } from '../../store/useStore'
import { usePharmacies } from '../../lib/usePharmacies'
import { fcfa } from '../../lib/format'
import PharmacyCard from '../../components/PharmacyCard'
import { Badge, Button, ButtonLink, Card, Chips, EmptyState, Input, Modal, Notice, PageHeader, Section, Select, Textarea } from '../../components/ui'

type Tab = 'mon' | 'marketplace'

function Coverage({ ins }: { ins: InsuranceT }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-xl bg-brand-50 p-3"><p className="text-xs text-slate-500">Taux</p><p className="text-xl font-extrabold text-brand-700">{ins.rate} %</p></div>
      <div className="rounded-xl bg-accent-50 p-3"><p className="text-xs text-slate-500">Plafond / an</p><p className="text-sm font-extrabold text-accent-600">{fcfa(ins.ceiling)}</p></div>
      <div className="col-span-2 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Réseau</p><p className="text-sm font-bold">{ins.network}</p></div>
    </div>
  )
}

function MyInsurance() {
  const insurance = useStore((s) => s.insurance)
  const setInsurance = useStore((s) => s.setInsurance)
  const userName = useStore((s) => s.user.name)
  const [editing, setEditing] = useState(!insurance)
  const [form, setForm] = useState({ insurerId: insurance?.insurerId ?? INSURANCES[0]!.id, memberNumber: insurance?.memberNumber ?? '', holder: insurance?.holder ?? userName })
  const pharmacies = usePharmacies()
  const ins = INSURANCES.find((i) => i.id === insurance?.insurerId)
  const accepting = ins ? pharmacies.filter((p) => p.insurances.includes(ins.id)) : []

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.memberNumber.trim() || !form.holder.trim()) return
    setInsurance({ insurerId: form.insurerId, memberNumber: form.memberNumber.trim(), holder: form.holder.trim() })
    setEditing(false)
  }

  return (
    <>
      {editing || !insurance ? (
        <Card className="mb-5">
          <form onSubmit={save} className="space-y-3">
            <p className="font-bold">Enregistrer mon assurance</p>
            <Select label="Assureur" value={form.insurerId} onChange={(e) => setForm({ ...form, insurerId: e.target.value })}>
              {INSURANCES.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Numéro d'adhérent" required value={form.memberNumber} onChange={(e) => setForm({ ...form, memberNumber: e.target.value })} placeholder="Ex. ADH-123456" />
              <Input label="Titulaire" required value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit"><CheckCircle2 size={16} />Enregistrer</Button>
              {insurance && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>}
            </div>
            <p className="text-xs text-slate-500">Ces informations restent sur votre appareil (démo). Elles ne sont pas transmises à l'assureur.</p>
          </form>
        </Card>
      ) : (
        <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-brand-900 to-brand-700 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Carte d'assuré</p>
              <p className="mt-1 text-xl font-extrabold">{insurerName(insurance.insurerId)}</p>
            </div>
            <CreditCard className="text-white/60" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-white/60">Titulaire</p><p className="font-bold">{insurance.holder}</p></div>
            <div><p className="text-white/60">N° adhérent</p><p className="font-mono font-bold">{insurance.memberNumber}</p></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"><Pencil size={14} />Modifier</button>
            <button onClick={() => { setInsurance(undefined); setEditing(true) }} className="rounded-xl px-3 py-1.5 text-sm font-semibold text-white/70 hover:bg-white/10">Retirer</button>
          </div>
        </div>
      )}

      {ins && (
        <>
          <Section title="Ma couverture">
            <Card>
              <p className="mb-3 text-sm text-slate-600">{ins.coverage}</p>
              <Coverage ins={ins} />
              <div className="mt-3 flex flex-wrap gap-1.5">{ins.services.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</div>
            </Card>
          </Section>

          <Section title="Quelles pharmacies acceptent mon assurance ?" action={<Badge tone="green">{accepting.length} pharmacie{accepting.length > 1 ? 's' : ''}</Badge>}>
            {accepting.length === 0 ? (
              <EmptyState icon={<Store />} title="Aucune pharmacie référencée" text="Aucune pharmacie de la base de démonstration n'indique accepter cette assurance." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {accepting.slice(0, 6).map((p) => <PharmacyCard key={p.id} p={p} compact />)}
              </div>
            )}
            {accepting.length > 6 && <p className="mt-2 text-center text-sm text-slate-500">… et {accepting.length - 6} autres. Les plus proches sont affichées en premier.</p>}
          </Section>
        </>
      )}

      <Section title="Quels médicaments sont pris en charge ?">
        <Card className="text-sm leading-relaxed text-slate-600">
          <p>La prise en charge dépend de votre contrat (taux, plafond, exclusions) et, pour la part obligatoire, de la <b>liste CMU</b>. En pratique :</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>présentez votre carte d'assuré et votre ordonnance en pharmacie ;</li>
            <li>la pharmacie vérifie vos droits et applique le tiers payant si elle est conventionnée ;</li>
            <li>les médicaments sans ordonnance sont généralement moins bien couverts ;</li>
            <li>en cas de doute, contactez votre assureur avant l'achat.</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink to="/cmu" variant="soft">Vérifier le statut CMU</ButtonLink>
            <ButtonLink to="/medicaments" variant="outline">Rechercher un médicament</ButtonLink>
          </div>
        </Card>
      </Section>
    </>
  )
}

function Marketplace() {
  const [selected, setSelected] = useState<InsuranceT | null>(null)
  const [subscribe, setSubscribe] = useState<InsuranceT | null>(null)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', people: '1', message: '' })

  const close = () => { setSubscribe(null); setDone(false); setForm({ name: '', phone: '', people: '1', message: '' }) }

  return (
    <>
      <Notice tone="blue" icon={<Info size={16} />} className="mb-4">
        Le comparateur PHARMA ASSUR sera développé avec les assureurs partenaires et dans le respect de la réglementation des assurances.
        Les offres ci-dessous sont <b>fictives</b> et servent uniquement à la démonstration.
      </Notice>

      {/* Tableau (desktop) */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="p-3">Assureur</th><th className="p-3">Taux</th><th className="p-3">Plafond / an</th><th className="p-3">Réseau</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {INSURANCES.map((i) => (
              <tr key={i.id} className="border-t border-slate-100">
                <td className="p-3"><p className="font-bold">{i.name}</p><p className="text-xs text-slate-500">{i.coverage}</p></td>
                <td className="p-3 font-extrabold text-brand-700">{i.rate} %</td>
                <td className="p-3 font-semibold tabular-nums">{fcfa(i.ceiling)}</td>
                <td className="p-3 text-slate-600">{i.network}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelected(i)}>Garanties</Button>
                    <Button size="sm" variant="accent" onClick={() => setSubscribe(i)}>Souscrire</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cartes (mobile) */}
      <div className="space-y-3 md:hidden">
        {INSURANCES.map((i) => (
          <Card key={i.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-bold">{i.name}</p><p className="text-xs text-slate-500">{i.coverage}</p></div>
              <span className="shrink-0 rounded-xl bg-brand-50 px-2.5 py-1 text-lg font-extrabold text-brand-700">{i.rate} %</span>
            </div>
            <p className="mt-2 text-sm"><span className="text-slate-500">Plafond : </span><b>{fcfa(i.ceiling)}</b> / an</p>
            <p className="text-sm"><span className="text-slate-500">Réseau : </span>{i.network}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelected(i)}>Voir garanties</Button>
              <Button size="sm" variant="accent" onClick={() => setSubscribe(i)}>Souscrire</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Garanties — ${selected.name}` : ''}>
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{selected.coverage}</p>
            <Coverage ins={selected} />
            <div>
              <p className="mb-2 text-sm font-bold">Services couverts</p>
              <ul className="space-y-1.5">
                {selected.services.map((s) => <li key={s} className="flex items-center gap-2 text-sm"><BadgeCheck size={16} className="text-brand-600" />{s}</li>)}
              </ul>
            </div>
            <p className="text-xs text-slate-500">Offre fictive de démonstration. Les garanties réelles sont définies par le contrat de l'assureur.</p>
            <Button className="w-full" variant="accent" onClick={() => { setSubscribe(selected); setSelected(null) }}>Demander une souscription</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!subscribe} onClose={close} title={subscribe ? `Souscription — ${subscribe.name}` : ''}>
        {done ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-3xl">✅</div>
            <p className="font-bold">Demande enregistrée (simulation)</p>
            <p className="mt-1 text-sm text-slate-500">Dans la version finale, un conseiller de l'assureur vous recontactera. Aucune donnée n'a été transmise.</p>
            <Button className="mt-4" onClick={close}>Fermer</Button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setDone(true) }}>
            <Input label="Nom complet" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Téléphone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+225 …" />
            <Select label="Nombre de personnes à couvrir" value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })}>
              {['1', '2', '3', '4', '5', '6+'].map((n) => <option key={n}>{n}</option>)}
            </Select>
            <Textarea label="Message (facultatif)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <Button type="submit" variant="accent" className="w-full">Envoyer la demande</Button>
            <p className="text-xs text-slate-500">Simulation — PHARMA CI n'est pas un assureur ni un intermédiaire d'assurance agréé à ce stade.</p>
          </form>
        )}
      </Modal>
    </>
  )
}

export default function Insurance() {
  const [tab, setTab] = useState<Tab>('mon')
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA ASSUR" subtitle="Votre assurance santé et les pharmacies qui l'acceptent" icon={<ShieldPlus size={22} />} />
      <div className="mb-4">
        <Chips value={tab} onChange={setTab} options={[{ value: 'mon', label: '🪪 Mon assurance' }, { value: 'marketplace', label: '🛒 Marketplace' }]} />
      </div>
      {tab === 'mon' ? <MyInsurance /> : <Marketplace />}
      <p className="mt-4 text-center text-xs text-slate-400">
        Assureurs fictifs de démonstration — données à remplacer par celles des partenaires. <Link to="/cmu" className="underline">PHARMA CMU</Link>
      </p>
    </div>
  )
}
