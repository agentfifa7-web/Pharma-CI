import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Bike, ChevronRight, Download, Eye, KeyRound, LayoutDashboard, Loader2, LocateFixed, Lock, MapPin, Save, Shield, ShieldCheck, Trash2, User, Users,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Badge, Button, Card, Input, Notice, PageHeader, Section, cx } from '../../components/ui'
import { useLocate } from '../../lib/usePharmacies'
import { dateTimeFr } from '../../lib/format'
import { INSURANCES } from '../../data/insurances'
import { downloadText } from '../../data/statusUi'

export default function Profile() {
  const user = useStore((s) => s.user)
  const setUser = useStore((s) => s.setUser)
  const locationGranted = useStore((s) => s.locationGranted)
  const insurance = useStore((s) => s.insurance)
  const seniorMode = useStore((s) => s.seniorMode)
  const setSeniorMode = useStore((s) => s.setSeniorMode)
  const audit = useStore((s) => s.audit)
  const prescriptions = useStore((s) => s.prescriptions)
  const missions = useStore((s) => s.missions)
  const notifications = useStore((s) => s.notifications)
  const resetDemo = useStore((s) => s.resetDemo)
  const { locate, loading } = useLocate()

  const [form, setForm] = useState({ name: user.name, phone: user.phone, address: user.address, commune: user.commune })
  const [saved, setSaved] = useState(false)
  const dirty = form.name !== user.name || form.phone !== user.phone || form.address !== user.address || form.commune !== user.commune

  const insurer = INSURANCES.find((i) => i.id === insurance?.insurerId)
  const unread = notifications.filter((n) => !n.read).length

  const myAudit = useMemo(() => {
    const refs = new Set([...prescriptions.map((p) => p.id), ...missions.map((m) => m.id)])
    return audit.filter((a) => refs.has(a.ref)).slice(0, 10)
  }, [audit, prescriptions, missions])

  const save = () => {
    setUser({ name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), commune: form.commune.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const exportData = () => {
    const s = useStore.getState()
    const refs = new Set([...s.prescriptions.map((p) => p.id), ...s.missions.map((m) => m.id)])
    const data = {
      exportedAt: new Date().toISOString(),
      user: s.user, profiles: s.profiles, insurance: s.insurance, seniorMode: s.seniorMode,
      prescriptions: s.prescriptions, missions: s.missions.map(({ otp: _otp, ...m }) => m),
      treatments: s.treatments, reports: s.reports, notifications: s.notifications, favorites: s.favorites,
      accessLog: s.audit.filter((a) => refs.has(a.ref)),
    }
    downloadText(`pharma-ci-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json')
  }

  const wipe = () => {
    if (!window.confirm('Supprimer toutes vos données de cet appareil ? Cette action est irréversible (démo : l\'application revient à son état initial).')) return
    resetDemo()
    const u = useStore.getState().user
    setForm({ name: u.name, phone: u.phone, address: u.address, commune: u.commune })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profil & paramètres" subtitle="Vos informations, préférences et confidentialité." icon={<User size={22} />} />

      <Section title="Mes informations">
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nom complet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Téléphone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Adresse de livraison" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
            <Input label="Commune" value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} />
          </div>
          <Button className="mt-4 w-full sm:w-auto" onClick={save} disabled={!dirty || !form.name.trim()}>
            <Save size={16} /> {saved ? 'Enregistré ✓' : 'Enregistrer'}
          </Button>
        </Card>
      </Section>

      <Section title="Localisation">
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl', locationGranted ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500')}><MapPin size={20} /></div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold">{locationGranted ? 'Position GPS activée' : 'Position par défaut'}</p>
            <p className="text-slate-500">{user.position.lat.toFixed(4)}, {user.position.lng.toFixed(4)} — utilisée pour les pharmacies proches et la livraison.</p>
          </div>
          <Button variant="outline" onClick={locate} disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />} Me localiser</Button>
        </Card>
      </Section>

      <Section title="Préférences">
        <div className="space-y-2">
          <LinkRow to="/assurances" icon={<Shield size={18} />} title="Mon assurance" sub={insurer ? `${insurer.name} · n° ${insurance!.memberNumber}` : 'Aucune assurance enregistrée'} />
          <LinkRow to="/famille" icon={<Users size={18} />} title="Dossier familial" sub="Profils de vos proches" />
          <LinkRow to="/notifications" icon={<Bell size={18} />} title="Notifications" sub={unread ? `${unread} non lue(s)` : 'Tout est lu'} />
          <Card className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-50 text-xl">👵🏾</div>
            <div className="min-w-0 flex-1"><p className="font-semibold">Espace senior</p><p className="text-xs text-slate-500">Texte agrandi, accueil simplifié</p></div>
            <button role="switch" aria-checked={seniorMode} aria-label="Mode senior" onClick={() => setSeniorMode(!seniorMode)} className={cx('relative h-8 w-14 shrink-0 rounded-full transition', seniorMode ? 'bg-brand-500' : 'bg-slate-300')}>
              <span className={cx('absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform', seniorMode && 'translate-x-6')} />
            </button>
          </Card>
        </div>
      </Section>

      <Section title="Sécurité & confidentialité">
        <Card>
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            <SecItem icon={<Lock size={16} />} title="Données chiffrées en transit" text="Échanges protégés (HTTPS/TLS)." />
            <SecItem icon={<KeyRound size={16} />} title="Accès limité aux ordonnances" text="Seul l'agent affecté à votre mission y accède, le temps de la mission." />
            <SecItem icon={<Eye size={16} />} title="Journalisation des consultations" text="Chaque accès à vos ordonnances est enregistré." />
            <SecItem icon={<ShieldCheck size={16} />} title="Consentement" text="Requis pour chaque proche ajouté au dossier familial." />
          </ul>

          <p className="mt-5 mb-2 text-sm font-bold">Derniers accès à vos données</p>
          {myAudit.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Aucun accès enregistré.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {myAudit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2 text-sm">
                  <span className="font-semibold">{a.actor}</span>
                  <span className="text-slate-600">{a.action}</span>
                  <Badge className="font-mono">{a.ref}</Badge>
                  <span className="ml-auto text-xs text-slate-400">{dateTimeFr(a.at)}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-5 mb-2 text-sm font-bold">Vos droits : accès et suppression</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={exportData}><Download size={16} /> Exporter mes données</Button>
            <Button variant="ghost" className="text-red-600 ring-1 ring-red-200 hover:bg-red-50" onClick={wipe}><Trash2 size={16} /> Supprimer mes données (démo)</Button>
          </div>
          <Notice tone="blue" className="mt-3 text-xs">En version de démonstration, vos données sont stockées uniquement sur cet appareil.</Notice>
        </Card>
      </Section>

      <Section title="Accès démo">
        <div className="grid gap-2 sm:grid-cols-2">
          <LinkRow to="/agent" icon={<Bike size={18} />} title="App PHARMA CI AGENT" sub="Exécuter les missions" />
          <LinkRow to="/admin" icon={<LayoutDashboard size={18} />} title="Console Admin" sub="Supervision, anti-fraude" />
        </div>
      </Section>
    </div>
  )
}

function LinkRow({ to, icon, title, sub }: { to: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</div>
      <div className="min-w-0 flex-1"><p className="font-semibold">{title}</p><p className="truncate text-xs text-slate-500">{sub}</p></div>
      <ChevronRight size={16} className="shrink-0 text-slate-300" />
    </Link>
  )
}

function SecItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
      <span><b className="block">{title}</b><span className="text-slate-500">{text}</span></span>
    </li>
  )
}
