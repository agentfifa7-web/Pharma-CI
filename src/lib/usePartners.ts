import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { listPartners } from './sync'

/** Assureurs partenaires : copie locale affichée tout de suite, puis actualisée depuis le service. */
export function usePartners() {
  const partners = useStore((s) => s.partners)
  const setPartners = useStore((s) => s.setPartners)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    const r = await listPartners()
    setLoading(false)
    if ('partners' in r) {
      setPartners(r.partners)
      setError('')
    } else setError(r.error)
  }, [setPartners])

  useEffect(() => { void refresh() }, [refresh])
  return { partners, loading, error, refresh }
}
