import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { applyPackageManager } from './files.js'

const templatePath = (relativePath: string): string =>
  fileURLToPath(new URL(`../../templates/${relativePath}`, import.meta.url))

const readTemplateFile = (relativePath: string): string =>
  readFileSync(templatePath(relativePath), 'utf8')

const listTemplateFiles = (
  relativeDirectory: string,
): ReadonlyArray<string> => {
  const root = templatePath(relativeDirectory)
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry =>
      relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'),
    )
    .sort()
}

type TemplatePackageJson = Readonly<{
  name: string
  scripts: Readonly<Record<string, string>>
}>

const readTemplatePackageJson = (relativePath: string): TemplatePackageJson =>
  JSON.parse(readTemplateFile(relativePath))

type TemplateTsconfig = Readonly<{
  compilerOptions: Readonly<Record<string, unknown>>
  include: ReadonlyArray<string>
}>

const readTemplateTsconfig = (relativePath: string): TemplateTsconfig =>
  JSON.parse(readTemplateFile(relativePath))

const templateReadme = readTemplateFile('base/README.md')

describe('applyPackageManager', () => {
  it('substitutes the README command placeholders for the selected manager', () => {
    const bun = applyPackageManager(templateReadme, 'bun')
    expect(bun).toContain('bun install')
    expect(bun).toContain('bun dev')
    expect(bun).not.toContain('{{')

    const npm = applyPackageManager(templateReadme, 'npm')
    expect(npm).toContain('npm install')
    expect(npm).toContain('npm run dev')
    expect(npm).not.toContain('{{')

    const pnpm = applyPackageManager(templateReadme, 'pnpm')
    expect(pnpm).toContain('pnpm install')
    expect(pnpm).toContain('pnpm dev')
    expect(pnpm).not.toContain('{{')
  })
})

describe('rendering templates', () => {
  it('ssg overlays the base with a server entry, prerender script, and static build pipeline', () => {
    expect(listTemplateFiles('rendering/ssg')).toEqual([
      'package.json',
      'scripts/prerender.ts',
      'src/entry.server.ts',
      'src/entry.ts',
      'src/main.ts',
      'src/route.ts',
      'src/scene.test.ts',
      'src/vite-env.d.ts',
      'tsconfig.json',
      'vite.config.ts',
    ])

    const packageJson = readTemplatePackageJson('rendering/ssg/package.json')
    expect(packageJson.scripts['build']).toBe(
      'export FOLDKIT_BUILD_ID="${FOLDKIT_BUILD_ID:-$(git rev-parse HEAD 2>/dev/null || echo dev)}"; vite build --outDir dist/client && vite build --ssr src/entry.server.ts --outDir dist/server && tsx scripts/prerender.ts',
    )
    expect(packageJson.scripts['preview']).toBe(
      'vite preview --outDir dist/client',
    )

    expect(readTemplateFile('rendering/ssg/vite.config.ts')).toContain(
      "ssr: { serverEntry: '/src/entry.server.ts' }",
    )
    expect(readTemplateFile('rendering/ssg/src/entry.server.ts')).toContain(
      'export const prerenderPaths',
    )
    expect(readTemplateFile('rendering/ssg/src/entry.ts')).toContain(
      'Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })',
    )
    expect(readTemplateFile('rendering/ssg/scripts/prerender.ts')).toContain(
      'Server.injectIntoTemplate',
    )
  })

  it('ssr overlays the base with a server entry, HTTP host, and start script', () => {
    expect(listTemplateFiles('rendering/ssr')).toEqual([
      'package.json',
      'server/main.ts',
      'src/cookie.ts',
      'src/entry.server.ts',
      'src/entry.ts',
      'src/main.ts',
      'src/scene.test.ts',
      'src/vite-env.d.ts',
      'tsconfig.json',
      'vite.config.ts',
    ])

    const packageJson = readTemplatePackageJson('rendering/ssr/package.json')
    expect(packageJson.scripts['build']).toBe(
      'export FOLDKIT_BUILD_ID="${FOLDKIT_BUILD_ID:-$(git rev-parse HEAD 2>/dev/null || echo dev)}"; vite build --outDir dist/client && vite build --ssr server/main.ts --outDir dist/server',
    )
    expect(packageJson.scripts['start']).toBe('node dist/server/main.js')

    expect(readTemplateFile('rendering/ssr/vite.config.ts')).toContain(
      "ssr: { serverEntry: '/src/entry.server.ts' }",
    )
    expect(readTemplateFile('rendering/ssr/src/entry.server.ts')).toContain(
      'flags: flagsForRequest(',
    )
    expect(readTemplateFile('rendering/ssr/src/entry.ts')).toContain(
      'Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })',
    )
    expect(readTemplateFile('rendering/ssr/server/main.ts')).toContain(
      'HttpServer.serve(handler)',
    )
  })

  it('rendering overlays keep the base name placeholder, shared scripts, and compiler options', () => {
    const basePackageJson = readTemplatePackageJson('base/package.json')
    const baseTsconfig = readTemplateTsconfig('base/tsconfig.json')
    const baseViteConfig = readTemplateFile('base/vite.config.ts')

    for (const rendering of ['ssg', 'ssr']) {
      const packageJson = readTemplatePackageJson(
        `rendering/${rendering}/package.json`,
      )
      expect(packageJson.name).toBe('{{name}}')
      expect(packageJson.scripts['dev']).toBe(basePackageJson.scripts['dev'])
      expect(packageJson.scripts['typecheck']).toBe(
        basePackageJson.scripts['typecheck'],
      )
      expect(packageJson.scripts['format']).toBe(
        basePackageJson.scripts['format'],
      )
      expect(packageJson.scripts['test']).toBe(basePackageJson.scripts['test'])

      const tsconfig = readTemplateTsconfig(
        `rendering/${rendering}/tsconfig.json`,
      )
      expect(tsconfig.compilerOptions).toEqual(baseTsconfig.compilerOptions)

      const viteConfig = readTemplateFile(
        `rendering/${rendering}/vite.config.ts`,
      )
      expect(viteConfig).toContain('devToolsMcpPort: 9988')
      expect(baseViteConfig).toContain('devToolsMcpPort: 9988')
    }

    expect(readTemplateTsconfig('rendering/ssg/tsconfig.json').include).toEqual(
      ['src/**/*', 'scripts/**/*'],
    )
    expect(readTemplateTsconfig('rendering/ssr/tsconfig.json').include).toEqual(
      ['src/**/*', 'server/**/*'],
    )
  })
})
