import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { Plugin, defineConfig } from 'vite'

let latestModel: unknown = null

const foldkitHmrPlugin: Plugin = {
  name: 'foldkit-hmr-prototype',
  apply: 'serve' as const,
  configureServer(server) {
    server.ws.on('foldkit:model', (model: unknown) => {
      latestModel = model
      console.log('Stored latest model:', latestModel)
    })

    server.watcher.on('change', (file: string) => {
      if (/\.ts$/.test(file)) {
        server.ws.send({
          type: 'custom',
          event: 'foldkit:reload',
          data: { file, model: latestModel },
        })
      }
    })
  },
  transform(code, id) {
    if (id.endsWith('main.ts') || id.endsWith('main.tsx')) {
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
