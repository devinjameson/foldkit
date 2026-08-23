import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { type Plugin, createBuilder } from 'vite'
import { afterAll, describe, expect, it, onTestFinished } from 'vitest'

import {
  type FoldkitBuildManifest,
  type FoldkitBuildOptions,
  foldkitBuild,
} from '../src/build.ts'
import { foldkitBuildToken } from '../src/buildToken.ts'

const FIXTURE_ROOT = resolve(import.meta.dirname, 'fixtures/build')
const SERVER_ENTRY = '/entry.server.ts'

const filesUnder = async (
  directory: string,
): Promise<ReadonlyArray<string>> => {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  })
  return entries
    .filter(entry => entry.isFile())
    .map(entry =>
      join(entry.parentPath, entry.name).slice(directory.length + 1),
    )
    .sort()
}

// Each build gets its own output directories so the cases can run concurrently
// and so one case never reads what another wrote.
const buildFixture = async (
  name: string,
  options: Omit<FoldkitBuildOptions, 'clientOutDir' | 'serverOutDir'> = {},
  extraPlugins: ReadonlyArray<Plugin> = [],
): Promise<Readonly<{ client: string; server: string }>> => {
  const client = `dist-test/${name}/client`
  const server = `dist-test/${name}/server`

  // Registered before the build so a case that asserts a failing build still
  // cleans up what the build wrote before it failed.
  onTestFinished(async () => {
    await rm(resolve(FIXTURE_ROOT, `dist-test/${name}`), {
      recursive: true,
      force: true,
    })
  })

  const builder = await createBuilder({
    root: FIXTURE_ROOT,
    logLevel: 'silent',
    plugins: [
      ...extraPlugins,
      foldkitBuildToken('test-build'),
      foldkitBuild(SERVER_ENTRY, {
        ...options,
        clientOutDir: client,
        serverOutDir: server,
      }),
    ],
  })
  await builder.buildApp()

  return {
    client: resolve(FIXTURE_ROOT, client),
    server: resolve(FIXTURE_ROOT, server),
  }
}

afterAll(async () => {
  await rm(resolve(FIXTURE_ROOT, 'dist-test'), { recursive: true, force: true })
})

