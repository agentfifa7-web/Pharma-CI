import { useEffect, useMemo, useState } from 'react'
import { Bell, BellRing, CalendarClock, Check, Info, Pill, Plus, Trash2, X } from 'lucide-react'
import type { Treatment } from '../../types'
import { useActiveProfile, useStore } from '../../store/useStore'
import { Badge, Button, ButtonLink, Card, EmptyState, Input, Notice, PageHeader, Section, cx } from '../../components/ui'
import { medNameOptions } from '../../data/assistant'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}
const dayDiff = (from: string, to: string) => Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / 86400000)

function treatmentInfo(t: Treatment, today: string) {
  const elapsed = dayDiff(t.startDate, today) // 0 = premier jour
  const started = elapsed >= 0
  const active = started && elapsed < t.durationDays
  const remaining = Math.max(0, t.durationDays - Math.max(0, elapsed))
  const total = t.times.length * t.durationDays
  const taken = t.takenLog.length
  return { started, active, ended: elapsed >= t.durationDays, remaining, total, taken, pct: total ? Math.min(100, Math.round((taken / total) * 100)) : 0 }
}

type NotifPerm = NotificationPermission | 'unsupported'

export default function Treatments() {
  const treatments = useStore((s) => s.treatments)
  const profiles = useStore((s) => s.profiles)
  const addTreatment = useStore((s) => s.addTreatment)
  const removeTreatment = useStore((s) => s.removeTreatment)
  const markTaken = useStore((s) => s.markTaken)
  const profile = useActiveProfile()

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])
  const today = ymd(now)
  const nowHm = `${pad(now.getHours())}:${pad(now.getMinutes())}`

  // Formulaire
  const [showForm, setShowForm] = useState(false)
  const [medication, setMedication] = useState('')
  const [dose, setDose] = useState('')
  const [times, setTimes] = useState<string[]>(['08:00', '20:00'])
  const [startDate, setStartDate] = useState(today)
  const [duration, setDuration] = useState(7)

  const submit = () => {
    if (!medication.trim() || !dose.trim() || !times.length) return
    addTreatment({
      profileId: profile.id, medication: medication.trim(), dose: dose.trim(),
      times: [...new Set(times.filter(Boolean))].sort(), startDate, durationDays: Math.max(1, duration),
    })
    setMedication('')
    setDose('')
    setTimes(['08:00', '20:00'])
    setDuration(7)
    setShowForm(false)
  }

  // Notifications
  const [perm, setPerm] = useState<NotifPerm>(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission))
  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return setPerm('unsupported')
    setPerm(await Notification.requestPermission())
  }

  const list = useMemo(() => treatments.map((t) => ({ t, info: treatmentInfo(t, today) })), [treatments, today])
  const todays = useMemo(
    () => list.filter((x) => x.info.active).flatMap(({ t }) => t.times.map((time) => ({ t, time, slot: `${today}T${time}` }))).sort((a, b) => a.time.localeCompare(b.time)),
    [list, today],
  )
  const doneToday = todays.filter((x) => x.t.takenLog.includes(x.slot)).length
  const ending = list.filter((x) => x.info.started && x.info.remaining <= 2)

  // Rappels en page (tant que la page est ouverte)
  const upcomingKey = todays.filter((x) => x.time > nowHm && !x.t.takenLog.includes(x.slot)).map((x) => `${x.t.id}|${x.time}|${x.t.medication}|${x.t.dose}`).join(';')
  useEffect(() => {
    if (perm !== 'granted' || !upcomingKey) return
    const timers = upcomingKey.split(';').map((k) => {
      const [, time, med, d] = k.split('|')
      const [h, mi] = (time ?? '00:00').split(':').map(Number)
      const at = new Date()
      at.setHours(h ?? 0, mi ?? 0, 0, 0)
      return setTimeout(() => {
        try {
          new Notification('PHARMA CI — rappel de traitement 💊', { body: `${med} : ${d} (${time})` })
        } catch { /* navigateur sans notifications en page */ }
      }, Math.max(0, at.getTime() - Date.now()))
    })
    return () => timers.forEach(clearTimeout)
  }, [perm, upcomingKey])

  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name ?? '—'

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Mes médicaments"
        subtitle="Rappels de prise selon la posologie de votre ordonnance."
        icon={<Pill size={22} />}
        action={<Button size="sm" onClick={() => setShowForm((v) => !v)}>{showForm ? <X size={16} /> : <Plus size={16} />}<span className="hidden sm:inline">{showForm ? 'Fermer' : 'Ajouter'}</span></Button>}
      />

      <Notice tone="blue" icon={<Info size={16} />} className="mb-4">
        <b>L'application ne modifie jamais la posologie prescrite.</b> Saisissez la dose exactement comme indiquée sur l'ordonnance. En cas de doute, demandez à votre pharmacien ou médecin.
      </Notice>

      {/* Fin de traitement */}
      {ending.map(({ t, info }) => (
        <Card key={`end-${t.id}`} className="mb-3 border-amber-200 bg-amber-50">
          <p className="flex items-center gap-2 font-bold text-amber-900"><CalendarClock size={18} /> Votre traitement enregistré arrive à son terme.</p>
          <p className="mt-1 text-sm text-amber-900/80">
            {t.medication} — {info.ended ? 'durée enregistrée terminée' : `${info.remaining} jour${info.remaining > 1 ? 's' : ''} restant${info.remaining > 1 ? 's' : ''}`}.
          </p>
          <ButtonLink to="/ordonnances" variant="outline" className="mt-3">Vérifier votre ordonnance</ButtonLink>
        </Card>
      ))}

      {showForm && (
        <Card className="mb-5 border-brand-200">
          <h2 className="font-bold">Nouveau rappel de traitement</h2>
          <p className="mb-3 text-sm text-slate-500">Pour : <b>{profile.name}</b></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Médicament" list="med-list" value={medication} onChange={(e) => setMedication(e.target.value)} placeholder="Ex. Amoxicilline 500 mg" />
            <datalist id="med-list">{medNameOptions().map((n) => <option key={n} value={n} />)}</datalist>
            <Input label="Dose prescrite (telle qu'écrite)" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Ex. 1 gélule" />
          </div>
          <p className="mt-3 mb-1 text-sm font-semibold text-slate-700">Heures de prise</p>
          <div className="flex flex-wrap gap-2">
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white pl-2">
                <input type="time" value={t} onChange={(e) => setTimes((ts) => ts.map((x, j) => (j === i ? e.target.value : x)))} className="bg-transparent py-2 text-sm outline-none" />
                <button onClick={() => setTimes((ts) => ts.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-600" aria-label="Retirer l'heure"><X size={14} /></button>
              </div>
            ))}
            <Button size="sm" variant="soft" onClick={() => setTimes((ts) => [...ts, '12:00'])}><Plus size={14} /> Heure</Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="Date de début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="Durée (jours)" type="number" min={1} inputMode="numeric" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <Button className="mt-4 w-full" onClick={submit} disabled={!medication.trim() || !dose.trim() || !times.length}><Check size={16} /> Enregistrer le rappel</Button>
        </Card>
      )}

      {/* Notifications */}
      <Card className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl', perm === 'granted' ? 'bg-brand-50 text-brand-600' : 'bg-accent-50 text-accent-600')}>
          {perm === 'granted' ? <BellRing size={20} /> : <Bell size={20} />}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-bold">{perm === 'granted' ? 'Notifications activées' : 'Rappels par notification'}</p>
          <p className="text-slate-500">
            {perm === 'unsupported'
              ? 'Votre navigateur ne prend pas en charge les notifications.'
              : perm === 'denied'
                ? 'Notifications bloquées : autorisez-les dans les réglages du navigateur.'
                : 'Les rappels du jour s\'affichent tant que cette page est ouverte. Les notifications push en arrière-plan nécessitent l\'application mobile.'}
          </p>
        </div>
        {perm === 'default' && <Button variant="accent" onClick={enableNotifications}><Bell size={16} /> Activer les notifications</Button>}
      </Card>

      {/* Aujourd'hui */}
      <Section title="Aujourd'hui" action={todays.length > 0 && <Badge tone={doneToday === todays.length ? 'green' : 'orange'}>{doneToday}/{todays.length} prises</Badge>}>
        {todays.length === 0 ? (
          <EmptyState icon={<Pill size={26} />} title="Aucune prise prévue aujourd'hui" text="Ajoutez un traitement pour recevoir des rappels selon votre ordonnance." action={!showForm && <Button onClick={() => setShowForm(true)}><Plus size={16} /> Ajouter un traitement</Button>} />
        ) : (
          <Card className="p-2">
            <div className="mx-2 mt-2 mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round((doneToday / todays.length) * 100)}%` }} />
            </div>
            <ul>
              {todays.map(({ t, time, slot }) => {
                const taken = t.takenLog.includes(slot)
                const late = !taken && time < nowHm
                return (
                  <li key={`${t.id}-${time}`}>
                    <label className={cx('flex cursor-pointer items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50', taken && 'opacity-60')}>
                      <input type="checkbox" checked={taken} onChange={() => markTaken(t.id, slot)} className="h-6 w-6 shrink-0 accent-brand-500" />
                      <span className={cx('w-14 shrink-0 font-mono text-base font-bold', late ? 'text-amber-600' : 'text-ink')}>{time}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block truncate font-semibold', taken && 'line-through')}>{t.medication}</span>
                        <span className="block truncate text-xs text-slate-500">{t.dose} · {profileName(t.profileId)}</span>
                      </span>
                      {taken ? <Badge tone="green">Pris</Badge> : late ? <Badge tone="orange">En retard</Badge> : null}
                    </label>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </Section>

      {/* Tous les traitements */}
      {list.length > 0 && (
        <Section title="Mes traitements">
          <div className="space-y-3">
            {list.map(({ t, info }) => (
              <Card key={t.id}>
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Pill size={18} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{t.medication}</p>
                    <p className="text-sm text-slate-600">{t.dose} · {t.times.join(', ')}</p>
                    <p className="text-xs text-slate-400">{profileName(t.profileId)} · du {parseYmd(t.startDate).toLocaleDateString('fr-FR')} · {t.durationDays} jours</p>
                  </div>
                  <button onClick={() => window.confirm('Supprimer ce rappel ?') && removeTreatment(t.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer"><Trash2 size={16} /></button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${info.pct}%` }} /></div>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">{info.taken}/{info.total} prises</span>
                </div>
                <p className="mt-1.5 text-xs font-semibold">
                  {!info.started ? <span className="text-sky-600">Commence le {parseYmd(t.startDate).toLocaleDateString('fr-FR')}</span>
                    : info.ended ? <span className="text-slate-500">Durée enregistrée terminée</span>
                      : <span className="text-brand-700">{info.remaining} jour{info.remaining > 1 ? 's' : ''} restant{info.remaining > 1 ? 's' : ''}</span>}
                </p>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
