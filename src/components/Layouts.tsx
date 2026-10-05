import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  AlertTriangle, BarChart3, Bell, Bike, BookOpen, Bot, Building2, Camera, ChevronDown, ClipboardList, FileText, Home, LayoutDashboard,
  Lock, Map, MapPin, Menu, Newspaper, Pill, ScanLine, Shield, ShieldAlert, Siren, Stethoscope, Truck, User, Users, X,
} from 'lucide-react'
import { useActiveProfile, useStore } from '../store/useStore'
import { DemoBanner, cx } from './ui'
import Simulation from './Simulation'

export function Logo({ suffix }: { suffix?: string }) {
  return (
    <Link to={suffix === 'Agent' ? '/agent' : suffix === 'Admin' ? '/admin' : '/'} className="flex items-center gap-2">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z" /></svg>
        <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent-500" />
      </span>
      <span className="leading-none">
        <span className="block text-lg font-extrabold tracking-tight">PHARMA <span className="text-accent-500">CI</span></span>
        {suffix && <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">{suffix}</span>}
      </span>
    </Link>
  )
}

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean }

const PATIENT_NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Essentiel',
    items: [
      { to: '/', label: 'Accueil', icon: <Home size={18} />, end: true },
      { to: '/ordonnance', label: 'Envoyer une ordonnance', icon: <Camera size={18} /> },
      { to: '/missions', label: 'Suivre ma commande', icon: <Truck size={18} /> },
      { to: '/traitements', label: 'Mes médicaments', icon: <Pill size={18} /> },
    ],
  },
  {
    group: 'Trouver',
    items: [
      { to: '/medicaments', label: 'Rechercher un médicament', icon: <ScanLine size={18} /> },
      { to: '/pharmacies', label: 'Trouver une pharmacie', icon: <MapPin size={18} /> },
      { to: '/garde', label: 'Pharmacies de garde', icon: <Siren size={18} /> },
      { to: '/carte', label: 'PHARMA MAP', icon: <Map size={18} /> },
      { to: '/sante', label: 'Autres services de santé', icon: <Stethoscope size={18} /> },
    ],
  },
  {
    group: 'Comprendre',
    items: [
      { to: '/cmu', label: 'CMU', icon: <Shield size={18} /> },
      { to: '/assurances', label: 'Assurances', icon: <Building2 size={18} /> },
      { to: '/assistant', label: 'PHARMA AI', icon: <Bot size={18} /> },
      { to: '/scan', label: 'SCAN PHARMA', icon: <ScanLine size={18} /> },
    ],
  },
  {
    group: "S'informer",
    items: [
      { to: '/actualites', label: 'Actualités santé', icon: <Newspaper size={18} /> },
      { to: '/conseils', label: 'Conseils santé', icon: <Stethoscope size={18} /> },
      { to: '/alertes', label: 'Alertes médicaments', icon: <AlertTriangle size={18} /> },
      { to: '/vigilance', label: 'Mon expérience', icon: <ShieldAlert size={18} /> },
      { to: '/reglementation', label: 'Réglementation', icon: <BookOpen size={18} /> },
      { to: '/ordre', label: 'Ordre des pharmaciens', icon: <Building2 size={18} /> },
    ],
  },
  {
    group: 'Mon espace',
    items: [
      { to: '/historique', label: 'Historique', icon: <ClipboardList size={18} /> },
      { to: '/famille', label: 'Dossier familial', icon: <Users size={18} /> },
      { to: '/profil', label: 'Profil & paramètres', icon: <User size={18} /> },
    ],
  },
]

function SideLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  )
}

function ProfileSwitcher() {
  const profiles = useStore((s) => s.profiles)
  const setActive = useStore((s) => s.setActiveProfile)
  const active = useActiveProfile()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pr-2.5 pl-1 text-sm font-semibold hover:bg-slate-200">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-500 text-xs text-white">{active.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
        <span className="hidden max-w-28 truncate sm:block">{active.name.split(' ')[0]}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 z-[1100] mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" onMouseLeave={() => setOpen(false)}>
          <p className="px-2 pb-1 text-xs font-semibold uppercase text-slate-400">Profil actif</p>
          {profiles.map((p) => (
            <button key={p.id} onClick={() => { setActive(p.id); setOpen(false) }} className={cx('flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50', p.id === active.id && 'bg-brand-50 font-semibold text-brand-700')}>
              {p.name}<span className="text-xs capitalize text-slate-400">{p.relation}</span>
            </button>
          ))}
          <Link to="/famille" onClick={() => setOpen(false)} className="mt-1 block rounded-xl px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">Gérer le dossier familial →</Link>
        </div>
      )}
    </div>
  )
}

