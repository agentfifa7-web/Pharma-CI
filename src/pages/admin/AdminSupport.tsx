import { useCallback, useEffect, useState } from 'react'
import { Bike, Headset, MessageCircle, Phone, RefreshCw, Save, Trash2, User } from 'lucide-react'
import type { SupportContact, SupportTicket, TicketStatus } from '../../types'
import { useStore } from '../../store/useStore'
import { listTickets, saveSupportContact, updateTicket } from '../../lib/sync'
import { TICKET_STATUS, categoryLabel, useSupportContact } from '../../lib/support'
import { CI_PHONE_HINT, normalizeCiPhone } from '../../lib/phone'
import { telHref, whatsappHref } from '../../lib/pharmacist'
import { dateTimeFr } from '../../lib/format'
import { Badge, Button, Card, Chips, EmptyState, Input, Notice, PageHeader, Section, Textarea } from '../../components/ui'

type Filter = 'ouverts' | TicketStatus | 'tous'

/** Coordonnées du service affichées aux clients et aux agents dans « Contacter le support ». */
function ContactEditor() {
  const { contact, error: loadError } = useSupportContact()
  const adminCode = useStore((s) => s.adminCode)
  const setContact = useStore((s) => s.setSupportContact)
  const [d, setD] = useState<SupportContact>(contact)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'red' | 'green'; text: string }>()
  useEffect(() => setD(contact), [contact])

  const save = async () => {
    const phone = d.phone?.trim() ? normalizeCiPhone(d.phone) : ''
    if (phone === undefined) return setMsg({ tone: 'red', text: `Téléphone : ${CI_PHONE_HINT}` })
    const whatsapp = d.whatsapp?.trim() ? normalizeCiPhone(d.whatsapp) : ''
    if (whatsapp === undefined) return setMsg({ tone: 'red', text: `WhatsApp : ${CI_PHONE_HINT}` })
    const next: SupportContact = { phone, whatsapp, email: d.email?.trim(), hours: d.hours?.trim(), note: d.note?.trim() }
    setBusy(true)
    const r = await saveSupportContact(next, adminCode)
    setBusy(false)
    if (!r.ok) return setMsg({ tone: 'red', text: r.error })
    setContact(next)
    setMsg({ tone: 'green', text: 'Coordonnées enregistrées : les clients et les agents les voient aussitôt.' })
  }

  return (
    <Card className="mb-5">
      <p className="font-bold">Coordonnées du service PHARMA CI</p>
      <p className="mb-3 text-sm text-slate-500">Affichées aux clients et aux agents dans « Contacter le support » (boutons WhatsApp, Appeler, E-mail).</p>
      {!contact.phone && !contact.whatsapp && !contact.email && !loadError && (
        <Notice tone="orange" className="mb-3">Aucun contact enregistré ici : les clients et les agents voient le numéro par défaut +225 05 04 15 19 49. Enregistrez des coordonnées pour le remplacer.</Notice>
      )}
      {loadError && loadError !== 'Pas de connexion' && <Notice tone="red" className="mb-3">{loadError}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Téléphone (appels)" type="tel" value={d.phone ?? ''} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="Ex. 07 08 09 10 11" />
        <Input label="WhatsApp" type="tel" value={d.whatsapp ?? ''} onChange={(e) => setD({ ...d, whatsapp: e.target.value })} placeholder="Si différent du téléphone" />
        <Input label="E-mail" type="email" value={d.email ?? ''} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="Ex. support@pharma-ci.org" />
        <Input label="Horaires" value={d.hours ?? ''} onChange={(e) => setD({ ...d, hours: e.target.value })} placeholder="Ex. Tous les jours, 8 h – 20 h" />
        <Textarea label="Message affiché (facultatif)" rows={2} className="sm:col-span-2" value={d.note ?? ''} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Ex. En dehors des horaires, laissez un message : nous vous rappelons." />
      </div>
      {msg && <Notice tone={msg.tone} className="mt-3">{msg.text}</Notice>}
      <Button className="mt-3" disabled={busy} onClick={() => void save()}><Save size={15} />{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
    </Card>
  )
}

function TicketCard({ t, onChange }: { t: SupportTicket; onChange: (t: SupportTicket | null) => void }) {
  const adminCode = useStore((s) => s.adminCode)
  const [reply, setReply] = useState(t.reply ?? '')
  const [note, setNote] = useState(t.adminNote ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async (status: TicketStatus = t.status) => {
    setBusy(true)
    setError('')
    const r = await updateTicket(t.id, { status, reply, adminNote: note }, adminCode)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    onChange(r.ticket ?? { ...t, status, reply: reply || undefined, adminNote: note || undefined })
  }
  const remove = async () => {
    if (!confirm(`Supprimer le signalement ${t.id} ?`)) return
    const r = await updateTicket(t.id, {}, adminCode, true)
    if (!r.ok) return setError(r.error)
    onChange(null)
  }
  const waText = `Bonjour ${t.name || ''}, ici le service PHARMA CI au sujet de votre signalement ${t.id}.${reply ? ` ${reply}` : ''}`

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{t.id}</span>
          <Badge tone={t.from === 'agent' ? 'violet' : 'slate'}>{t.from === 'agent' ? <><Bike size={12} />Agent</> : <><User size={12} />Client</>}</Badge>
        </div>
        <Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {dateTimeFr(t.createdAt)} · {categoryLabel(t.category).emoji} {categoryLabel(t.category).label}{t.missionId && ` · commande ${t.missionId}`}
      </p>
      <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{t.message}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{t.name || 'Sans nom'}</span>
        <span className="text-slate-500">{t.phone}</span>
        <a href={telHref(t.phone)} className="flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700"><Phone size={12} />Appeler</a>
        <a href={whatsappHref(t.phone, waText)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><MessageCircle size={12} />WhatsApp</a>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Textarea label="Réponse (visible par l'auteur)" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} />
        <Textarea label="Note interne (invisible)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <Notice tone="red" className="mt-2">{error}</Notice>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void save()}>Enregistrer</Button>
        {t.status === 'nouveau' && <Button size="sm" variant="soft" disabled={busy} onClick={() => void save('en_cours')}>Prendre en charge</Button>}
        {t.status !== 'resolu' ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void save('resolu')}>Marquer résolu</Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void save('en_cours')}>Rouvrir</Button>
        )}
        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => void remove()}><Trash2 size={13} />Supprimer</Button>
      </div>
    </Card>
  )
}

