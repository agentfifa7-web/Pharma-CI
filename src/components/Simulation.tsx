import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { SYNC_EVERY_MS, syncOnce } from '../lib/syncEngine'

/**
 * Moteur de l'application : synchronise les missions partagées (patient ↔ agent) et, pour les missions de
 * démonstration enregistrées sur cet appareil seulement, affecte automatiquement un agent de test et fait
 * avancer sa position.
 */
export default function Simulation() {
  const missions = useStore((s) => s.missions)
  const assignAgent = useStore((s) => s.assignAgent)
  const tickDelivery = useStore((s) => s.tickDelivery)

  useEffect(() => {
    let running = false
    const tick = () => {
      if (running || document.hidden) return
      running = true
      void syncOnce().finally(() => (running = false))
    }
    tick()
    const t = setInterval(tick, SYNC_EVERY_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const pending = missions.filter((m) => m.status === 'payee' && !m.remote).map((m) => m.id).join(',')
  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => pending.split(',').forEach(assignAgent), 2500)
    return () => clearTimeout(t)
  }, [pending, assignAgent])

  const moving = missions.filter((m) => m.status === 'en_route' && !m.remote).map((m) => m.id).join(',')
  useEffect(() => {
    if (!moving) return
    const t = setInterval(() => moving.split(',').forEach(tickDelivery), 3000)
    return () => clearInterval(t)
  }, [moving, tickDelivery])

  const senior = useStore((s) => s.seniorMode)
  useEffect(() => {
    document.documentElement.classList.toggle('senior', senior)
  }, [senior])

  return null
}