function AppSwitcher() {
  const { pathname } = useLocation()
  const current = pathname.startsWith('/agent') ? 'agent' : pathname.startsWith('/admin') ? 'admin' : 'patient'
  return (
    <div className="hidden items-center rounded-full bg-slate-100 p-1 text-xs font-semibold lg:flex">
      {[
        { k: 'patient', to: '/', label: 'Patient' },
        { k: 'agent', to: '/agent', label: 'Agent' },
        { k: 'admin', to: '/admin', label: 'Admin' },
      ].map((a) => (
        <Link key={a.k} to={a.to} className={cx('rounded-full px-3 py-1', current === a.k ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink')}>
          {a.label}
        </Link>
      ))}
    </div>
  )
}

export function PatientLayout() {
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length)
  const activeMissions = useStore((s) => s.missions.filter((m) => !['livree', 'annulee'].includes(m.status)).length)
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()

  const bottom: NavItem[] = [
    { to: '/', label: 'Accueil', icon: <Home size={22} />, end: true },
    { to: '/pharmacies', label: 'Pharmacies', icon: <MapPin size={22} /> },
    { to: '/ordonnance', label: 'Ordonnance', icon: <Camera size={24} /> },
    { to: '/missions', label: 'Missions', icon: <Truck size={22} /> },
    { to: '/profil', label: 'Profil', icon: <User size={22} /> },
  ]

  return (
    <div className="min-h-dvh">
      <Simulation />
      <DemoBanner />
      <header className="sticky top-0 z-[900] border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenu(true)} aria-label="Menu"><Menu size={22} /></button>
          <Logo />
          <div className="flex-1" />
          <AppSwitcher />
          <Link to="/notifications" className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
            <Bell size={20} />
            {unread > 0 && <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
          </Link>
          <ProfileSwitcher />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4">
        <aside className="sticky top-20 hidden h-[calc(100dvh-6rem)] w-64 shrink-0 overflow-y-auto py-4 lg:block">
          {PATIENT_NAV.map((g) => (
            <div key={g.group} className="mb-4">
              <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.group}</p>
              {g.items.map((i) => <SideLink key={i.to} item={i} />)}
            </div>
          ))}
        </aside>
        <main className="min-w-0 flex-1 pt-5 pb-28 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Menu mobile */}
      {menu && (
        <div className="fixed inset-0 z-[1200] bg-ink/40 lg:hidden" onClick={() => setMenu(false)}>
          <div className="h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><Logo /><button onClick={() => setMenu(false)} className="p-1"><X /></button></div>
            {PATIENT_NAV.map((g) => (
              <div key={g.group} className="mb-4">
                <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.group}</p>
                {g.items.map((i) => <SideLink key={i.to} item={i} onClick={() => setMenu(false)} />)}
              </div>
            ))}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-sm font-semibold">
              <Link to="/agent" className="rounded-xl bg-slate-100 px-3 py-2 text-center">App Agent</Link>
              <Link to="/admin" className="rounded-xl bg-slate-100 px-3 py-2 text-center">Admin</Link>
            </div>
          </div>
        </div>
      )}

      {/* Bouton URGENCE permanent */}
      {pathname !== '/urgences' && (
        <Link to="/urgences" className="fixed right-4 bottom-24 z-[950] flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-700 lg:bottom-6">
          <Siren size={18} /> URGENCE
        </Link>
      )}

      {/* Navigation basse mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-[940] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {bottom.map((i, idx) =>
            idx === 2 ? (
              <NavLink key={i.to} to={i.to} className="-mt-5 flex flex-col items-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-500 text-white shadow-lg shadow-accent-500/40">{i.icon}</span>
                <span className="mt-0.5 text-[10px] font-semibold text-slate-600">{i.label}</span>
              </NavLink>
            ) : (
              <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold', isActive ? 'text-brand-600' : 'text-slate-500')}>
                {i.icon}
                {i.label}
                {i.to === '/missions' && activeMissions > 0 && <span className="absolute top-1 right-[30%] h-2 w-2 rounded-full bg-accent-500" />}
              </NavLink>
            ),
          )}
        </div>
      </nav>
    </div>
  )
}

function ConsoleLayout({ suffix, nav, dark }: { suffix: string; nav: NavItem[]; dark?: boolean }) {
  return (
    <div className="min-h-dvh">
      <Simulation />
      <DemoBanner />
      <header className={cx('sticky top-0 z-[900] border-b backdrop-blur-lg', dark ? 'border-white/10 bg-ink/95 text-white' : 'border-slate-200/70 bg-white/85')}>
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <div className={dark ? '[&_span]:text-white' : ''}><Logo suffix={suffix} /></div>
          <div className="flex-1" />
          <div className={dark ? 'text-ink' : ''}><AppSwitcher /></div>
          <Link to="/" className={cx('rounded-full px-3 py-1.5 text-xs font-semibold lg:hidden', dark ? 'bg-white/10' : 'bg-slate-100')}>Patient</Link>
        </div>
        <nav className="scrollbar-none mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {nav.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                cx('flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold',
                  isActive ? (dark ? 'bg-white text-ink' : 'bg-brand-50 text-brand-700') : dark ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')
              }
            >
              {i.icon}{i.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 pt-5 pb-16"><Outlet /></main>
    </div>
  )
}

export function AgentLayout() {
  return (
    <ConsoleLayout
      suffix="Agent"
      nav={[
        { to: '/agent', label: 'Tableau de bord', icon: <Bike size={16} />, end: true },
        { to: '/agent/missions', label: 'Missions', icon: <ClipboardList size={16} /> },
        { to: '/agent/revenus', label: 'Revenus', icon: <BarChart3 size={16} /> },
      ]}
    />
  )
}

export function AdminLayout() {
  return (
    <ConsoleLayout
      suffix="Admin"
      dark
      nav={[
        { to: '/admin', label: 'Command Center', icon: <LayoutDashboard size={16} />, end: true },
        { to: '/admin/missions', label: 'Missions', icon: <Truck size={16} /> },
        { to: '/admin/ordonnances', label: 'Ordonnances', icon: <FileText size={16} /> },
        { to: '/admin/agents', label: 'Agents', icon: <Bike size={16} /> },
        { to: '/admin/pharmacies', label: 'Pharmacies', icon: <MapPin size={16} /> },
        { to: '/admin/fraude', label: 'Anti-fraude', icon: <ShieldAlert size={16} /> },
        { to: '/admin/data', label: 'PHARMA DATA', icon: <BarChart3 size={16} /> },
        { to: '/admin/contenus', label: 'Contenus', icon: <Newspaper size={16} /> },
        { to: '/admin/securite', label: 'Sécurité', icon: <Lock size={16} /> },
      ]}
    />
  )
}
