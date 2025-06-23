import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@foldkit/core': path.resolve(__dirname, '../../packages/foldkit/src'),
    },
  },
  server: {
    fs: {
      allow: ['../../packages/foldkit'],
    },
  },
})
