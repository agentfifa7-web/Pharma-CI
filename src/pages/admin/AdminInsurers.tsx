import { useState } from 'react'
import { Handshake, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { InsuranceProduct, InsurerPartner } from '../../types'
import { useStore } from '../../store/useStore'
import { usePartners } from '../../lib/usePartners'
import { savePartner } from '../../lib/sync'
import { uid } from '../../lib/crypto'
import { CI_PHONE_HINT, normalizeCiPhone } from '../../lib/phone'
import { fcfa } from '../../lib/format'
import { Badge, Button, Card, EmptyState, Input, Notice, PageHeader, Select, Textarea } from '../../components/ui'
import { PERIOD_LABEL } from '../../data/insurances'

type ProductDraft = { id: string; name: string; target: string; price: string; period: InsuranceProduct['period']; rate: string; ceiling: string; services: string; conditions: string }
type Draft = { id: string; name: string; description: string; phone: string; whatsapp: string; email: string; website: string; products: ProductDraft[] }

const TARGETS = ['Individuel', 'Famille', 'Enfant', 'Étudiant', 'Senior', 'Entreprise']
const emptyProduct = (): ProductDraft => ({ id: uid('p-'), name: '', target: 'Individuel', price: '', period: 'mois', rate: '', ceiling: '', services: '', conditions: '' })
const num = (v: string) => Number(v.replace(/[\s.]/g, '').replace(',', '.'))

const toDraft = (p?: InsurerPartner): Draft => p
  ? {
      id: p.id, name: p.name, description: p.description ?? '', phone: p.phone ?? '', whatsapp: p.whatsapp ?? '', email: p.email ?? '', website: p.website ?? '',
      products: p.products.map((x) => ({ id: x.id, name: x.name, target: x.target, price: String(x.price), period: x.period, rate: x.rate ? String(x.rate) : '', ceiling: x.ceiling ? String(x.ceiling) : '', services: x.services.join('\n'), conditions: x.conditions ?? '' })),
    }
  : { id: uid('ins-'), name: '', description: '', phone: '', whatsapp: '', email: '', website: '', products: [emptyProduct()] }

/** Vérifie la fiche ; renvoie l'assureur prêt à enregistrer ou le premier problème à corriger. */
function fromDraft(d: Draft): InsurerPartner | string {
  if (!d.name.trim()) return "Indiquez le nom de l'assureur."
  const phone = d.phone.trim() ? normalizeCiPhone(d.phone) : ''
  if (phone === undefined) return `Téléphone : ${CI_PHONE_HINT}`
  const whatsapp = d.whatsapp.trim() ? normalizeCiPhone(d.whatsapp) : ''
  if (whatsapp === undefined) return `WhatsApp : ${CI_PHONE_HINT}`
  if (!phone && !whatsapp && !d.email.trim()) return 'Indiquez au moins un contact (téléphone, WhatsApp ou e-mail) pour que les patients puissent joindre l’assureur.'
  const website = d.website.trim() && !/^https?:\/\//.test(d.website.trim()) ? 'https://' + d.website.trim() : d.website.trim()
  const products: InsuranceProduct[] = []
  for (const [i, x] of d.products.entries()) {
    if (!x.name.trim()) return `Produit ${i + 1} : indiquez son nom.`
    const price = num(x.price)
    if (!x.price.trim() || !Number.isFinite(price) || price <= 0) return `Produit « ${x.name} » : indiquez son coût en FCFA.`
    const rate = x.rate.trim() ? num(x.rate) : undefined
    if (rate !== undefined && (!Number.isFinite(rate) || rate < 0 || rate > 100)) return `Produit « ${x.name} » : le taux doit être entre 0 et 100 %.`
    const ceiling = x.ceiling.trim() ? num(x.ceiling) : undefined
    if (ceiling !== undefined && (!Number.isFinite(ceiling) || ceiling < 0)) return `Produit « ${x.name} » : plafond invalide.`
    products.push({
      id: x.id, name: x.name.trim(), target: x.target, price: Math.round(price), period: x.period, rate, ceiling: ceiling && Math.round(ceiling),
      services: x.services.split('\n').map((s) => s.trim()).filter(Boolean), conditions: x.conditions.trim() || undefined,
    })
  }
  if (!products.length) return 'Ajoutez au moins un produit.'
  return {
    id: d.id, name: d.name.trim(), description: d.description.trim() || undefined, phone: phone || undefined, whatsapp: whatsapp || undefined,
    email: d.email.trim() || undefined, website: website || undefined, products,
  }
}

function Editor({ initial, onDone }: { initial?: InsurerPartner; onDone: () => void }) {
  const adminCode = useStore((s) => s.adminCode)
  const setPartners = useStore((s) => s.setPartners)
  const [d, setD] = useState<Draft>(() => toDraft(initial))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const setProduct = (i: number, patch: Partial<ProductDraft>) => setD({ ...d, products: d.products.map((p, j) => (j === i ? { ...p, ...patch } : p)) })

  const save = async () => {
    const partner = fromDraft(d)
    if (typeof partner === 'string') return setError(partner)
    setBusy(true)
    setError('')
    const r = await savePartner(partner, adminCode)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    const list = useStore.getState().partners
    setPartners(list.some((p) => p.id === partner.id) ? list.map((p) => (p.id === partner.id ? partner : p)) : [...list, partner])
    onDone()
  }

  return (
    <Card className="mb-5 border-brand-300">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-lg font-bold">{initial ? `Modifier ${initial.name}` : 'Nouvel assureur partenaire'}</p>
        <button onClick={onDone} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Fermer"><X size={18} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nom de l'assureur *" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Ex. Assurance Santé CI" />
        <Input label="Site internet" value={d.website} onChange={(e) => setD({ ...d, website: e.target.value })} placeholder="www.exemple.ci" />
        <Input label="Téléphone" type="tel" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="Ex. 27 20 00 00 00" />
        <Input label="WhatsApp" type="tel" value={d.whatsapp} onChange={(e) => setD({ ...d, whatsapp: e.target.value })} placeholder="Ex. 07 08 09 10 11" />
        <Input label="E-mail" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
        <Textarea label="Présentation (facultatif)" rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
      </div>

      <p className="mt-5 mb-2 font-bold">Produits</p>
      <div className="space-y-3">
        {d.products.map((x, i) => (
          <div key={x.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600">Produit {i + 1}</p>
              {d.products.length > 1 && <button onClick={() => setD({ ...d, products: d.products.filter((_, j) => j !== i) })} className="flex items-center gap-1 text-xs font-semibold text-red-600"><Trash2 size={13} />Retirer</button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Nom du produit *" value={x.name} onChange={(e) => setProduct(i, { name: e.target.value })} placeholder="Ex. Santé Famille Plus" />
              <Select label="Pour qui ?" value={x.target} onChange={(e) => setProduct(i, { target: e.target.value })}>
                {TARGETS.map((t) => <option key={t}>{t}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Coût (FCFA) *" inputMode="numeric" value={x.price} onChange={(e) => setProduct(i, { price: e.target.value })} placeholder="Ex. 5000" />
                <Select label="Par" value={x.period} onChange={(e) => setProduct(i, { period: e.target.value as ProductDraft['period'] })}>
                  {Object.entries(PERIOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Prise en charge (%)" inputMode="numeric" value={x.rate} onChange={(e) => setProduct(i, { rate: e.target.value })} placeholder="Ex. 80" />
                <Input label="Plafond / an (FCFA)" inputMode="numeric" value={x.ceiling} onChange={(e) => setProduct(i, { ceiling: e.target.value })} placeholder="Ex. 1000000" />
              </div>
              <Textarea label="Services couverts (un par ligne)" rows={3} value={x.services} onChange={(e) => setProduct(i, { services: e.target.value })} placeholder={'Pharmacie\nConsultations\nHospitalisation'} />
              <Textarea label="Conditions (facultatif)" rows={3} value={x.conditions} onChange={(e) => setProduct(i, { conditions: e.target.value })} placeholder="Ex. délai de carence 3 mois, jusqu'à 60 ans" />
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setD({ ...d, products: [...d.products, emptyProduct()] })}><Plus size={14} />Ajouter un produit</Button>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void save()}>{busy ? 'Enregistrement…' : 'Enregistrer et publier'}</Button>
        <Button variant="ghost" onClick={onDone}>Annuler</Button>
      </div>
    </Card>
  )
}

/** Assureurs partenaires affichés aux patients dans « Assurances → Trouver une assurance ». */
export default function AdminInsurers() {
  const { partners, error } = usePartners()
  const adminCode = useStore((s) => s.adminCode)
  const setPartners = useStore((s) => s.setPartners)
  const [editing, setEditing] = useState<InsurerPartner | 'new' | null>(null)
  const [removeError, setRemoveError] = useState('')

  const remove = async (p: InsurerPartner) => {
    if (!confirm(`Retirer ${p.name} et ses ${p.products.length} produit(s) du site ?`)) return
    const r = await savePartner(p, adminCode, true)
    if (!r.ok) return setRemoveError(r.error)
    setRemoveError('')
    setPartners(useStore.getState().partners.filter((x) => x.id !== p.id))
  }

  return (
    <div>
      <PageHeader title="Assureurs partenaires" subtitle="Produits, coûts et services affichés dans « Trouver une assurance »" icon={<Handshake size={22} />}
        action={!editing && <Button onClick={() => setEditing('new')}><Plus size={16} />Ajouter un assureur</Button>} />
      {error && error !== 'Pas de connexion' && <Notice tone="red" className="mb-4">{error}</Notice>}
      {removeError && <Notice tone="red" className="mb-4">{removeError}</Notice>}
      {editing && <Editor key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />}

      {partners.length === 0 ? (
        !editing && <EmptyState icon={<Handshake />} title="Aucun assureur partenaire" text="Ajoutez vos assureurs partenaires et leurs produits : ils apparaîtront aussitôt pour les patients." />
      ) : (
        <div className="space-y-3">
          {partners.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-lg font-bold">{p.name}</p>
                  <p className="text-sm text-slate-500">{[p.phone, p.whatsapp && `WhatsApp ${p.whatsapp}`, p.email].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}><Pencil size={13} />Modifier</Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void remove(p)}><Trash2 size={13} />Retirer</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.products.map((x) => <Badge key={x.id} tone="blue">{x.name} · {fcfa(x.price)} / {PERIOD_LABEL[x.period]}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
