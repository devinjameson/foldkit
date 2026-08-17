import { readFileSync } from 'node:fs'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Scaffold } from '../rendering.js'
import {
  buildUnresolvedDeps,
  buildUnresolvedDevDeps,
  dependencyExample,
  devCommand,
  installCommand,
  scaffoldDevDependencies,
} from './packages.js'

describe('buildUnresolvedDeps', () => {
  it('keeps third-party versions, resolves Foldkit workspace deps to latest, and drops foreign workspace deps', () => {
    const result = buildUnresolvedDeps({
      effect: '4.0.0-beta.106',
      '@effect/platform-browser': '4.0.0-beta.106',
      foldkit: 'workspace:*',
      '@foldkit/ui': 'workspace:*',
      tailwindcss: '^4.3.1',
      'some-internal-package': 'workspace:*',
    })

    expect(result).toEqual({
      effect: { _tag: 'Keep', version: '4.0.0-beta.106' },
      '@effect/platform-browser': { _tag: 'Keep', version: '4.0.0-beta.106' },
      foldkit: { _tag: 'Latest' },
      '@foldkit/ui': { _tag: 'Latest' },
      tailwindcss: { _tag: 'Keep', version: '^4.3.1' },
    })
  })
})

describe('buildUnresolvedDevDeps', () => {
  it('merges template tooling with the example, letting concrete example versions win over the template latest marker', () => {
    const result = buildUnresolvedDevDeps(
      {
        prettier: '^3.8.4',
        typescript: '^6.0.3',
        vite: '^8.0.16',
        '@foldkit/vite-plugin': 'workspace:*',
      },
      [],
    )

    expect(result).toEqual({
      '@foldkit/devtools': { _tag: 'Latest' },
      '@foldkit/vite-plugin': { _tag: 'Latest' },
      '@foldkit/devtools-mcp': { _tag: 'Latest' },
      '@foldkit/oxlint-plugin': { _tag: 'Latest' },
      '@trivago/prettier-plugin-sort-imports': { _tag: 'Latest' },
      'happy-dom': { _tag: 'Latest' },
      oxlint: { _tag: 'Latest' },
      prettier: { _tag: 'Keep', version: '^3.8.4' },
      vitest: { _tag: 'Latest' },
      typescript: { _tag: 'Keep', version: '^6.0.3' },
      vite: { _tag: 'Keep', version: '^8.0.16' },
    })
  })

  it('marks extra scaffold devDependencies for latest-version resolution', () => {
    const result = buildUnresolvedDevDeps({ tsx: '^4.22.4' }, ['@types/node'])

    expect(result['@types/node']).toEqual({ _tag: 'Latest' })
    expect(result['tsx']).toEqual({ _tag: 'Keep', version: '^4.22.4' })
  })
})

describe('dependencyExample', () => {
  it('reads spa dependencies from the chosen example and server-rendered dependencies from the reference apps', () => {
    expect(dependencyExample(Scaffold.Spa({ example: 'counter' }))).toBe(
      'counter',
    )
    expect(dependencyExample(Scaffold.Ssg())).toBe('ssg')
    expect(dependencyExample(Scaffold.Ssr())).toBe('ssr')
  })
})

describe('scaffoldDevDependencies', () => {
  it('adds @types/node for the server-rendered scaffolds only', () => {
    expect(
      scaffoldDevDependencies(Scaffold.Spa({ example: 'counter' })),
    ).toEqual([])
    expect(scaffoldDevDependencies(Scaffold.Ssg())).toEqual(['@types/node'])
    expect(scaffoldDevDependencies(Scaffold.Ssr())).toEqual(['@types/node'])
  })
})

describe('installCommand', () => {
  it('installs with the selected package manager', () => {
    expect(installCommand('pnpm')).toBe('pnpm install')
    expect(installCommand('npm')).toBe('npm install')
    expect(installCommand('yarn')).toBe('yarn install')
    expect(installCommand('bun')).toBe('bun install')
  })
})

describe('devCommand', () => {
  it('runs the dev script, prefixing run only where npm needs it', () => {
    expect(devCommand('pnpm')).toBe('pnpm dev')
    expect(devCommand('npm')).toBe('npm run dev')
    expect(devCommand('yarn')).toBe('yarn dev')
    expect(devCommand('bun')).toBe('bun dev')
  })
})

// A server-rendered scaffold derives its production `dependencies` from the
// reference example's manifest (buildUnresolvedDeps keeps every @foldkit/*
// workspace dependency), so @foldkit/devtools must stay in devDependencies
// there. In production `dependencies` it would make `vite build` inject the
// DevTools overlay into the shipped client template, and every SSR response and
// prerendered page would carry it.
describe('server-rendered example manifests', () => {
  const readManifest = (
    example: string,
  ): Readonly<{
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }> =>
    JSON.parse(
      readFileSync(
        new URL(
          `../../../../examples/${example}/package.json`,
          import.meta.url,
        ),
        'utf-8',
      ),
    )

  for (const example of ['ssr', 'ssg']) {
    it(`keeps @foldkit/devtools out of production dependencies (${example})`, () => {
      const manifest = readManifest(example)
      expect(manifest.dependencies?.['@foldkit/devtools']).toBeUndefined()
      expect(manifest.devDependencies?.['@foldkit/devtools']).toBe(
        'workspace:*',
      )
    })
  }
})
