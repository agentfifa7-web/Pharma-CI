import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

// Génère sw.js (application installable / hors connexion) avec la liste des fichiers à précharger.
function serviceWorker(): Plugin {
  return {
    name: 'pharma-ci-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => f.startsWith('assets/')).sort()
      files.push('manifest.webmanifest', 'icons/icon-192.png', 'favicon.svg')
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 10)
      const source = readFileSync('pwa/sw.js', 'utf8').replace('= __PRECACHE__', '= ' + JSON.stringify({ version, files }))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
})
