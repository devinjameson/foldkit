import { defineConfig } from 'vitest/config'

import { markdown } from '@foldkit/markdown/vite'

import {
  counterDemoCodePlugin,
  notePlayerDemoCodePlugin,
} from './scripts/demoCodePlugin'
import { islandAttributes } from './src/markdown/islandAttributes'

export default defineConfig({
  plugins: [
    markdown({ islands: islandAttributes }),
    counterDemoCodePlugin(),
    notePlayerDemoCodePlugin(),
  ],
  test: {
    environment: 'happy-dom',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    server: {
      deps: {
        inline: ['foldkit', '@foldkit/ui', '@foldkit/devtools'],
      },
    },
  },
})
