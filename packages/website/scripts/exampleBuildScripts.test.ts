import { existsSync, readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { EXAMPLE_FILE_EXTENSIONS, EXAMPLE_SOURCE_ROOTS } from '../vite.config'
import {
  INCLUDED_EXTENSIONS,
  loadPlaygroundFiles,
  loadPlaygroundWorkspacePackageVersions,
} from './playgroundFilesPlugin'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const SERVER_RENDERED_EXAMPLES = ['ssr', 'ssg']

const buildScriptOf = (slug: string): string => {
  const manifest: Readonly<{ scripts: Readonly<Record<string, string>> }> =
    JSON.parse(
      readFileSync(
        resolve(REPO_ROOT, 'examples', slug, 'package.json'),
        'utf8',
      ),
    )
  const build = manifest.scripts['build'] ?? ''
  const referenced = build.split(/\s+/).find(token => token.includes('/'))
  if (referenced === undefined) {
    throw new Error(`the ${slug} build script references no file: ${build}`)
  }
  return referenced
}

// The playground and the example source tabs both publish what an example is
// made of. A build command naming a file neither of them ships hands a reader a
// command that cannot run, and hides the script that implements the build id
// contract.
describe('server-rendered example build scripts', () => {
  for (const slug of SERVER_RENDERED_EXAMPLES) {
    it(`ships the file the ${slug} build command runs`, () => {
      const referenced = buildScriptOf(slug)
      const [root] = referenced.split('/')

      expect(existsSync(resolve(REPO_ROOT, 'examples', slug, referenced))).toBe(
        true,
      )
      expect(EXAMPLE_SOURCE_ROOTS).toContain(root)
      expect(EXAMPLE_FILE_EXTENSIONS.has(extname(referenced))).toBe(true)
      expect(INCLUDED_EXTENSIONS.has(extname(referenced))).toBe(true)
    })
  }

  it('retains every executable the transformed SSG build invokes', async () => {
    const bySlug = await loadPlaygroundFiles()
    const ssgEntry = Object.entries(bySlug).find(([slug]) => slug === 'ssg')
    if (ssgEntry === undefined) {
      throw new Error('the transformed playground files omit ssg')
    }
    const [, ssg] = ssgEntry

    const packageJsonFile = Object.entries(ssg.files).find(
      ([path]) => path === 'package.json',
    )
    if (packageJsonFile === undefined) {
      throw new Error('the transformed SSG playground omits package.json')
    }
    const [, packageJson] = packageJsonFile

    const manifest: Readonly<{
      devDependencies?: Readonly<Record<string, string>>
    }> = JSON.parse(packageJson)
    expect(manifest.devDependencies).toHaveProperty('tsx')
    expect(manifest.devDependencies).toHaveProperty('vite')
  })

  it('pins every transformed workspace dependency to its exact version', async () => {
    const [bySlug, versions] = await Promise.all([
      loadPlaygroundFiles(),
      loadPlaygroundWorkspacePackageVersions(),
    ])

    for (const [slug, { files }] of Object.entries(bySlug)) {
      const source = files['package.json']
      if (source === undefined) {
        throw new Error(`the ${slug} playground omits package.json`)
      }
      const manifest: Readonly<{
        dependencies?: Readonly<Record<string, string>>
        devDependencies?: Readonly<Record<string, string>>
      }> = JSON.parse(source)
      const dependencies = {
        ...(manifest.dependencies ?? {}),
        ...(manifest.devDependencies ?? {}),
      }
      for (const [name, version] of Object.entries(versions)) {
        if (dependencies[name] !== undefined) {
          expect(dependencies[name], `${slug}: ${name}`).toBe(version)
        }
      }
    }
  })
})
