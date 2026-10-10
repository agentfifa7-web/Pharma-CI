import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BadgeCheck, Check, CheckCircle2, ClipboardCopy, Info, MessageCircle, MessageSquare, Mic, NotebookPen, Phone, RotateCcw, Search, ShieldCheck, Siren, Trash2, UserRound,
} from 'lucide-react'
import { usePharmacies, type PharmacyView } from '../../lib/usePharmacies'
import { formatDistance } from '../../lib/geo'
import { dateTimeFr, normalize } from '../../lib/format'
import { MEDICATIONS, medById, medShortName } from '../../data/medications'
import { RELATION_LABEL } from '../../data/statusUi'
import { useStore } from '../../store/useStore'
import { usePharmacistStore, type PharmacistExchange } from '../../store/usePharmacistStore'
import {
  CHANNEL_LABEL, PARTNER, TOPICS, buildMessage, channelsFor, contactHref, parsePhone, topicInfo, type ContactChannel, type QuestionTopic,
} from '../../lib/pharmacist'
import { Badge, Card, Chips, EmptyState, Notice, OpenBadge, PageHeader, Section, Select, Textarea, cx } from '../../components/ui'

type Filter = 'ouvertes' | 'garde' | 'favoris' | 'toutes'
const PAGE = 8

type Target = { id: string; name: string; phone: string }
const opensWhatsapp = (c: ContactChannel) => c === 'whatsapp' || c === 'vocal'

function PartnerCard({ onContact, compact }: { onContact: (p: Target, c: ContactChannel) => void; compact?: boolean }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white shadow-lg shadow-brand-500/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-bold"><BadgeCheck size={18} />{PARTNER.name}</p>
          <p className="text-sm text-white/85">De garde pour répondre à vos questions · {PARTNER.phone}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">🟢 De garde</span>
      </div>
      {!compact && <p className="mt-2 text-sm text-white/85">Appelez-le, écrivez-lui ou envoyez-lui un message vocal sur WhatsApp. Votre question ci-dessus est ajoutée automatiquement au message écrit.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PARTNER.channels.map((c) => (
          <button key={c} onClick={() => onContact(PARTNER, c)} className={cx('flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold', c === 'whatsapp' ? 'bg-[#25D366] text-white hover:bg-[#1ebe5a]' : 'bg-white text-brand-700 hover:bg-brand-50')}>
            {CHANNEL_STYLE[c].icon}{c === 'whatsapp' ? 'Écrire' : CHANNEL_LABEL[c]}
          </button>
        ))}
      </div>
      {!compact && <p className="mt-2 text-xs text-white/75">Message vocal : WhatsApp s'ouvre sur la conversation, maintenez le micro 🎤 pour parler.</p>}
    </div>
  )
}

