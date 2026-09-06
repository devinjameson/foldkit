import { defineConfig, lazyPlugins } from 'vite-plus'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { foldkitAliases } from '../../examples/vite.aliases'

export default defineConfig({
  plugins: lazyPlugins(() => [
    tailwindcss(),
    foldkit({ devToolsMcpPort: 9988 }),
  ]),
  resolve: {
    alias: foldkitAliases(__dirname),
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
