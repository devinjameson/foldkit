import { defineConfig } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

export default defineConfig({
  plugins: [foldkit({ ssr: { serverEntry: '/src/entry.server.ts' } })],
})
