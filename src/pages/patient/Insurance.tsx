import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CreditCard, Handshake, Pencil, ShieldPlus, Store } from 'lucide-react'
import type { Insurance as InsuranceT } from '../../types'
import { INSURANCES, insurerName } from '../../data/insurances'
import { useStore } from '../../store/useStore'
import { usePharmacies } from '../../lib/usePharmacies'
import { fcfa } from '../../lib/format'
import PharmacyCard from '../../components/PharmacyCard'
import { Badge, Button, ButtonLink, Card, Chips, EmptyState, Input, Notice, PageHeader, Section, Select } from '../../components/ui'
import FindInsurance from './FindInsurance'

type Tab = 'trouver' | 'mon'
const OTHER = '__autre__'

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
  const partners = useStore((s) => s.partners)
  const choices = [...INSURANCES.map((i) => ({ id: i.id, name: i.name })), ...partners.map((p) => ({ id: p.id, name: p.name }))]
  const [editing, setEditing] = useState(!insurance)
  const partner = (id?: string) => !!id && choices.some((i) => i.id === id)
  const [form, setForm] = useState({
    choice: partner(insurance?.insurerId) ? insurance!.insurerId : choices.length ? (insurance ? OTHER : choices[0]!.id) : OTHER,
    freeName: insurance && !partner(insurance.insurerId) ? insurance.insurerId : '',
    memberNumber: insurance?.memberNumber ?? '',
    holder: insurance?.holder ?? userName,
  })
  const pharmacies = usePharmacies()
  const ins = INSURANCES.find((i) => i.id === insurance?.insurerId)
  const accepting = ins ? pharmacies.filter((p) => p.insurances.includes(ins.id)) : []

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const insurerId = form.choice === OTHER ? form.freeName.trim() : form.choice
    if (!insurerId || !form.memberNumber.trim() || !form.holder.trim()) return
    setInsurance({ insurerId, memberNumber: form.memberNumber.trim(), holder: form.holder.trim() })
    setEditing(false)
  }

  return (
    <>
      {editing || !insurance ? (
        <Card className="mb-5">
          <form onSubmit={save} className="space-y-3">
            <p className="font-bold">Enregistrer mon assurance</p>
            {choices.length > 0 && (
              <Select label="Assureur" value={form.choice} onChange={(e) => setForm({ ...form, choice: e.target.value })}>
                {choices.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                <option value={OTHER}>Autre assureur…</option>
              </Select>
            )}
            {form.choice === OTHER && (
              <Input label="Nom de votre assureur" required value={form.freeName} onChange={(e) => setForm({ ...form, freeName: e.target.value })} placeholder="Tel qu'indiqué sur votre carte d'assuré" />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Numéro d'adhérent" required value={form.memberNumber} onChange={(e) => setForm({ ...form, memberNumber: e.target.value })} placeholder="Tel qu'indiqué sur votre carte" />
              <Input label="Titulaire" required value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit"><CheckCircle2 size={16} />Enregistrer</Button>
              {insurance && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>}
            </div>
            <p className="text-xs text-slate-500">Ces informations restent sur votre appareil. Elles ne sont pas transmises à l'assureur.</p>
          </form>
        </Card>
      ) : (
        <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-brand-900 to-brand-700 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Carte d'assuré</p>
              <p className="mt-1 text-xl font-extrabold">{partners.find((p) => p.id === insurance.insurerId)?.name ?? insurerName(insurance.insurerId)}</p>
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

      {ins ? (
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
              <EmptyState icon={<Store />} title="Aucune pharmacie référencée" text="Aucune pharmacie de l'annuaire n'a encore indiqué accepter cette assurance." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {accepting.slice(0, 6).map((p) => <PharmacyCard key={p.id} p={p} compact />)}
              </div>
            )}
            {accepting.length > 6 && <p className="mt-2 text-center text-sm text-slate-500">… et {accepting.length - 6} autres.</p>}
          </Section>
        </>
      ) : insurance && !partners.some((p) => p.id === insurance.insurerId) ? (
        <Notice tone="blue" icon={<Handshake size={16} />} className="mb-5">
          Aucun assureur partenaire n'est encore référencé dans PHARMA CI : vos garanties (taux, plafond) et la liste des pharmacies
          conventionnées ne peuvent pas être affichées. Renseignez-vous directement auprès de votre assureur.
        </Notice>
      ) : null}

      <Section title="Quels médicaments sont pris en charge ?">
        <Card className="text-sm leading-relaxed text-slate-600">
          <p>La prise en charge dépend de votre contrat (taux, plafond, exclusions) et, pour la part obligatoire, de la <b>liste CMU</b>. En pratique :</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>présentez votre carte d'assuré et votre ordonnance en pharmacie ;</li>
            <li>la pharmacie vérifie vos droits et applique le tiers payant si elle est conventionnée ;</li>
            <li>en cas de doute, contactez votre assureur avant l'achat.</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink to="/cmu" variant="soft">Vérifier la liste CMU</ButtonLink>
            <ButtonLink to="/medicaments" variant="outline">Rechercher un médicament</ButtonLink>
          </div>
        </Card>
      </Section>
    </>
  )
}

export default function Insurance() {
  const hasInsurance = useStore((s) => !!s.insurance)
  const [tab, setTab] = useState<Tab>(hasInsurance ? 'mon' : 'trouver')
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="PHARMA ASSUR" subtitle="Trouvez et gérez votre assurance santé" icon={<ShieldPlus size={22} />} />
      <div className="mb-4">
        <Chips value={tab} onChange={setTab} options={[{ value: 'trouver', label: '🔎 Trouver une assurance' }, { value: 'mon', label: '🪪 Mon assurance' }]} />
      </div>
      {tab === 'mon' ? <MyInsurance /> : <FindInsurance />}
      <p className="mt-4 text-center text-xs text-slate-400">
        <Link to="/cmu" className="underline">PHARMA CMU</Link>
      </p>
    </div>
  )
}
