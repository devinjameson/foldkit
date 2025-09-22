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
        '../../packages/foldkit/src/core/fieldValidation',
      ),
      'foldkit/fold': path.resolve(__dirname, '../../packages/foldkit/src/core/fold'),
      'foldkit/html': path.resolve(__dirname, '../../packages/foldkit/src/core/html'),
      'foldkit/navigation': path.resolve(__dirname, '../../packages/foldkit/src/core/navigation'),
      'foldkit/route': path.resolve(__dirname, '../../packages/foldkit/src/core/route'),
      'foldkit/runtime': path.resolve(__dirname, '../../packages/foldkit/src/core/runtime'),
      'foldkit/schema': path.resolve(__dirname, '../../packages/foldkit/src/core/schema'),
      'foldkit/urlRequest': path.resolve(__dirname, '../../packages/foldkit/src/core/urlRequest'),
      foldkit: path.resolve(__dirname, '../../packages/foldkit/src/index'),
    },
  },
  server: {
    fs: {
      allow: ['../../'],
    },
  },
})
