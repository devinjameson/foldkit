import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/vitest-setup.ts'],
    include: ['**/*.bench.test.ts'],
    server: {
      deps: {
        inline: ['foldkit'],
      },
    },
  },
})
