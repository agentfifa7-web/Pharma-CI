import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Headset, Info, Mail, MessageCircle, Phone, RefreshCw, Send } from 'lucide-react'
import type { SupportTicket, TicketCategory } from '../../types'
import { useStore } from '../../store/useStore'
import { fetchTicket, sendTicket } from '../../lib/sync'
import { CATEGORIES, TICKET_STATUS, categoryLabel, useSupportContact } from '../../lib/support'
import { CI_PHONE_HINT, normalizeCiPhone } from '../../lib/phone'
import { telHref, whatsappHref } from '../../lib/pharmacist'
import { randomCode } from '../../lib/crypto'
import { dateTimeFr } from '../../lib/format'
import { Badge, Button, Card, Chips, EmptyState, Input, Notice, PageHeader, Section, Select, Textarea } from '../../components/ui'

/**
 * « Contacter le support » : les clients et les agents joignent le service administratif de PHARMA CI
 * (WhatsApp, appel, e-mail) ou envoient un signalement que l'administratrice voit dans Admin → Support.
 */
export default function Support({ from }: { from: 'client' | 'agent' }) {
  const [params] = useSearchParams()
  const { shown: contact } = useSupportContact()
  const user = useStore((s) => s.user)
  const agent = useStore((s) => s.agents.find((a) => a.id === s.currentAgentId))
  const missions = useStore((s) => s.missions)
  const tickets = useStore((s) => s.supportTickets).filter((t) => t.from === from)
  const saveTicket = useStore((s) => s.saveSupportTicket)

  const myMissions = useMemo(
    () => (from === 'agent' ? missions.filter((m) => agent && m.agentId === agent.id) : missions).slice(0, 20),
    [missions, agent, from],
  )
  const [category, setCategory] = useState<TicketCategory>(params.get('mission') ? 'commande' : 'autre')
  const [missionId, setMissionId] = useState(params.get('mission') ?? '')
  const [message, setMessage] = useState('')
  const [name, setName] = useState(from === 'agent' ? agent?.name ?? '' : user.name === 'Moi' ? '' : user.name)
  const [phone, setPhone] = useState(from === 'agent' ? agent?.phone ?? '' : user.phone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState<string>()

  const whatsapp = contact.whatsapp || contact.phone
  const intro = from === 'agent' ? `Bonjour PHARMA CI, je suis l'agent ${agent?.name ?? ''}.` : 'Bonjour PHARMA CI,'
  const waText = [intro, missionId && `Commande ${missionId}.`, message || "J'ai un souci :"].filter(Boolean).join(' ')
  const hasContact = !!(contact.phone || contact.whatsapp || contact.email)

  const submit = async () => {
    setError('')
    if (message.trim().length < 5) return setError('Décrivez le problème en quelques mots.')
    const tel = normalizeCiPhone(phone)
    if (!tel) return setError(`Téléphone : ${CI_PHONE_HINT}`)
    const ticket: SupportTicket = {
      id: `SUP-${randomCode(6)}`,
      from,
      name: name.trim(),
      phone: tel,
      category,
      message: message.trim(),
      missionId: missionId || undefined,
      agentId: from === 'agent' ? agent?.id : undefined,
      status: 'nouveau',
      createdAt: new Date().toISOString(),
    }
    setBusy(true)
    const r = await sendTicket(ticket)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    saveTicket({ ...ticket, token: r.token })
    setSent(ticket.id)
    setMessage('')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Contacter le support"
        subtitle={from === 'agent' ? 'Un souci pendant une mission ? Le service administratif de PHARMA CI vous aide.' : 'Un souci avec une commande ou l’application ? Le service administratif de PHARMA CI vous aide.'}
        icon={<Headset size={22} />}
      />

      <Card className="mb-5">
        <p className="font-bold">Joindre le service PHARMA CI</p>
        {contact.hours && <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500"><Clock size={14} />{contact.hours}</p>}
        {contact.note && <p className="mt-1 text-sm text-slate-600">{contact.note}</p>}
        {hasContact ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {whatsapp && (
              <a href={whatsappHref(whatsapp, waText)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:bg-[#1ebe5a]">
                <MessageCircle size={16} />WhatsApp
              </a>
            )}
            {contact.phone && (
              <a href={telHref(contact.phone)} className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
                <Phone size={16} />Appeler
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Support PHARMA CI${missionId ? ` · ${missionId}` : ''}`)}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold hover:bg-slate-50">
                <Mail size={16} />E-mail
              </a>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Écrivez-nous avec le formulaire ci-dessous : le service vous rappelle au numéro indiqué.</p>
        )}
      </Card>

      <Section title="Signaler un problème">
        {sent ? (
          <Notice tone="green" icon={<CheckCircle2 size={16} />} className="mb-3">
            Signalement <b className="font-mono">{sent}</b> bien reçu. Le service PHARMA CI va le traiter et vous recontacter. Suivez la réponse dans « Mes signalements » ci-dessous.
            <button onClick={() => setSent(undefined)} className="mt-1 block font-semibold underline">Signaler un autre problème</button>
          </Notice>
        ) : (
          <Card>
            <p className="mb-2 text-sm font-semibold text-slate-700">De quoi s'agit-il ?</p>
            <Chips
              value={category}
              onChange={setCategory}
              options={CATEGORIES.filter((c) => c.for.includes(from)).map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))}
            />
            <div className="mt-4 grid gap-3">
              {myMissions.length > 0 && (
                <Select label="Commande concernée (facultatif)" value={missionId} onChange={(e) => setMissionId(e.target.value)}>
                  <option value="">Aucune</option>
                  {myMissions.map((m) => <option key={m.id} value={m.id}>{m.id} · {dateTimeFr(m.createdAt)}</option>)}
                </Select>
              )}
              <Textarea label="Expliquez le problème *" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. : l'agent n'est pas encore arrivé, le prix a changé, je n'arrive pas à valider la livraison…" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Votre nom" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Votre téléphone (pour vous rappeler) *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex. 07 08 09 10 11" />
              </div>
            </div>
            {error && <Notice tone="red" className="mt-3">{error}</Notice>}
            <Button className="mt-4 w-full" onClick={submit} disabled={busy}>
              <Send size={16} />{busy ? 'Envoi…' : 'Envoyer au service PHARMA CI'}
            </Button>
          </Card>
        )}
      </Section>

      <MyTickets tickets={tickets} />
    </div>
  )
}

function MyTickets({ tickets }: { tickets: SupportTicket[] }) {
  const saveTicket = useStore((s) => s.saveSupportTicket)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setBusy(true)
    await Promise.all(
      tickets.filter((t) => t.token && t.status !== 'resolu').map(async (t) => {
        const fresh = await fetchTicket(t.id, t.token!)
        if (fresh) saveTicket(fresh)
      }),
    )
    setBusy(false)
  }
  // Actualise à l'ouverture de la page pour afficher les réponses du service.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void refresh() }, [])

  return (
    <Section
      title={`Mes signalements (${tickets.length})`}
      action={tickets.length > 0 && <button onClick={refresh} disabled={busy} className="flex items-center gap-1 text-sm font-semibold text-brand-600"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />Actualiser</button>}
    >
      {tickets.length === 0 ? (
        <EmptyState icon={<Info size={24} />} title="Aucun signalement" text="Les problèmes que vous signalez apparaissent ici, avec la réponse du service PHARMA CI." />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold">{t.id}</span>
                <Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">{dateTimeFr(t.createdAt)} · {categoryLabel(t.category).label}{t.missionId && ` · ${t.missionId}`}</p>
              <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{t.message}</p>
              {t.reply && (
                <div className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
                  <p className="mb-1 text-xs font-bold uppercase text-brand-600">Réponse de PHARMA CI{t.repliedAt && ` · ${dateTimeFr(t.repliedAt)}`}</p>
                  <p className="whitespace-pre-line">{t.reply}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Section>
  )
}
