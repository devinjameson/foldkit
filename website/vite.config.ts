import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { readFile } from 'node:fs/promises'
import { codeToHtml } from 'shiki'
import { type Plugin, defineConfig } from 'vite'

const highlightCodePlugin = (): Plugin => ({
  name: 'highlight-code',
  async transform(_code, id) {
    if (id.includes('?highlighted')) {
      const filePath = id.split('?')[0]
      const rawCode = await readFile(filePath, 'utf-8')
      const code = rawCode.trimEnd()

      const lines = code.split('\n')
      const html = await codeToHtml(code, {
        lang: 'typescript',
        theme: 'github-dark',
        decorations: lines.map((line, i) => ({
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
          properties: { 'data-line': i + 1 },
        })),
      })

      return `export default ${JSON.stringify(html)}`
    }
  },
})

export default defineConfig({
  plugins: [tailwindcss(), foldkit(), highlightCodePlugin()],
})
