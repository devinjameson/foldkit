import { Array } from 'effect'
import type { RenderedApplication } from 'foldkit/experimental/server'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  BuildEnvironment,
  EnvironmentOptions,
  Plugin,
  ViteBuilder,
} from 'vite'

/** How a build materializes the URLs a server entry can render. */
export type FoldkitPrerenderOptions = Readonly<{
  /**
   * The paths to generate. Defaults to the `prerenderPaths` the server entry
   * exports, so the application names its own static routes.
   */
  paths?: ReadonlyArray<string>
  /**
   * The origin the entry sees as `Request.url` while generating, such as
   * `'https://app.example'`. It reaches canonical URLs and Open Graph URLs, so
   * a deployment that publishes those should set the origin it publishes.
   */
  origin?: string
}>

/** How `vite build` builds a server entry and what it generates from it. */
export type FoldkitBuildOptions = Readonly<{
  /**
   * The module the server build starts from. Defaults to the `serverEntry`
   * itself, which is what a generated site wants. Point it at a host module
   * when the deployment serves requests through one, such as an HTTP server or
   * a Worker that imports the entry and calls `renderPage`.
   *
   * A build that also generates pages needs `renderPage` and, unless the paths
   * are configured here, `prerenderPaths` on whichever module this names.
   */
  entry?: string
  /** Where the browser build is written. */
  clientOutDir?: string
  /** Where the server build is written. */
  serverOutDir?: string
  /**
   * Generate static HTML for a set of URLs after both builds. `true` takes the
   * paths from the entry's `prerenderPaths` export.
   */
  prerender?: boolean | FoldkitPrerenderOptions
}>

/**
 * What the build produced, written beside the server bundle for whatever
 * deploys it.
 *
 * A host has to decide what the asset layer does with a request that matches no
 * file, and that answer follows from the build rather than from taste: an
 * application with generated pages and no others wants a miss to stay a miss,
 * one with a server wants a miss to reach it, and one with neither wants the
 * template. Reading it here is how a deployment target gets that right without
 * asking its user to configure it twice.
 */
export type FoldkitBuildManifest = Readonly<{
  /** Where the browser build was written, relative to the Vite root. */
  client: string
  /** Where the server build was written, relative to the Vite root. */
  server: string
  /** The server build's entry file, relative to {@link server}. */
  serverEntry: string
  /** Every path this build generated a page for, in the order it generated. */
  prerendered: ReadonlyArray<string>
}>

const MANIFEST_FILE_NAME = 'foldkit.build.json'
const DEFAULT_CLIENT_OUT_DIR = 'dist/client'
const DEFAULT_SERVER_OUT_DIR = 'dist/server'
const DEFAULT_PRERENDER_ORIGIN = 'http://localhost'
// The chunk is named after the module it builds, which is what
// `vite build --ssr <file>` writes, so a host that starts `dist/server/main.js`
// keeps starting the same file.
const serverChunkName = (entry: string): string =>
  basename(entry, extname(entry))

type RenderedResult = {
  readonly _tag: string
  readonly application: RenderedApplication
  readonly status?: number
  readonly headers?: unknown
}

type BuildResult = Awaited<ReturnType<ViteBuilder['build']>>
type BuildOutput = Extract<BuildResult, { output: unknown }>['output'][number]

type ServerEntryModule = {
  readonly renderPage: (request: Request) => Promise<RenderedResult>
  readonly prerenderPaths?: ReadonlyArray<string>
}

// `build` resolves to a watcher when the environment watches, which a
// production build never does, and to one output set or several otherwise.
const asOutputs = (result: BuildResult): ReadonlyArray<BuildOutput> => {
  if (globalThis.Array.isArray(result)) {
    return result.flatMap(one => one.output)
  }
  if ('output' in result) {
    return result.output
  }
  throw new Error(
    '[foldkit] the build is watching rather than producing output, so there is nothing to generate pages from.',
  )
}

// The template is read out of the build that produced it rather than off disk.
// The generated `/` is written to the same `index.html` the browser build
// emits, so a build that re-read that file would parse the page it had just
// written on any second pass over one client build.
const templateFrom = (outputs: ReadonlyArray<BuildOutput>): string => {
  const html = Array.findFirst(
    outputs,
    file => file.type === 'asset' && file.fileName === 'index.html',
  )
  if (html._tag === 'None' || html.value.type !== 'asset') {
    throw new Error(
      '[foldkit] the browser build emitted no index.html to generate pages from. Prerendering needs an HTML entry.',
    )
  }
  return String(html.value.source)
}

const serverEntryFile = (outputs: ReadonlyArray<BuildOutput>): string => {
  const entry = Array.findFirst(
    outputs,
    file => file.type === 'chunk' && file.isEntry,
  )
  if (entry._tag === 'None') {
    throw new Error(
      '[foldkit] the server build emitted no entry chunk to generate pages with.',
    )
  }
  return entry.value.fileName
}

const environmentNamed = (
  builder: ViteBuilder,
  name: 'client' | 'ssr',
): BuildEnvironment => {
  const environment = builder.environments[name]
  if (environment === undefined) {
    throw new Error(
      `[foldkit] the build declares no "${name}" environment to build.`,
    )
  }
  return environment
}

