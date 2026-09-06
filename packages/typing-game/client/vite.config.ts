import { defineConfig, lazyPlugins } from 'vite-plus'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: lazyPlugins(() => [tailwindcss(), foldkit()]),
})
