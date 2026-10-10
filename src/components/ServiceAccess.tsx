import { useStore } from '../store/useStore'
import AccessCard from './AccessCard'

/** Accès de l'administration aux données partagées (agents et missions de tous les téléphones). */
export default function ServiceAccess() {
  const code = useStore((s) => s.agentCode)
  const error = useStore((s) => s.agentSyncError)
  return <AccessCard code={code} error={error} admin />
}
