import { defineConfig, lazyPlugins } from 'vite-plus'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: lazyPlugins(() => [tailwindcss(), react()]),
})
