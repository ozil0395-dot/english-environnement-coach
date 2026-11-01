/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

/** Après le build : écrit dans dist/sw.js la liste de tous les fichiers de dist/assets, pour que le service worker
 *  les mette en cache dès son installation (hors connexion garanti, même si un écran n'a pas encore été ouvert). */
function precacheAssets() {
  return {
    name: 'precache-assets',
    apply: 'build' as const,
    closeBundle() {
      const dist = path.resolve('dist'), swPath = path.join(dist, 'sw.js'), assets = path.join(dist, 'assets')
      if (!fs.existsSync(swPath) || !fs.existsSync(assets)) return
      const list = fs.readdirSync(assets).filter((f) => !f.endsWith('.map')).map((f) => `./assets/${f}`)
      fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('/*__ASSETS__*/[]', JSON.stringify(list)))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), precacheAssets()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup.ts'],
  },
})
