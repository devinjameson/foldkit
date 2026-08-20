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

    const deno = applyPackageManager(templateReadme, 'deno')
    expect(deno).toContain('deno install')
    expect(deno).toContain('deno task dev')
    expect(deno).not.toContain('{{')
  })
})

describe('rendering templates', () => {
  it('ssg overlays the base with a server entry, prerender script, and static build pipeline', () => {
    expect(listTemplateFiles('rendering/ssg')).toEqual([
      'README.md',
      'package.json',
      'scripts/build.mjs',
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
    expect(packageJson.scripts['build']).toBe('{{runtime}} scripts/build.mjs')
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
      'README.md',
      'package.json',
      'scripts/build.mjs',
      'server/handler.ts',
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
    expect(packageJson.scripts['build']).toBe('{{runtime}} scripts/build.mjs')
    expect(packageJson.scripts['start']).toBe('{{runtime}} dist/server/main.js')

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

  it('gives every step of one build the same generated build id', () => {
    // A generated project must reach a working hydratable build through its own
    // documented build command. `renderToString` refuses a hydratable render
    // with no build id, and hydration rebuilds a page whose id is not the
    // client's, so the client build and the server build of one run have to be
    // handed the same value without the author knowing the requirement exists.
    for (const rendering of ['ssg', 'ssr']) {
      const buildScript = readTemplateFile(
        `rendering/${rendering}/scripts/build.mjs`,
      )
      expect(buildScript).toContain('randomUUID()')
      expect(buildScript).toContain(
        'env: { ...process.env, FOLDKIT_BUILD_ID: buildId },',
      )
    }
  })

  it('takes a build id supplied by the deployment over a generated one', () => {
    for (const rendering of ['ssg', 'ssr']) {
      const buildScript = readTemplateFile(
        `rendering/${rendering}/scripts/build.mjs`,
      )
      const generated = buildScript.indexOf('randomUUID()')
      const supplied = buildScript.indexOf('process.env.FOLDKIT_BUILD_ID')
      expect(supplied).toBeGreaterThanOrEqual(0)
      expect(supplied).toBeLessThan(generated)
    }
  })

  it('never falls back to a build id two deployments could share', () => {
    // A constant fallback (`dev`, the project name, a version that only moves on
    // release) is worse than no id at all: hydration would read two deployments
    // as one and adopt a stale page's DOM for a client that no longer means the
    // same thing by it.
    for (const rendering of ['ssg', 'ssr']) {
      const code = readTemplateFile(`rendering/${rendering}/scripts/build.mjs`)
        .split('\n')
        .filter(line => !line.trimStart().startsWith('//'))
        .join('\n')

      expect(code).not.toMatch(/FOLDKIT_BUILD_ID[^\n]*\|\|\s*['"`]/)
      expect(code).not.toMatch(/\?\?\s*['"`]/)
      expect(code).not.toMatch(/:\s*['"`][^'"`]+['"`]\s*$/m)
    }
  })

  it('treats an empty FOLDKIT_BUILD_ID as unset', () => {
    // The plugin reads an empty string as no id at all, so taking it as a value
    // here would suppress the generated one and leave the build with none,
    // failing later at the render rather than here.
    for (const rendering of ['ssg', 'ssr']) {
      const buildScript = readTemplateFile(
        `rendering/${rendering}/scripts/build.mjs`,
      )
      expect(buildScript).toContain("supplied === ''")
    }
  })

  it('documents the build id contract in the generated README', () => {
    // The id is a deployment's, not Foldkit's, so a generated project has to say
    // what it is before its author has to ask.
    for (const rendering of ['ssg', 'ssr']) {
      const readme = applyPackageManager(
        readTemplateFile(`rendering/${rendering}/README.md`),
        'pnpm',
      )
      expect(readme).not.toContain('{{')
      expect(readme).toContain('pnpm build')
      expect(readme).toContain('FOLDKIT_BUILD_ID')
      expect(readme).toMatch(/never contain\s+a secret/)
      expect(readme).toMatch(/two deployments\s+must/)
    }
  })

  it('branches build.mjs to spawn vite (and, for ssg, the prerender script) through Deno', () => {
    for (const rendering of ['ssg', 'ssr']) {
      const buildScript = readTemplateFile(
        `rendering/${rendering}/scripts/build.mjs`,
      )
      expect(buildScript).toContain("typeof Deno !== 'undefined'")
      expect(buildScript).toContain("'node_modules/.bin/vite'")
      // NOTE: a bare `npm:vite` specifier resolves to whatever the registry
      // calls latest, so the build would drift off the vite in package.json
      // the day a new major ships. The shim path is what pins it.
      expect(buildScript).not.toContain("'npm:vite'")
    }

    expect(readTemplateFile('rendering/ssg/scripts/build.mjs')).toContain(
      "'deno', ['run', '-A', 'scripts/prerender.ts']",
    )
  })
})

describe('deno overlay', () => {
  it('ships a deno.json enabling the local node_modules directory', () => {
    const denoJson = JSON.parse(
      readTemplateFile('package-managers/deno/deno.json'),
    )
    expect(denoJson).toEqual({ nodeModulesDir: 'auto' })
  })

  it('keeps the package-manager templates free of rendering overlays', () => {
    // Both `package-managers/<pm>/` and `rendering/<mode>/` are copied
    // wholesale into a project, so an ssr overlay parked in either one lands in
    // scaffolds it does not apply to. A Deno SPA would ship a server host it
    // has no dependency for. Overlays live in `rendering-overlays/` for that
    // reason, and these two lists are what keeps them there.
    expect(listTemplateFiles('package-managers/deno')).toEqual(['deno.json'])
    expect(listTemplateFiles('package-managers/pnpm')).toEqual([
      'pnpm-workspace.yaml',
    ])

    for (const rendering of ['ssg', 'ssr']) {
      for (const file of listTemplateFiles(`rendering/${rendering}`)) {
        expect(file).not.toContain('package-manager')
      }
    }
  })

  it('overlays only the ssr platform wiring, leaving the request handling shared', () => {
    expect(listTemplateFiles('rendering-overlays/deno')).toEqual([
      'ssr/server/main.ts',
    ])

    const denoMain = readTemplateFile(
      'rendering-overlays/deno/ssr/server/main.ts',
    )
    expect(denoMain).toContain(
      "import { DenoHttpServer, DenoRuntime } from '@effect/platform-deno'",
    )
    expect(denoMain).toContain('DenoHttpServer.layer({ port })')
    expect(denoMain).toContain('Layer.provide(DenoHttpServerLive)')
    expect(denoMain).toContain('DenoRuntime.runMain(Layer.launch(Main))')
    expect(denoMain).not.toContain('@effect/platform-node')
    expect(denoMain).not.toContain('node:http')

    // Both hosts import the same handler rather than restating it, so the
    // request rules the Node host is gated on are the rules the Deno host
    // serves. An overlay that grew its own copy would drift silently.
    const nodeMain = readTemplateFile('rendering/ssr/server/main.ts')
    for (const main of [nodeMain, denoMain]) {
      expect(main).toContain("import { PORT, makeHandler } from './handler'")
      expect(main).toContain('HttpServer.serve(handler)')
      expect(main).not.toContain('renderRequest')
      expect(main).not.toContain('HttpStaticServer')
    }

    const handler = readTemplateFile('rendering/ssr/server/handler.ts')
    expect(handler).toContain('export const PORT')
    expect(handler).toContain('export const makeHandler')
    // The Deno host drops @effect/platform-node, which is what pulled
    // @types/node in transitively, so the node: imports here need the
    // reference to resolve under `deno task typecheck`.
    expect(handler).toContain('/// <reference types="node" />')
  })
})