describe('foldkitBuild', () => {
  it('builds the browser bundle and the server bundle in one build', async () => {
    const { client, server } = await buildFixture('both')

    expect(await filesUnder(server)).toEqual([
      'entry.server.js',
      'foldkit.build.json',
    ])
    expect(await filesUnder(client)).toContain('index.html')
  })

  it('generates a page for every path the entry lists', async () => {
    const { client } = await buildFixture('generated', { prerender: true })

    expect(await filesUnder(client)).toContain('about/index.html')

    const about = await readFile(resolve(client, 'about/index.html'), 'utf8')
    expect(about).toContain('<main data-foldkit-app="app"')
    expect(about).toContain('data-foldkit-build="test-build"')
    expect(about).toContain('>/about</main>')
    expect(about).toContain('<title>Fixture /about</title>')
  })

  it('generates the root path over the template it renders into', async () => {
    const { client } = await buildFixture('root', { prerender: true })

    const index = await readFile(resolve(client, 'index.html'), 'utf8')
    expect(index).toContain('>/</main>')
    expect(index).not.toContain('<div id="root"></div>')
  })

  // Two builds of one project produce the same bytes, which is what lets a
  // deployment compare them.
  it('generates the same pages when the build runs again', async () => {
    const first = await buildFixture('repeat-one', { prerender: true })
    const second = await buildFixture('repeat-two', { prerender: true })

    expect(
      await readFile(resolve(second.client, 'index.html'), 'utf8'),
    ).toEqual(await readFile(resolve(first.client, 'index.html'), 'utf8'))
  })

  // The generated `/` replaces the browser build's own `index.html`, so a build
  // that read its template from that file would parse a page it generated on
  // any second pass over one browser build. The template comes from the build
  // result instead, which this pins by making the file on disk say something
  // the build result does not: generation that reads the file produces pages
  // carrying the corruption, generation that reads the build produces the
  // pages below.
  it('takes the template from the build rather than from the file it writes', async () => {
    const clientDir = 'dist-test/disk-template/client'
    const corruptClientIndex: Plugin = {
      name: 'test:corrupt-client-index',
      // Both environment builds finish before pages are generated, so this
      // needs no environment guard: whenever it runs, the file on disk is
      // corrupt before generation reads anything.
      //
      // NOTE: the marker is a meta element rather than the title, which
      // injection rewrites from the render's own Document. A corrupted title
      // is gone from the page it produced, so a test that watched the title
      // would pass against a build that read the file.
      async writeBundle() {
        await writeFile(
          resolve(FIXTURE_ROOT, clientDir, 'index.html'),
          '<!doctype html><html><head><title>Fixture</title><meta name="came-from-disk" content="yes" /></head><body><div id="root"></div></body></html>',
        )
      },
    }

    const { client } = await buildFixture(
      'disk-template',
      { prerender: true },
      [corruptClientIndex],
    )

    const [index, about] = await Promise.all([
      readFile(resolve(client, 'index.html'), 'utf8'),
      readFile(resolve(client, 'about/index.html'), 'utf8'),
    ])

    expect(index).not.toContain('came-from-disk')
    expect(about).not.toContain('came-from-disk')
    expect(about).toContain('>/about</main>')
  })

  it('generates only the configured paths when the build names them', async () => {
    const { client } = await buildFixture('configured', {
      prerender: { paths: ['/about'] },
    })

    const files = await filesUnder(client)
    expect(files).toContain('about/index.html')
    expect(await readFile(resolve(client, 'index.html'), 'utf8')).toContain(
      '<div id="root"></div>',
    )
  })

  it('renders against the origin the build configures', async () => {
    const { client } = await buildFixture('origin', {
      prerender: { paths: ['/'], origin: 'https://app.example' },
    })

    expect(await readFile(resolve(client, 'index.html'), 'utf8')).toContain(
      '>/</main>',
    )
  })

  // A host has to decide what its asset layer does with a request that matches
  // no file, and the build is what knows: which paths became files, and whether
  // there is a server to reach. Writing it down is what lets a deployment target
  // derive that instead of asking its user to configure it a second time.
  it('reports what it built for whatever deploys it', async () => {
    const { server } = await buildFixture('manifest', { prerender: true })

    const manifest: FoldkitBuildManifest = JSON.parse(
      await readFile(resolve(server, 'foldkit.build.json'), 'utf8'),
    )

    expect(manifest.prerendered).toEqual(['/', '/about'])
    expect(manifest.serverEntry).toBe('entry.server.js')
    expect(manifest.client).toContain('client')
    expect(manifest.server).toContain('server')
  })

  it('reports no generated paths when the build generates none', async () => {
    const { server } = await buildFixture('manifest-none')

    const manifest: FoldkitBuildManifest = JSON.parse(
      await readFile(resolve(server, 'foldkit.build.json'), 'utf8'),
    )

    expect(manifest.prerendered).toEqual([])
    expect(manifest.serverEntry).toBe('entry.server.js')
  })

  // The manifest describes the deployment, and the browser build is the part of
  // it the public reaches, so a file that names internal directories does not
  // belong in what gets served.
  it('keeps the manifest out of the published browser build', async () => {
    const { client } = await buildFixture('manifest-private', {
      prerender: true,
    })

    expect(await filesUnder(client)).not.toContain('foldkit.build.json')
  })

  it('refuses to write a result that carries a response of its own', async () => {
    await expect(
      buildFixture('responded', { prerender: { paths: ['/redirect'] } }),
    ).rejects.toThrow(/cannot write the complete Response/)
  })
})
