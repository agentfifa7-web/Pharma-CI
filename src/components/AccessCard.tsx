import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Button, Card, Input, Notice } from './ui'
import { syncOnce } from '../lib/syncEngine'

/** Code d'accès remis par PHARMA CI : il permet à ce téléphone de recevoir les missions des patients. */
export default function AccessCard({ code, error, admin }: { code: string; error?: string; admin?: boolean }) {
  const setAgentCode = useStore((s) => s.setAgentCode)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  if (code && !error && !editing) {
    return (
      <Notice tone="green" icon={<KeyRound size={16} />} className="mb-4">
        {admin ? 'Connecté au service : agents et missions de tous les téléphones.' : 'Ce téléphone reçoit les missions des patients.'}{' '}
        <button onClick={() => setEditing(true)} className="font-semibold underline">Changer le code</button>
      </Notice>
    )
  }
  return (
    <Card className="mb-4 border-accent-300">
      <p className="flex items-center gap-2 font-bold"><KeyRound size={18} className="text-accent-600" /> Code agent PHARMA CI</p>
      <p className="mt-1 text-sm text-slate-600">{admin ? 'Saisissez le code agent (celui enregistré chez Cloudflare) pour voir ici les agents et les missions de tous les téléphones.' : 'Saisissez le code remis par PHARMA CI pour recevoir les missions des patients sur ce téléphone.'}</p>
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Input className="flex-1" type="password" autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Code agent" />
        <Button disabled={!draft.trim()} onClick={() => { setAgentCode(draft); setDraft(''); setEditing(false); void syncOnce() }}>Valider</Button>
      </div>
    </Card>
  )
}

