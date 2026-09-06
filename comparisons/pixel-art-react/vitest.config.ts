import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    setupFiles: ['./src/testSetup.ts'],
  },
})
