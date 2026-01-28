import type { Plugin, ViteDevServer } from 'vite'

let preservedModel: unknown = undefined
let isHmrReload = false

export const foldkit = (): Plugin => {
  return {
    name: 'foldkit-hmr',
    apply: 'serve',
    configureServer,
    handleHotUpdate,
  }
}

const configureServer = (server: ViteDevServer) => {
  server.ws.on('foldkit:preserve-model', (model) => {
    preservedModel = model
  })

  server.ws.on('foldkit:request-model', () => {
    server.ws.send(
      'foldkit:restore-model',
      isHmrReload ? preservedModel : undefined,
    )
    if (!isHmrReload) {
      preservedModel = undefined
    }
    isHmrReload = false
  })
}

const handleHotUpdate = ({ server }: { server: ViteDevServer }) => {
  isHmrReload = true
  server.ws.send({ type: 'full-reload' })
  return []
}
