import { useEffect, useMemo, useState } from 'react'
import type { Pharmacy } from '../types'
import { PHARMACIES } from '../data/pharmacies'
import { fetchPharmacies } from '../services/pharmacyProvider'
import { useStore } from '../store/useStore'
import { distanceKm } from './geo'
import { openInfo, type OpenInfo } from './hours'

export type PharmacyView = Pharmacy & { km: number; open: OpenInfo; onGarde: boolean }

/** Annuaire enrichi (distance depuis l'utilisateur, statut d'ouverture), trié par distance. */
export function usePharmacies() {
  const [list, setList] = useState<Pharmacy[]>(PHARMACIES)
  const position = useStore((s) => s.user.position)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    void fetchPharmacies().then(setList)
    const t = setInterval(() => setTick((x) => x + 1), 60000) // rafraîchit les statuts d'ouverture
    return () => clearInterval(t)
  }, [])
  return useMemo(() => {
    void tick
    const d = new Date()
    return list
      .map((p) => {
        const open = openInfo(p, d)
        return { ...p, km: distanceKm(position, p.position), open, onGarde: open.label === 'De garde' }
      })
      .sort((a, b) => a.km - b.km)
  }, [list, position, tick])
}

/** Demande la position GPS du navigateur ; repli sur la position enregistrée. */
export function useLocate() {
  const setPosition = useStore((s) => s.setPosition)
  const [loading, setLoading] = useState(false)
  const locate = () => {
    if (!navigator.geolocation) return
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (p) => { setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }, true); setLoading(false) },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }
  return { locate, loading }
}
