import { defineConfig } from 'vite-plus'

import { foldkitAliases } from '../../examples/vite.aliases'

export default defineConfig({
  resolve: {
    alias: foldkitAliases(__dirname),
  },
  test: {
    environment: 'happy-dom',
    pool: 'forks',
    maxWorkers: 1,
    isolate: false,
  },
})
