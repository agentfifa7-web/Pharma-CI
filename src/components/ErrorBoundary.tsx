import { Component, type ReactNode } from 'react'
import { reloadOnce } from '../lib/reload'

/**
 * Filet de sécurité : si une page ne peut pas s'afficher (par exemple un fichier de l'ancienne version
 * après une mise à jour, ou une connexion coupée), on recharge l'application au lieu de laisser un écran blanc.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[PHARMA CI] Erreur d\'affichage', error)
    reloadOnce()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-xs space-y-4">
          <p className="text-lg font-bold text-ink">Un problème d'affichage est survenu</p>
          <p className="text-sm text-slate-500">Vérifiez votre connexion Internet, puis rechargez l'application.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-brand-500 px-6 py-3 font-semibold text-white"
          >
            Recharger
          </button>
        </div>
      </div>
    )
  }
}
