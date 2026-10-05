import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, HeartHandshake, Pencil, Plus, Trash2, UserRound, Users } from 'lucide-react'
import type { FamilyProfile } from '../../types'
import { useStore } from '../../store/useStore'
import { Badge, Button, Card, Input, Modal, Notice, PageHeader, Section, Select, cx } from '../../components/ui'
import { initials } from '../../lib/format'
import { RELATION_LABEL } from '../../data/statusUi'

type Draft = { name: string; relation: FamilyProfile['relation']; birthYear: string; caregiver: string; consent: boolean }
const EMPTY: Draft = { name: '', relation: 'enfant', birthYear: '', caregiver: '', consent: false }
const RELATION_EMOJI: Record<FamilyProfile['relation'], string> = { moi: '🙋🏾', enfant: '🧒🏾', parent: '👴🏾', conjoint: '💑', autre: '👤' }

export default function Family() {
  const profiles = useStore((s) => s.profiles)
  const activeProfileId = useStore((s) => s.activeProfileId)
  const prescriptions = useStore((s) => s.prescriptions)
  const seniorMode = useStore((s) => s.seniorMode)
  const addProfile = useStore((s) => s.addProfile)
  const updateProfile = useStore((s) => s.updateProfile)
  const removeProfile = useStore((s) => s.removeProfile)
  const setActiveProfile = useStore((s) => s.setActiveProfile)
  const setSeniorMode = useStore((s) => s.setSeniorMode)

  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)

  const open = (p?: FamilyProfile) => {
    setDraft(p ? { name: p.name, relation: p.relation, birthYear: p.birthYear ? String(p.birthYear) : '', caregiver: p.caregiver ?? '', consent: p.consent } : EMPTY)
    setEditing(p ? p.id : 'new')
  }

  const save = () => {
    if (!draft.name.trim() || !draft.consent) return
    const data = {
      name: draft.name.trim(), relation: draft.relation, consent: draft.consent,
      birthYear: draft.birthYear ? Number(draft.birthYear) : undefined, caregiver: draft.caregiver.trim() || undefined,
    }
    if (editing === 'new') addProfile(data)
    else if (editing) updateProfile(editing, data)
    setEditing(null)
  }

  const editingSelf = editing !== 'new' && profiles.find((p) => p.id === editing)?.relation === 'moi'
  const selfUnnamed = profiles.some((p) => p.relation === 'moi' && p.name.trim() === 'Moi')

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Dossier familial" subtitle="Gérez les ordonnances et traitements de vos proches." icon={<Users size={22} />} action={<Button size="sm" onClick={() => open()}><Plus size={16} /><span className="hidden sm:inline">Ajouter</span></Button>} />

      {selfUnnamed && (
        <Notice tone="orange" className="mb-4">
          Votre profil porte encore le nom par défaut « Moi ». <Link to="/profil" className="font-semibold underline">Complétez votre profil</Link> (nom, téléphone, adresse) ou modifiez-le ci-dessous.
        </Notice>
      )}
      {profiles.length <= 1 && (
        <p className="mb-3 text-sm text-slate-600">Aucun proche ajouté pour l'instant. Ajoutez un enfant, un parent ou un conjoint pour gérer ses ordonnances.</p>
      )}

      <Section title="Profils">
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((p) => {
            const active = p.id === activeProfileId
            const count = prescriptions.filter((x) => x.profileId === p.id).length
            return (
              <Card key={p.id} className={cx(active && 'border-brand-400 ring-2 ring-brand-500/15')}>
                <div className="flex items-start gap-3">
                  <span className={cx('grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-extrabold', active ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600')}>{initials(p.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.name}</p>
                    <p className="text-sm text-slate-500">{RELATION_EMOJI[p.relation]} {RELATION_LABEL[p.relation]}{p.birthYear ? ` · né(e) en ${p.birthYear}` : ''}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {active && <Badge tone="green">Profil actif</Badge>}
                      <Badge>{count} ordonnance{count > 1 ? 's' : ''}</Badge>
                      {p.consent && <Badge tone="blue">Consentement ✓</Badge>}
                    </div>
                    {p.caregiver && <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-600"><HeartHandshake size={12} /> Proche autorisé : <b>{p.caregiver}</b></p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!active && <Button size="sm" variant="soft" onClick={() => setActiveProfile(p.id)}><Check size={14} /> Activer</Button>}
                  <Button size="sm" variant="outline" onClick={() => open(p)}><Pencil size={14} /> Modifier</Button>
                  {p.relation !== 'moi' && (
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => window.confirm(`Retirer le profil ${p.name} ?`) && removeProfile(p.id)}>
                      <Trash2 size={14} /> Retirer
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
          <button onClick={() => open()} className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700">
            <Plus size={24} /><span className="text-sm font-semibold">Ajouter un proche</span>
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Le profil actif est utilisé pour les nouvelles ordonnances et les rappels de traitement.</p>
      </Section>

      <Section title="Espace senior">
        <Card className={cx(seniorMode && 'border-accent-300 bg-accent-50/40')}>
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-50 text-2xl">👵🏾</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Mode senior {seniorMode ? 'activé' : 'désactivé'}</p>
              <p className="mt-0.5 text-sm text-slate-600">Texte agrandi dans toute l'application et accueil simplifié avec les actions essentielles (ordonnance, suivi, urgence).</p>
            </div>
            <Toggle on={seniorMode} onChange={setSeniorMode} label="Mode senior" />
          </div>
          <Notice tone="blue" icon={<HeartHandshake size={16} />} className="mt-3">
            Un <b>proche autorisé</b> peut être indiqué sur chaque profil pour accompagner une personne âgée : envoyer ses ordonnances, suivre ses livraisons et ses rappels.
          </Notice>
        </Card>
      </Section>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Ajouter un proche' : 'Modifier le profil'}>
        <div className="space-y-3">
          <Input label="Nom complet" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Prénom et nom" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Lien" value={draft.relation} disabled={editingSelf} onChange={(e) => setDraft({ ...draft, relation: e.target.value as FamilyProfile['relation'] })}>
              {(Object.keys(RELATION_LABEL) as FamilyProfile['relation'][]).filter((r) => r !== 'moi' || editingSelf).map((r) => <option key={r} value={r}>{RELATION_LABEL[r]}</option>)}
            </Select>
            <Input label="Année de naissance" type="number" inputMode="numeric" min={1900} max={new Date().getFullYear()} value={draft.birthYear} onChange={(e) => setDraft({ ...draft, birthYear: e.target.value })} />
          </div>
          <Input label="Proche autorisé (Espace senior)" value={draft.caregiver} onChange={(e) => setDraft({ ...draft, caregiver: e.target.value })} placeholder="Nom et téléphone du proche" />
          <label className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-sm">
            <input type="checkbox" checked={draft.consent} onChange={(e) => setDraft({ ...draft, consent: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500" />
            <span>Je certifie avoir l'accord de cette personne (ou être son représentant légal) pour gérer ses ordonnances et données de santé sur PHARMA CI.</span>
          </label>
          {!draft.consent && <p className="text-xs font-semibold text-amber-700">Le consentement est obligatoire.</p>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={save} disabled={!draft.name.trim() || !draft.consent}><UserRound size={16} /> Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx('relative h-8 w-14 shrink-0 rounded-full transition', on ? 'bg-brand-500' : 'bg-slate-300')}
    >
      <span className={cx('absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform', on && 'translate-x-6')} />
    </button>
  )
}
