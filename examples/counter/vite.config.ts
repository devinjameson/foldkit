import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@foldkit/core': path.resolve(__dirname, '../../packages/foldkit/src'),
    },
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
