import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), foldkit()],
  resolve: {
    alias: {
      'foldkit/fieldValidation': path.resolve(
        __dirname,
        '../../packages/foldkit/src/fieldValidation',
      ),
      'foldkit/html': path.resolve(__dirname, '../../packages/foldkit/src/html'),
      'foldkit/navigation': path.resolve(__dirname, '../../packages/foldkit/src/navigation'),
      'foldkit/route': path.resolve(__dirname, '../../packages/foldkit/src/route'),
      'foldkit/runtime': path.resolve(__dirname, '../../packages/foldkit/src/runtime'),
      'foldkit/schema': path.resolve(__dirname, '../../packages/foldkit/src/schema'),
      'foldkit/url': path.resolve(__dirname, '../../packages/foldkit/src/url'),
      foldkit: path.resolve(__dirname, '../../packages/foldkit/src/index'),
    },
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
