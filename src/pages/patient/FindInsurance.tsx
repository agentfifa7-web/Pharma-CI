import { useMemo, useState } from 'react'
import { BadgeCheck, Globe, Handshake, Mail, MessageCircle, Phone, RefreshCw } from 'lucide-react'
import type { InsuranceProduct, InsurerPartner } from '../../types'
import { usePartners } from '../../lib/usePartners'
import { normalizeCiPhone } from '../../lib/phone'
import { fcfa } from '../../lib/format'
import { PERIOD_LABEL, monthlyCost } from '../../data/insurances'
import { Badge, Card, Chips, EmptyState, Notice, Select } from '../../components/ui'


const BUDGETS = [
  { value: '0', label: 'Tous les budgets' },
  { value: '5000', label: "Jusqu'à 5 000 FCFA / mois" },
  { value: '10000', label: "Jusqu'à 10 000 FCFA / mois" },
  { value: '25000', label: "Jusqu'à 25 000 FCFA / mois" },
  { value: '50000', label: "Jusqu'à 50 000 FCFA / mois" },
]

const intl = (phone?: string) => {
  const n = phone && normalizeCiPhone(phone)
  return n ? '225' + n.replace(/\s/g, '') : undefined
}

function Contact({ partner, product }: { partner: InsurerPartner; product: InsuranceProduct }) {
  const wa = intl(partner.whatsapp || partner.phone)
  const text = encodeURIComponent(`Bonjour ${partner.name}, je viens de PHARMA CI et je suis intéressé(e) par votre offre « ${product.name} ». Pouvez-vous me contacter ?`)
  const btn = 'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold'
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {partner.phone && <a href={`tel:${partner.phone.replace(/\s/g, '')}`} className={`${btn} bg-brand-500 text-white hover:bg-brand-600`}><Phone size={15} />Appeler</a>}
      {wa && <a href={`https://wa.me/${wa}?text=${text}`} target="_blank" rel="noreferrer" className={`${btn} bg-[#25D366] text-white hover:opacity-90`}><MessageCircle size={15} />WhatsApp</a>}
      {partner.email && <a href={`mailto:${partner.email}?subject=${encodeURIComponent('Offre ' + product.name)}&body=${text}`} className={`${btn} bg-slate-100 hover:bg-slate-200`}><Mail size={15} />E-mail</a>}
      {partner.website && <a href={partner.website} target="_blank" rel="noreferrer" className={`${btn} bg-slate-100 hover:bg-slate-200`}><Globe size={15} />Site</a>}
    </div>
  )
}

export default function FindInsurance() {
  const { partners, loading, error, refresh } = usePartners()
  const [target, setTarget] = useState('tous')
  const [budget, setBudget] = useState('0')

  const offers = useMemo(() => partners.flatMap((partner) => partner.products.map((product) => ({ partner, product }))), [partners])
  const targets = useMemo(() => [...new Set(offers.map((o) => o.product.target).filter(Boolean))].sort(), [offers])
  const shown = offers
    .filter((o) => target === 'tous' || o.product.target === target)
    .filter((o) => budget === '0' || monthlyCost(o.product) <= Number(budget))
    .sort((a, b) => monthlyCost(a.product) - monthlyCost(b.product))

  if (offers.length === 0) {
    return loading ? (
      <p className="py-10 text-center text-sm text-slate-400">Chargement des offres…</p>
    ) : (
      <EmptyState
        icon={<Handshake />}
        title="Bientôt nos assureurs partenaires"
        text={error && error !== 'Pas de connexion' ? error : 'Les offres de nos assureurs partenaires (produits, prix, garanties) seront affichées ici dès leur ajout.'}
        action={error === 'Pas de connexion' ? <button onClick={() => void refresh()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600"><RefreshCw size={14} />Réessayer</button> : undefined}
      />
    )
  }

  return (
    <>
      <Notice tone="blue" icon={<Handshake size={16} />} className="mb-4">
        Offres de nos assureurs partenaires, du moins cher au plus cher. Contactez directement l'assureur : les garanties exactes sont celles de son contrat.
      </Notice>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        {targets.length > 1 && (
          <div className="min-w-0 flex-1 overflow-x-auto">
            <Chips value={target} onChange={setTarget} options={[{ value: 'tous', label: 'Tous' }, ...targets.map((t) => ({ value: t, label: t }))]} />
          </div>
        )}
        <Select aria-label="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} className="sm:w-64">
          {BUDGETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </Select>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Handshake />} title="Aucune offre pour ces critères" text="Élargissez le budget ou choisissez « Tous »." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map(({ partner, product }) => (
            <Card key={partner.id + product.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{partner.name}</p>
                  <p className="text-lg font-bold leading-tight">{product.name}</p>
                  {product.target && <Badge tone="blue" className="mt-1">{product.target}</Badge>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-extrabold text-brand-700">{fcfa(product.price)}</p>
                  <p className="text-xs text-slate-500">par {PERIOD_LABEL[product.period]}</p>
                </div>
              </div>
              {(product.rate || product.ceiling) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {!!product.rate && <div className="rounded-xl bg-brand-50 p-2.5"><p className="text-xs text-slate-500">Prise en charge</p><p className="font-extrabold text-brand-700">{product.rate} %</p></div>}
                  {!!product.ceiling && <div className="rounded-xl bg-accent-50 p-2.5"><p className="text-xs text-slate-500">Plafond / an</p><p className="text-sm font-extrabold text-accent-600">{fcfa(product.ceiling)}</p></div>}
                </div>
              )}
              {product.services.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {product.services.map((s) => <li key={s} className="flex items-start gap-2 text-sm"><BadgeCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />{s}</li>)}
                </ul>
              )}
              {product.conditions && <p className="mt-2 text-xs text-slate-500">{product.conditions}</p>}
              <div className="flex-1" />
              <Contact partner={partner} product={product} />
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