const outputFileFor = (
  clientDirectory: string,
  path: string,
  origin: string,
): string => {
  const url = new URL(path, origin)
  if (url.origin !== new URL(origin).origin || url.pathname !== path) {
    throw new Error(
      `[foldkit] cannot generate the non-normalized same-origin path "${path}".`,
    )
  }
  return path === '/'
    ? resolve(clientDirectory, 'index.html')
    : resolve(clientDirectory, path.slice(1), 'index.html')
}

// A static file is a body plus whatever headers its host adds, so a result that
// carries a redirect, a status, or headers of its own cannot be written to one.
// Refusing here keeps a redirect from being published as an ordinary page.
const renderedApplication = (
  path: string,
  result: RenderedResult,
): RenderedApplication => {
  if (result._tag === 'Responded') {
    throw new Error(
      `[foldkit] cannot write the complete Response returned while generating "${path}" to a static HTML file.`,
    )
  }
  if (result.status !== undefined && result.status !== 200) {
    throw new Error(
      `[foldkit] cannot preserve status ${result.status} while generating "${path}" as a static HTML file.`,
    )
  }
  if (result.headers !== undefined) {
    throw new Error(
      `[foldkit] cannot preserve response headers while generating "${path}" as a static HTML file.`,
    )
  }
  return result.application
}

const prerenderOptionsFrom = (
  prerender: boolean | FoldkitPrerenderOptions,
): FoldkitPrerenderOptions | undefined => {
  if (prerender === false) {
    return undefined
  }
  return prerender === true ? {} : prerender
}

/**
 * Builds the server entry alongside the browser build, and generates static
 * HTML from it, inside one `vite build`.
 *
 * Vite drives both environments and every host plugin composes with them, so a
 * deployment target that runs `vite build` gets the whole application rather
 * than the browser half. The generated pages take their template from the
 * browser build's own output, so generating twice over one build produces the
 * same pages.
 */
export const foldkitBuild = (
  serverEntry: string,
  options: FoldkitBuildOptions = {},
): Plugin => {
  const entry = options.entry ?? serverEntry
  const clientOutDir = options.clientOutDir ?? DEFAULT_CLIENT_OUT_DIR
  const serverOutDir = options.serverOutDir ?? DEFAULT_SERVER_OUT_DIR
  const prerender = prerenderOptionsFrom(options.prerender ?? false)

  const generatePages = async (
    builder: ViteBuilder,
    template: string,
    serverDirectory: string,
    entryFileName: string,
  ): Promise<ReadonlyArray<string>> => {
    if (prerender === undefined) {
      return []
    }

    const origin = prerender.origin ?? DEFAULT_PRERENDER_ORIGIN
    const clientDirectory = resolve(builder.config.root, clientOutDir)
    const entry: ServerEntryModule = await import(
      pathToFileURL(resolve(serverDirectory, entryFileName)).href
    )
    const paths = prerender.paths ?? entry.prerenderPaths

    if (paths === undefined) {
      throw new Error(
        `[foldkit] cannot generate pages: "${entry}" exports no prerenderPaths and the build configured no paths.`,
      )
    }

    const { injectIntoTemplate } = await import('foldkit/experimental/server')

    for (const path of paths) {
      const result = await entry.renderPage(new Request(`${origin}${path}`))
      const html = injectIntoTemplate(
        template,
        renderedApplication(path, result),
      )
      const file = outputFileFor(clientDirectory, path, origin)

      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, html)
      builder.config.logger.info(`  generated ${path}`)
    }

    return paths
  }

  const writeManifest = async (
    builder: ViteBuilder,
    serverDirectory: string,
    entryFileName: string,
    prerendered: ReadonlyArray<string>,
  ): Promise<void> => {
    const manifest: FoldkitBuildManifest = {
      client: clientOutDir,
      server: serverOutDir,
      serverEntry: entryFileName,
      prerendered,
    }
    await writeFile(
      resolve(serverDirectory, MANIFEST_FILE_NAME),
      `${JSON.stringify(manifest, undefined, 2)}\n`,
    )
    builder.config.logger.info(`  wrote ${MANIFEST_FILE_NAME}`)
  }

  return {
    name: 'foldkit:build',
    apply: 'build',
    config: userConfig => {
      const client: EnvironmentOptions = {
        build: { outDir: clientOutDir },
      }
      const ssr: EnvironmentOptions = {
        build: {
          ssr: true,
          outDir: serverOutDir,
          rollupOptions: { input: { [serverChunkName(entry)]: entry } },
        },
      }

      const buildApp = async (builder: ViteBuilder): Promise<void> => {
        const clientResult = await builder.build(
          environmentNamed(builder, 'client'),
        )
        const serverResult = await builder.build(
          environmentNamed(builder, 'ssr'),
        )

        const template = templateFrom(asOutputs(clientResult))
        const entryFileName = serverEntryFile(asOutputs(serverResult))

        const serverDirectory = resolve(builder.config.root, serverOutDir)
        const prerendered = await generatePages(
          builder,
          template,
          serverDirectory,
          entryFileName,
        )

        await writeManifest(
          builder,
          serverDirectory,
          entryFileName,
          prerendered,
        )
      }

      // NOTE: a host framework that orchestrates its own environments owns the
      // order they build in. Defaulting over it would replace that
      // orchestration with this one rather than compose with it.
      return userConfig.builder?.buildApp === undefined
        ? { environments: { client, ssr }, builder: { buildApp } }
        : { environments: { client, ssr } }
    },
  }
}
