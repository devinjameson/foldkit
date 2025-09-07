import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      '@foldkit/html': path.resolve(__dirname, '../../packages/foldkit/src/core/html'),
      '@foldkit/route': path.resolve(__dirname, '../../packages/foldkit/src/core/route'),
      '@foldkit/fold': path.resolve(__dirname, '../../packages/foldkit/src/core/fold'),
      '@foldkit/fieldValidation': path.resolve(
        __dirname,
        '../../packages/foldkit/src/core/fieldValidation',
      ),
      '@foldkit/runtime': path.resolve(__dirname, '../../packages/foldkit/src/core/runtime'),
      '@foldkit': path.resolve(__dirname, '../../packages/foldkit/src/index'),
    },
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
