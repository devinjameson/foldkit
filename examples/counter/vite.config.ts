import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { Plugin, defineConfig } from 'vite'

// Store state in Vite server memory
let preservedState: unknown = undefined
let isHmrReload = false

const foldkitHmrPlugin: Plugin = {
  name: 'foldkit-hmr-prototype',
  apply: 'serve' as const,
  configureServer(server) {
    // Listen for state preservation from client
    server.ws.on('foldkit:preserve-state', (data) => {
      preservedState = data.state
      console.log('Vite server preserved state:', data.state)
    })

    // Send preserved state when client requests it
    server.ws.on('foldkit:request-state', () => {
      console.log('Client requested state, sending:', isHmrReload ? preservedState : undefined)
      server.ws.send('foldkit:restore-state', { state: isHmrReload ? preservedState : undefined })

      // If this was a manual refresh, clear the preserved state for future HMRs
      if (!isHmrReload) {
        preservedState = undefined
      }

      // Reset the flag after sending
      isHmrReload = false
    })
  },
  handleHotUpdate({ server, modules, timestamp }) {
    // Check if any of the updated modules are main.ts files
    const hasMainTs = modules.some((mod) => mod.id?.endsWith('main.ts'))

    if (hasMainTs) {
      // Mark this as an HMR reload so state is preserved
      isHmrReload = true

      // Invalidate modules manually
      const invalidatedModules = new Set()
      for (const mod of modules) {
        server.moduleGraph.invalidateModule(mod, invalidatedModules, timestamp, true)
      }
      // Trigger full reload for Foldkit apps to ensure clean restart
      server.ws.send({ type: 'full-reload' })
      return []
    }
  },
  transform(code, id) {
    if (id.endsWith('main.ts')) {
      return {
        code:
          code +
          `
if (import.meta.hot) {
  import.meta.hot.accept();
}`,
        map: null,
      }
    }
  },
}

export default defineConfig({
  plugins: [tailwindcss(), foldkitHmrPlugin],
  resolve: {
    alias: {
      'foldkit/fieldValidation': path.resolve(
        __dirname,
        '../../packages/foldkit/src/core/fieldValidation',
      ),
      'foldkit/fold': path.resolve(__dirname, '../../packages/foldkit/src/core/fold'),
      'foldkit/html': path.resolve(__dirname, '../../packages/foldkit/src/core/html'),
      'foldkit/navigation': path.resolve(__dirname, '../../packages/foldkit/src/core/navigation'),
      'foldkit/route': path.resolve(__dirname, '../../packages/foldkit/src/core/route'),
      'foldkit/runtime': path.resolve(__dirname, '../../packages/foldkit/src/core/runtime'),
      'foldkit/schema': path.resolve(__dirname, '../../packages/foldkit/src/core/schema'),
      'foldkit/urlRequest': path.resolve(__dirname, '../../packages/foldkit/src/core/urlRequest'),
      foldkit: path.resolve(__dirname, '../../packages/foldkit/src/index'),
    },
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