const CHANNEL_STYLE: Record<ContactChannel, { icon: React.ReactNode; className: string }> = {
  whatsapp: { icon: <MessageCircle size={16} />, className: 'bg-[#25D366] text-white hover:bg-[#1ebe5a]' },
  vocal: { icon: <Mic size={16} />, className: 'bg-white text-[#128C4B] ring-1 ring-[#25D366] hover:bg-emerald-50' },
  appel: { icon: <Phone size={16} />, className: 'bg-brand-500 text-white hover:bg-brand-600' },
  sms: { icon: <MessageSquare size={16} />, className: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50' },
}

const HELP = [
  'Comment prendre un médicament (moment, durée, oubli d\'une prise)',
  'Disponibilité et prix d\'un médicament dans la pharmacie',
  'Préparer votre ordonnance avant de passer la récupérer',
  'Équivalent (générique) d\'un médicament prescrit',
  'Petits maux du quotidien : rhume, maux de tête, petites plaies…',
  'Effet inhabituel après la prise d\'un médicament',
]

function forWhomLabel(p: { name: string; relation: keyof typeof RELATION_LABEL; birthYear?: number }) {
  const age = p.birthYear ? new Date().getFullYear() - p.birthYear : undefined
  const ageTxt = age !== undefined ? `, ${age} an${age > 1 ? 's' : ''}` : ''
  if (p.relation === 'moi') return age !== undefined ? `moi-même${ageTxt}` : 'moi-même'
  return `${RELATION_LABEL[p.relation].toLowerCase()} — ${p.name}${ageTxt}`
}

function ExchangeItem({ e }: { e: PharmacistExchange }) {
  const saveAnswer = usePharmacistStore((s) => s.saveAnswer)
  const toggleResolved = usePharmacistStore((s) => s.toggleResolved)
  const remove = usePharmacistStore((s) => s.removeExchange)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(e.answer ?? '')
  const channels = e.pharmacyId === PARTNER.id ? PARTNER.channels : channelsFor(e.phone)
  const again: ContactChannel = channels.includes(e.channel) ? e.channel : channels[0] ?? 'appel'
  return (
    <Card className={cx(e.resolved && 'opacity-75')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{e.pharmacyName}</p>
          <p className="text-xs text-slate-500">{dateTimeFr(e.at)} · {CHANNEL_LABEL[e.channel]}{e.forWhom ? ` · Pour ${e.forWhom}` : ''}</p>
        </div>
        {e.resolved ? <Badge tone="green"><CheckCircle2 size={12} />Réglé</Badge> : <Badge tone="orange">En cours</Badge>}
      </div>
      <p className="mt-2 text-sm"><span className="mr-1">{topicInfo(e.topic).emoji}</span><b>{topicInfo(e.topic).label}</b>{e.medication ? ` · ${e.medication}` : ''}</p>
      {e.question && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{e.question}</p>}

      {editing ? (
        <div className="mt-3">
          <Textarea label="Ce que le pharmacien a répondu" value={draft} onChange={(ev) => setDraft(ev.target.value)} placeholder="Ex. : 1 comprimé matin et soir pendant 5 jours, après le repas." />
          <div className="mt-2 flex gap-2">
            <button onClick={() => { saveAnswer(e.id, draft); setEditing(false) }} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">Enregistrer</button>
            <button onClick={() => { setDraft(e.answer ?? ''); setEditing(false) }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Annuler</button>
          </div>
        </div>
      ) : e.answer ? (
        <div className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700">Réponse du pharmacien</p>
          <p className="whitespace-pre-line">{e.answer}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
        {channels.length > 0 && (
          <a href={contactHref(again, e.phone, e.message)} target={opensWhatsapp(again) ? '_blank' : undefined} rel="noreferrer" className={cx('flex items-center gap-1.5 rounded-xl px-3 py-1.5', CHANNEL_STYLE[again].className)}>
            {CHANNEL_STYLE[again].icon}Recontacter
          </a>
        )}
        {!editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            <NotebookPen size={15} />{e.answer ? 'Modifier la réponse' : 'Noter la réponse'}
          </button>
        )}
        <button onClick={() => toggleResolved(e.id)} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
          {e.resolved ? <><RotateCcw size={15} />Rouvrir</> : <><Check size={15} />Marquer comme réglé</>}
        </button>
        <button onClick={() => remove(e.id)} aria-label="Supprimer cet échange" className="ml-auto rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
      </div>
    </Card>
  )
}

function PharmacyRow({ p, pinned, onContact }: { p: PharmacyView; pinned?: boolean; onContact: (p: Target, c: ContactChannel) => void }) {
  const channels = channelsFor(p.phone)
  const phone = parsePhone(p.phone)
  return (
    <Card className={cx(pinned && 'border-brand-300 ring-2 ring-brand-100')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {pinned && <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-brand-600">Pharmacie choisie</p>}
          <Link to={`/pharmacies/${p.id}`} className="font-bold hover:text-brand-700">{p.name}</Link>
          <p className="text-xs text-slate-500">{p.commune} · {formatDistance(p.km)}</p>
        </div>
        {p.onGarde && <Badge tone="red">🚨 De garde</Badge>}
      </div>
      <div className="mt-1.5"><OpenBadge state={p.open.state} label={p.open.label} /></div>
      {channels.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Numéro non publié : rendez-vous sur place ou choisissez une autre pharmacie.</p>
      ) : (
        <>
          <div className={cx('mt-3 grid gap-2', channels.length === 3 ? 'grid-cols-3' : 'grid-cols-1')}>
            {channels.map((c) => (
              <button key={c} onClick={() => onContact(p, c)} className={cx('flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold', CHANNEL_STYLE[c].className)}>
                {CHANNEL_STYLE[c].icon}{CHANNEL_LABEL[c]}
              </button>
            ))}
          </div>
          {!phone.mobile && (
            <p className="mt-2 text-xs text-slate-500">
              {phone.legacy ? 'Numéro à l\'ancien format (8 chiffres) : il peut ne plus fonctionner. ' : 'Ligne fixe : '}
              appel uniquement, WhatsApp n'est pas disponible pour ce numéro.
            </p>
          )}
        </>
      )}
    </Card>
  )
}

export default function Pharmacist() {
  const [params] = useSearchParams()
  const all = usePharmacies()
  const profiles = useStore((s) => s.profiles)
  const activeProfileId = useStore((s) => s.activeProfileId)
  const favorites = useStore((s) => s.favorites)
  const exchanges = usePharmacistStore((s) => s.exchanges)
  const addExchange = usePharmacistStore((s) => s.addExchange)
  const clearExchanges = usePharmacistStore((s) => s.clearExchanges)

  const initialMed = medById(params.get('medicament') ?? undefined)
  const pinnedId = params.get('pharmacie') ?? ''

  const [topic, setTopic] = useState<QuestionTopic>('conseil')
  const [profileId, setProfileId] = useState(activeProfileId)
  const [medication, setMedication] = useState(initialMed ? medShortName(initialMed) : '')
  const [medFocus, setMedFocus] = useState(false)
  const [question, setQuestion] = useState('')
  const [withPhoto, setWithPhoto] = useState(false)
  const [filter, setFilter] = useState<Filter>('ouvertes')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [copied, setCopied] = useState(false)
  const [sent, setSent] = useState<string>('')

  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0]
  const forWhom = profile ? forWhomLabel(profile) : undefined

  const preview = buildMessage({ topic, forWhom, medication, question, withPrescriptionPhoto: withPhoto })

  const medSuggestions = useMemo(() => {
    const n = normalize(medication)
    if (n.length < 2) return []
    const seen = new Set<string>()
    const out: string[] = []
    for (const m of MEDICATIONS) {
      const name = medShortName(m)
      if (!normalize(name).includes(n) || seen.has(name)) continue
      seen.add(name)
      out.push(name)
      if (out.length >= 6) break
    }
    return out.length === 1 && out[0] === medication ? [] : out
  }, [medication])

  const pinned = pinnedId ? all.find((p) => p.id === pinnedId) : undefined
  const list = useMemo(() => {
    const n = normalize(q)
    return all.filter((p) => {
      if (p.id === pinnedId) return false
      if (n && !normalize(`${p.name} ${p.commune} ${p.city}`).includes(n)) return false
      if (filter === 'ouvertes') return p.open.state === 'open'
      if (filter === 'garde') return p.onGarde
      if (filter === 'favoris') return favorites.includes(p.id)
      return true
    }).sort((a, b) => Number(channelsFor(b.phone).length > 0) - Number(channelsFor(a.phone).length > 0) || a.km - b.km)
  }, [all, q, filter, favorites, pinnedId])

  const contact = (p: Target, channel: ContactChannel) => {
    const message = buildMessage({ pharmacyName: p.name, topic, forWhom, medication, question, withPrescriptionPhoto: withPhoto })
    addExchange({
      pharmacyId: p.id, pharmacyName: p.name, phone: p.phone, channel, topic,
      forWhom, medication: medication.trim() || undefined, question: question.trim(), message,
    })
    setSent(p.name)
    const href = contactHref(channel, p.phone, message)
    if (opensWhatsapp(channel)) window.open(href, '_blank', 'noopener')
    else window.location.href = href
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(preview)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* presse-papiers indisponible */ }
  }

  const active = exchanges.filter((e) => !e.resolved).length

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Parler à un pharmacien" subtitle="Posez votre question à une pharmacie près de vous, par WhatsApp, appel ou SMS. C'est gratuit." icon={<MessageCircle />} />

      <Notice tone="red" icon={<Siren size={16} />} className="mb-5">
        <p><strong>Urgence ?</strong> Malaise, difficulté à respirer, saignement important, intoxication : n'écrivez pas, appelez le <a href="tel:185" className="font-bold underline">185 (SAMU)</a> ou le <a href="tel:180" className="font-bold underline">180 (pompiers)</a>. <Link to="/urgences" className="font-semibold underline">Page URGENCE</Link></p>
      </Notice>

      <div className="mb-5"><PartnerCard onContact={contact} compact /></div>

      {pinned && (
        <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
          Pharmacie choisie : <strong>{pinned.name}</strong>. Écrivez votre question, puis choisissez WhatsApp, appel ou SMS <a href="#etape-2" className="font-semibold underline">plus bas</a>.
        </p>
      )}

      {/* Étape 1 */}
      <Section title="1. Votre question">
        <Card className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700">De quoi s'agit-il ?</p>
            <Chips value={topic} onChange={setTopic} options={TOPICS.map((t) => ({ value: t.value, label: <>{t.emoji} {t.label}</> }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Pour qui ?" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.relation === 'moi' ? 'Moi' : `${p.name} (${RELATION_LABEL[p.relation]})`}</option>)}
            </Select>
            <div className="relative">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Médicament concerné (facultatif)</span>
                <input
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  onFocus={() => setMedFocus(true)}
                  onBlur={() => setTimeout(() => setMedFocus(false), 150)}
                  placeholder="Ex. : Doliprane 1000 mg"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              {medFocus && medSuggestions.length > 0 && (
                <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {medSuggestions.map((s) => (
                    <li key={s}><button type="button" onMouseDown={() => setMedication(s)} className="block w-full px-3.5 py-2 text-left text-sm hover:bg-brand-50">{s}</button></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <Textarea label="Votre question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={topicInfo(topic).placeholder} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={withPhoto} onChange={(e) => setWithPhoto(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            J'enverrai une photo (ordonnance, boîte du médicament) dans la conversation
          </label>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Message qui sera envoyé</p>
              <button onClick={copy} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                {copied ? <><Check size={14} />Copié</> : <><ClipboardCopy size={14} />Copier</>}
              </button>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-sm text-slate-700 ring-1 ring-slate-200">{preview}</pre>
            <p className="mt-1 text-xs text-slate-500">Le nom de la pharmacie est ajouté automatiquement. Vous pourrez encore modifier le message avant de l'envoyer.</p>
          </div>
        </Card>
      </Section>

      {/* Étape 2 */}
      <div id="etape-2" className="scroll-mt-24" />
      <Section title="2. Choisissez à qui parler">
        {sent && (
          <Notice tone="green" icon={<CheckCircle2 size={16} />} className="mb-3">
            Votre demande à <strong>{sent}</strong> a été ajoutée à <a href="#mes-echanges" className="font-semibold underline">Mes échanges</a>. Pensez à y noter la réponse du pharmacien.
          </Notice>
        )}
        <div className="mb-3"><PartnerCard onContact={contact} /></div>
        <p className="mb-2 text-sm font-semibold text-slate-600">Ou une pharmacie près de vous</p>
        {pinned && <div className="mb-3"><PharmacyRow p={pinned} pinned onContact={contact} /></div>}
        <div className="mb-3 space-y-2">
          <Chips<Filter>
            value={filter}
            onChange={(f) => { setFilter(f); setLimit(PAGE) }}
            options={[
              { value: 'ouvertes', label: '🟢 Ouvertes maintenant' },
              { value: 'garde', label: '🚨 De garde' },
              { value: 'favoris', label: '❤️ Mes favoris' },
              { value: 'toutes', label: 'Toutes' },
            ]}
          />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE) }} placeholder="Nom de la pharmacie ou commune" className="w-full bg-transparent text-sm outline-none" />
          </label>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={<Search />} title="Aucune pharmacie trouvée" text={filter === 'favoris' ? 'Ajoutez des pharmacies à vos favoris depuis leur fiche.' : 'Essayez un autre filtre ou une autre recherche.'} />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              {list.slice(0, limit).map((p) => <PharmacyRow key={p.id} p={p} onContact={contact} />)}
            </div>
            {list.length > limit && (
              <button onClick={() => setLimit((l) => l + PAGE)} className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                Afficher plus de pharmacies ({list.length - limit} autres)
              </button>
            )}
          </>
        )}
      </Section>

      {/* Historique */}
      <section id="mes-echanges" className="mb-8 scroll-mt-24">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold">
            Mes échanges
            {active > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{active} en cours</span>}
          </h2>
          {exchanges.length > 0 && (
            <button onClick={() => { if (window.confirm('Effacer tout l\'historique de vos échanges ?')) clearExchanges() }} className="text-xs font-semibold text-slate-500 hover:text-red-600">Tout effacer</button>
          )}
        </div>
        {exchanges.length === 0 ? (
          <EmptyState icon={<MessageCircle />} title="Aucun échange pour l'instant" text="Vos questions aux pharmaciens apparaîtront ici, avec la réponse que vous aurez notée." />
        ) : (
          <div className="space-y-3">{exchanges.map((e) => <ExchangeItem key={e.id} e={e} />)}</div>
        )}
      </section>

      {/* Informations */}
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <Card>
          <p className="mb-2 flex items-center gap-2 font-bold"><UserRound size={18} className="text-brand-600" />Le pharmacien peut vous aider pour</p>
          <ul className="space-y-1.5 text-sm text-slate-600">
            {HELP.map((h) => <li key={h} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-brand-500" />{h}</li>)}
          </ul>
        </Card>
        <Card>
          <p className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck size={18} className="text-brand-600" />Bon à savoir</p>
          <ul className="space-y-1.5 text-sm text-slate-600">
            <li>• Votre message part <b>directement de votre téléphone</b> vers la pharmacie : PHARMA CI ne le lit pas et ne le conserve pas.</li>
            <li>• Vos échanges sont enregistrés <b>uniquement sur ce téléphone</b>.</li>
            <li>• La pharmacie répond selon sa disponibilité. Sans réponse, appelez-la ou essayez une pharmacie de garde.</li>
            <li>• Le pharmacien ne remplace pas une consultation médicale et ne modifie pas un traitement prescrit.</li>
          </ul>
        </Card>
      </div>

      <Notice tone="blue" icon={<Info size={16} />}>
        Les numéros proviennent de l'annuaire public des pharmacies et peuvent avoir changé. Vous êtes pharmacien et souhaitez recevoir les questions sur votre numéro WhatsApp ? Revendiquez la fiche de votre pharmacie depuis <Link to="/pharmacies" className="font-semibold underline">l'annuaire</Link>.
      </Notice>
    </div>
  )
}
