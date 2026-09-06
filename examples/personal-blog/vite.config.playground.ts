import { defineConfig, lazyPlugins } from 'vite-plus'

import { markdown } from '@foldkit/markdown/vite'
import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import { islandAttributes } from './src/island/islandAttributes'

export default defineConfig({
  plugins: lazyPlugins(() => [
    tailwindcss(),
    foldkit(),
    markdown({ islands: islandAttributes }),
  ]),
})
