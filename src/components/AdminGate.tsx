import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { checkAdminCode } from '../lib/sync'
import { syncOnce } from '../lib/syncEngine'
import { Button, Card, Input } from './ui'

/**
 * L'espace Admin n'est ouvert que sur le téléphone ou l'ordinateur de l'administratrice : le code
 * administrateur (secret ADMIN_CODE chez Cloudflare) est vérifié par le service avant d'afficher quoi que ce soit.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const adminCode = useStore((s) => s.adminCode)
  const setAdminCode = useStore((s) => s.setAdminCode)

  // Code changé chez Cloudflare : ce téléphone perd l'accès à la prochaine ouverture.
  useEffect(() => {
    if (!adminCode) return
    void checkAdminCode(adminCode).then((r) => {
      if (!r.ok && r.status === 401) setAdminCode('')
    })
  }, [adminCode, setAdminCode])

  return adminCode ? <>{children}</> : <AdminLogin />
}

function AdminLogin() {
  const setAdminCode = useStore((s) => s.setAdminCode)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setBusy(true)
    setError('')
    const code = draft.trim()
    const r = await checkAdminCode(code)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    const s = useStore.getState()
    setAdminCode(code)
    // Le code administrateur vaut aussi code agent : agents et missions de tous les téléphones s'affichent.
    if (!s.agentCode || s.agentSyncError) s.setAgentCode(code)
    void syncOnce()
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <p className="flex items-center gap-2 text-lg font-bold"><Lock size={20} className="text-brand-600" /> Espace administrateur</p>
        <p className="mt-1 text-sm text-slate-600">Réservé à l'administration de PHARMA CI. Saisissez le code administrateur.</p>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); void submit() }}>
          <Input className="flex-1" type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Code administrateur" />
          <Button type="submit" disabled={!draft.trim() || busy}>{busy ? 'Vérification…' : 'Entrer'}</Button>
        </form>
        {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
        <Link to="/" className="mt-4 block text-sm font-semibold text-brand-600 hover:underline">← Retour à l'accueil</Link>
      </Card>
    </div>
  )
}
