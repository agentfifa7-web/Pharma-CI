import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/**
 * Moteur de simulation (démo) : affecte automatiquement un agent aux missions payées
 * et fait avancer la position des agents en route. En production, ces événements
 * proviennent du backend (temps réel).
 */
export default function Simulation() {
  const missions = useStore((s) => s.missions)
  const assignAgent = useStore((s) => s.assignAgent)
  const tickDelivery = useStore((s) => s.tickDelivery)

  const pending = missions.filter((m) => m.status === 'payee').map((m) => m.id).join(',')
  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => pending.split(',').forEach(assignAgent), 2500)
    return () => clearTimeout(t)
  }, [pending, assignAgent])

  const moving = missions.filter((m) => m.status === 'en_route').map((m) => m.id).join(',')
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