/** Signalements des clients et des agents, et coordonnées du service administratif. */
export default function AdminSupport() {
  const adminCode = useStore((s) => s.adminCode)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ouverts')

  const refresh = useCallback(async () => {
    setLoading(true)
    const r = await listTickets(adminCode)
    setLoading(false)
    if ('tickets' in r) {
      setTickets(r.tickets)
      setError('')
    } else setError(r.error)
  }, [adminCode])
  useEffect(() => { void refresh() }, [refresh])

  const open = tickets.filter((t) => t.status !== 'resolu').length
  const shown = tickets.filter((t) => (filter === 'tous' ? true : filter === 'ouverts' ? t.status !== 'resolu' : t.status === filter))

  return (
    <div>
      <PageHeader title="Support" subtitle="Problèmes signalés par les clients et les agents" icon={<Headset size={22} />}
        action={<Button variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Actualiser</Button>} />
      <ContactEditor />
      <Section title={`Signalements (${open} à traiter)`}>
        <div className="mb-3">
          <Chips value={filter} onChange={setFilter} options={[
            { value: 'ouverts', label: `À traiter (${open})` },
            { value: 'nouveau', label: 'Nouveaux' },
            { value: 'en_cours', label: 'En cours' },
            { value: 'resolu', label: 'Résolus' },
            { value: 'tous', label: `Tous (${tickets.length})` },
          ]} />
        </div>
        {error && <Notice tone="red" className="mb-3">{error}</Notice>}
        {shown.length === 0 ? (
          <EmptyState icon={<Headset />} title={loading ? 'Chargement…' : 'Aucun signalement'} text="Les problèmes envoyés depuis « Contacter le support » apparaissent ici." />
        ) : (
          <div className="space-y-3">
            {shown.map((t) => (
              <TicketCard key={t.id} t={t} onChange={(n) => setTickets((list) => (n ? list.map((x) => (x.id === t.id ? n : x)) : list.filter((x) => x.id !== t.id)))} />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
