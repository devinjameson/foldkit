import { defineConfig } from 'vitest/config'

import {
  counterDemoCodePlugin,
  notePlayerDemoCodePlugin,
} from './scripts/demoCodePlugin'

export default defineConfig({
  plugins: [counterDemoCodePlugin(), notePlayerDemoCodePlugin()],
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
