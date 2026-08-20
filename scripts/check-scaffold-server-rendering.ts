import { Array as Array_ } from 'effect'
import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { request } from 'node:http'
import { createRequire } from 'node:module'
import { createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'

// A freshly generated SSR and SSG application, built through the command its
// own README documents, with this workspace's `foldkit` and
// `@foldkit/vite-plugin` installed from tarballs over the published versions
// the CLI resolves.
//
// The scaffold's build is where the build id contract is either kept or lost.
// Hydration needs the client build and the server build of one run to carry the
// same id, and a hydratable render with none fails outright, so a generated
// project has to satisfy a requirement its author has not read about yet. This
// gate asserts the generated project does: it builds, the served or generated
// page carries an id, the client bundle carries the same one, Chromium adopts
// the server DOM, and the generated application responds to interaction.
//
// Checking the template files says nothing about this. Only running the
// generated project's own build command does.

const CLI_DIR = 'packages/create-foldkit-app'
const FOLDKIT_DIR = 'packages/foldkit'
const PLUGIN_DIR = 'packages/vite-plugin-foldkit'
const REPO_ROOT = process.cwd()

const DEPENDENCY_MANIFESTS_DIRECTORY_ENV =
  'CREATE_FOLDKIT_APP_DEPENDENCY_MANIFESTS_DIRECTORY'
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

const SSR_PORT = 5312
const SSG_PORT = 5313
const DENO_SSR_PORT = 5314
const DENO_SSG_PORT = 5315
const BUILD_ID_ATTRIBUTE = /data-foldkit-build="([^"]*)"/
const EXPECTED_ALLOW = 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS'
const HOST_OUTPUT_LIMIT = 16_000
const HOST_READY_ATTEMPTS = 60
const HOST_REQUEST_TIMEOUT_MS = 5_000
const HOST_STOP_TIMEOUT_MS = 3_000
const HOST_FLUSH_TIMEOUT_MS = 2_000
const HYDRATION_TIMEOUT_MS = 10_000

const isSkipBuild = process.argv.includes('--skip-build')

// A Deno scaffold is the only configuration where the generated project runs
// on something other than Node, so it is the only one that exercises the
// `deno.json`, the `deno task` wiring, the `@effect/platform-deno` host, and
// the vite shim the build names by path. CI installs Deno and passes
// --require-deno so a missing toolchain fails instead of quietly reducing what
// this gate covers. A local run without Deno says out loud what it skipped.
const isDenoRequired = process.argv.includes('--require-deno')

type ScaffoldPackageManager = 'npm' | 'deno'

const PACKAGE_MANAGER_LABELS: Readonly<Record<ScaffoldPackageManager, string>> =
  {
    npm: 'npm',
    deno: 'Deno',
  }

const denoVersion = (): string | undefined => {
  const result = spawnSync('deno', ['--version'], {
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    return undefined
  }
  return result.stdout.split('\n')[0]?.trim()
}

class ScaffoldCheckError extends Error {}

const log = (message: string): void => {
  console.log(`[scaffold-ssr] ${message}`)
}

const fail = (message: string): never => {
  throw new ScaffoldCheckError(message)
}

const assertScaffold: (
  condition: boolean,
  message: string,
) => asserts condition = (
  condition: boolean,
  message: string,
): asserts condition => {
  if (!condition) {
    fail(message)
  }
}

type RunOptions = Readonly<{
  cwd?: string
  env?: Readonly<Record<string, string>>
  inherit?: boolean
  timeoutMs?: number
}>

type RunResult = Readonly<{
  stdout: string
  stderr: string
  status: number | null
}>

const run = (
  command: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): RunResult => {
  const result = spawnSync(command, [...args], {
    cwd: options.cwd,
    encoding: 'utf-8',
    env: { ...process.env, ...options.env },
    stdio: options.inherit ? 'inherit' : 'pipe',
    timeout: options.timeoutMs ?? 300_000,
  })
  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
    status: result.status,
  }
}

const runRequired = (
  label: string,
  command: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): RunResult => {
  log(label)
  const result = run(command, args, options)
  if (result.status !== 0) {
    const output = `${result.stdout}${result.stderr}`.trim()
    fail(`${label} failed${output === '' ? '' : `:\n${output}`}`)
  }
  return result
}

type RunningHost = Readonly<{
  process: ChildProcess
  port: number
  output: () => string
  // Resolves once the host's stdio has closed, which is after the last write.
  // A host that exits on startup is usually reporting why on the way out, and
  // reading `output()` the moment `exitCode` is set races that final write.
  flushed: Promise<void>
}>

const activeHosts = new Set<RunningHost>()
const stoppingHosts = new WeakMap<RunningHost, Promise<void>>()

const tryBindPort = (port: number): Promise<Error | undefined> =>
  new Promise(resolveResult => {
    const server = createNetServer()
    server.once('error', error => resolveResult(error))
    server.listen(port, '127.0.0.1', () => {
      server.close(error => resolveResult(error ?? undefined))
    })
  })

const assertPortIsFree = async (port: number): Promise<void> => {
  const error = await tryBindPort(port)
  if (error !== undefined) {
    fail(
      `port ${String(port)} is already in use. A host left by an earlier run ` +
        'would answer this gate instead of the generated project.',
    )
  }
}

const waitForPortToClose = async (port: number): Promise<void> => {
  for (let attempt = 0; attempt < 30; attempt++) {
    if ((await tryBindPort(port)) === undefined) {
      return
    }
    await new Promise(resolveWait => setTimeout(resolveWait, 100))
  }
  fail(`the generated host did not release port ${String(port)}`)
}

const startHost = (
  command: string,
  args: ReadonlyArray<string>,
  projectDir: string,
  port: number,
  env: Readonly<Record<string, string>> = {},
): RunningHost => {
  let output = ''
  const host = spawn(command, [...args], {
    cwd: projectDir,
    detached: true,
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const capture = (chunk: Buffer | string): void => {
    output = `${output}${String(chunk)}`.slice(-HOST_OUTPUT_LIMIT)
  }
  host.stdout?.on('data', capture)
  host.stderr?.on('data', capture)
  host.on('error', error => capture(error.message))
  const flushed = new Promise<void>(resolveFlushed => {
    host.once('close', () => resolveFlushed())
  })
  const runningHost = {
    process: host,
    port,
    output: () => output,
    flushed,
  }
  activeHosts.add(runningHost)
  return runningHost
}

const waitForExit = (
  host: ChildProcess,
  timeoutMs: number,
): Promise<boolean> => {
  if (host.exitCode !== null || host.signalCode !== null) {
    return Promise.resolve(true)
  }
  return new Promise(resolveExit => {
    const onExit = (): void => {
      clearTimeout(timeout)
      resolveExit(true)
    }
    const timeout = setTimeout(() => {
      host.off('exit', onExit)
      resolveExit(false)
    }, timeoutMs)
    host.once('exit', onExit)
  })
}

const terminateHost = (host: ChildProcess, isForce: boolean): void => {
  if (host.pid === undefined) {
    return
  }
  if (process.platform === 'win32') {
    spawnSync(
      'taskkill',
      ['/PID', String(host.pid), '/T', ...(isForce ? ['/F'] : [])],
      { stdio: 'ignore' },
    )
    return
  }
  try {
    process.kill(-host.pid, isForce ? 'SIGKILL' : 'SIGTERM')
  } catch {
    host.kill(isForce ? 'SIGKILL' : 'SIGTERM')
  }
}

const stopHost = (host: RunningHost): Promise<void> => {
  const existing = stoppingHosts.get(host)
  if (existing !== undefined) {
    return existing
  }

  const stopping = (async () => {
    terminateHost(host.process, false)
    const didExit = await waitForExit(host.process, HOST_STOP_TIMEOUT_MS)
    const isPortStillOpen = (await tryBindPort(host.port)) !== undefined
    if (!didExit || isPortStillOpen) {
      terminateHost(host.process, true)
      await waitForExit(host.process, HOST_STOP_TIMEOUT_MS)
    }
    await waitForPortToClose(host.port)
  })().finally(() => activeHosts.delete(host))
  stoppingHosts.set(host, stopping)
  return stopping
}

let isStoppingForSignal = false

const stopForSignal = (exitCode: number): void => {
  if (isStoppingForSignal) {
    return
  }
  isStoppingForSignal = true
  void Promise.allSettled(Array.from(activeHosts, stopHost)).then(() =>
    process.exit(exitCode),
  )
}

process.once('SIGINT', () => stopForSignal(130))
process.once('SIGTERM', () => stopForSignal(143))

const exitDiagnostic = async (host: RunningHost): Promise<string> => {
  await Promise.race([
    host.flushed,
    new Promise<void>(resolveTimeout =>
      setTimeout(() => resolveTimeout(), HOST_FLUSH_TIMEOUT_MS),
    ),
  ])
  const output = host.output()
  return output === '' ? '(the host wrote nothing)' : output
}

const fetchServedPage = async (
  host: RunningHost,
  origin: string,
  path = '/',
): Promise<string> => {
  const url = `${origin}${path}`
  for (let attempt = 0; attempt < HOST_READY_ATTEMPTS; attempt++) {
    if (host.process.exitCode !== null || host.process.signalCode !== null) {
      fail(
        `the generated host exited before serving ${url}:\n` +
          `${await exitDiagnostic(host)}`,
      )
    }
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1_000),
      })
      assertScaffold(
        response.status === 200,
        `the generated host answered ${response.status} for ${url}`,
      )
      return await response.text()
    } catch (error) {
      if (error instanceof ScaffoldCheckError) {
        throw error
      }
      await new Promise(resolveWait => setTimeout(resolveWait, 250))
    }
  }
  return fail(
    `the generated host never accepted a connection at ${url}:\n` +
      `${await exitDiagnostic(host)}`,
  )
}

type RawAnswer = Readonly<{
  status: number
  body: string
  headers: Readonly<Record<string, string | undefined>>
}>

const askRaw = (
  origin: string,
  path: string,
  method: string,
  headers: Readonly<Record<string, string>> = {},
): Promise<RawAnswer> =>
  new Promise((resolveAnswer, reject) => {
    const { hostname, port } = new URL(origin)
    const clientRequest = request(
      {
        hostname,
        port,
        path,
        method,
        headers: { ...headers },
        signal: AbortSignal.timeout(HOST_REQUEST_TIMEOUT_MS),
      },
      response => {
        let body = ''
        response.setEncoding('utf8')
        response.on('error', reject)
        response.on('data', chunk => {
          body += chunk
        })
        response.on('end', () => {
          const responseHeaders: Record<string, string | undefined> = {}
          for (const [name, value] of Object.entries(response.headers)) {
            responseHeaders[name] = Array.isArray(value)
              ? value.join(', ')
              : value
          }
          resolveAnswer({
            status: response.statusCode ?? 0,
            body,
            headers: responseHeaders,
          })
        })
      },
    )
    clientRequest.on('error', reject)
    clientRequest.end()
  })

type PlaywrightConsoleMessage = Readonly<{
  type: () => string
  text: () => string
}>

type PlaywrightLocator = Readonly<{
  click: () => Promise<void>
  textContent: () => Promise<string | null>
}>

type PlaywrightResponse = Readonly<{
  status: () => number
  text: () => Promise<string>
}>

type PlaywrightRoute = Readonly<{
  fetch: () => Promise<PlaywrightResponse>
  fulfill: (options: {
    response: PlaywrightResponse
    body: string
  }) => Promise<void>
}>

type PlaywrightPage = Readonly<{
  route: (
    url: string,
    handler: (route: PlaywrightRoute) => Promise<void>,
  ) => Promise<void>
  goto: (
    url: string,
    options: { waitUntil: 'domcontentloaded' },
  ) => Promise<PlaywrightResponse | null>
  waitForFunction: (
    expression: string,
    argument?: unknown,
    options?: { timeout?: number },
  ) => Promise<void>
  evaluate: <A>(expression: string) => Promise<A>
  locator: (selector: string) => PlaywrightLocator
  getByRole: (role: string, options: { name: string }) => PlaywrightLocator
  url: () => string
  on: {
    (event: 'pageerror', listener: (error: Error) => void): void
    (
      event: 'console',
      listener: (message: PlaywrightConsoleMessage) => void,
    ): void
  }
  close: () => Promise<void>
}>

type PlaywrightBrowser = Readonly<{
  newPage: () => Promise<PlaywrightPage>
  close: () => Promise<void>
}>

type PlaywrightBrowserType = Readonly<{
  launch: (options: { executablePath?: string }) => Promise<PlaywrightBrowser>
}>

const loadChromium = (): PlaywrightBrowserType => {
  const requireFromE2e = createRequire(
    join(REPO_ROOT, 'packages/examples-e2e/package.json'),
  )
  const playwright: Readonly<{ chromium: PlaywrightBrowserType }> =
    requireFromE2e('playwright')
  return playwright.chromium
}

type HydratedPage = Readonly<{
  page: PlaywrightPage
  diagnostics: Array<string>
}>

type AdoptionReading = Readonly<{
  rootWasCaptured: boolean
  sentinelWasCaptured: boolean
  rootContainsCurrentSentinel: boolean
  rootIsConnected: boolean
  sentinelIsSame: boolean
  buildMarkerIsRemoved: boolean
  bodyIsContained: boolean
}>

const openHydratedPage = async (
  browser: PlaywrightBrowser,
  url: string,
  sentinelExpression: string,
  label: string,
): Promise<HydratedPage> => {
  const page = await browser.newPage()
  const diagnostics: Array<string> = []
  page.on('pageerror', error =>
    diagnostics.push(`page error: ${error.message}`),
  )
  page.on('console', message => {
    if (message.type() === 'error') {
      diagnostics.push(`console error: ${message.text()}`)
    }
  })

  try {
    await page.route(url, async route => {
      const response = await route.fetch()
      const html = await response.text()
      assertScaffold(
        html.includes('</body>'),
        `${label} has no closing body for the parser-time identity probe`,
      )
      const probe =
        '<script>' +
        "window.__foldkitServedRoot=document.querySelector('[data-foldkit-app]');" +
        `window.__foldkitServedSentinel=${sentinelExpression};` +
        '</script>'
      await route.fulfill({
        response,
        body: html.replace('</body>', `${probe}</body>`),
      })
    })

    const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
    assertScaffold(
      response?.status() === 200,
      `${label} navigation answered ${String(response?.status())}`,
    )
    try {
      await page.waitForFunction(
        "window.__foldkitServedRoot instanceof Element && !window.__foldkitServedRoot.hasAttribute('data-foldkit-build')",
        undefined,
        { timeout: HYDRATION_TIMEOUT_MS },
      )
    } catch (error) {
      const state = await page.evaluate<unknown>(`(() => {
        const root = window.__foldkitServedRoot
        return {
          bodyInert: document.body.inert,
          bodyRefused: document.body.hasAttribute('data-foldkit-refused'),
          buildId: root?.getAttribute('data-foldkit-build'),
          rootConnected: root?.isConnected,
        }
      })()`)
      fail(
        `${label} did not finish hydration: ${JSON.stringify({
          state,
          diagnostics,
          error: error instanceof Error ? error.message : String(error),
        })}`,
      )
    }

    const reading = await page.evaluate<AdoptionReading>(`(() => {
      const root = window.__foldkitServedRoot
      const sentinel = ${sentinelExpression}
      return {
        rootWasCaptured: window.__foldkitServedRoot instanceof Element,
        sentinelWasCaptured:
          window.__foldkitServedSentinel instanceof Element,
        rootContainsCurrentSentinel:
          root instanceof Element &&
          sentinel instanceof Element &&
          root.contains(sentinel),
        rootIsConnected: window.__foldkitServedRoot?.isConnected === true,
        sentinelIsSame:
          window.__foldkitServedSentinel === sentinel,
        buildMarkerIsRemoved:
          root instanceof Element && !root.hasAttribute('data-foldkit-build'),
        bodyIsContained:
          document.body.inert ||
          document.body.hasAttribute('data-foldkit-refused') ||
          document.body.getAttribute('aria-hidden') === 'true',
      }
    })()`)
    assertScaffold(
      reading.rootWasCaptured && reading.sentinelWasCaptured,
      `${label} did not expose its parser-created root and sentinel node`,
    )
    assertScaffold(
      reading.rootContainsCurrentSentinel &&
        reading.rootIsConnected &&
        reading.sentinelIsSame,
      `${label} rebuilt instead of adopting its parser-created DOM: ` +
        JSON.stringify(reading),
    )
    assertScaffold(
      reading.buildMarkerIsRemoved && !reading.bodyIsContained,
      `${label} did not complete hydration normally: ${JSON.stringify(reading)}`,
    )
    return { page, diagnostics }
  } catch (error) {
    await page.close()
    throw error
  }
}

const assertNoBrowserDiagnostics = (
  label: string,
  diagnostics: ReadonlyArray<string>,
): void => {
  assertScaffold(
    Array_.isReadonlyArrayEmpty(diagnostics),
    `${label} emitted browser errors:\n${diagnostics.join('\n')}`,
  )
}

type PackOutput = ReadonlyArray<Readonly<{ filename?: string }>>

const packPackage = (label: string, packageDir: string): string => {
  const result = runRequired(label, 'npm', ['pack', '--json'], {
    cwd: join(process.cwd(), packageDir),
  })
  const output: PackOutput = JSON.parse(result.stdout)
  const filename = output[0]?.filename
  assertScaffold(
    filename !== undefined,
    `${label} did not return a tarball filename`,
  )
  return join(process.cwd(), packageDir, filename)
}

const buildIdIn = (html: string): string => {
  const match = BUILD_ID_ATTRIBUTE.exec(html)
  return match?.[1] ?? ''
}

const clientBundleCarries = (clientDir: string, buildId: string): boolean =>
  readdirSync(join(clientDir, 'assets'))
    .filter(name => extname(name) === '.js')
    .some(name =>
      readFileSync(join(clientDir, 'assets', name), 'utf8').includes(buildId),
    )

const assertBuildIdReachesBothSides = (
  label: string,
  html: string,
  clientDir: string,
): string => {
  const buildId = buildIdIn(html)
  assertScaffold(
    buildId !== '',
    `${label} carries no build id on its root. A generated project has to ` +
      'reach a hydratable build through its own build command, without its ' +
      'author having to discover the requirement first.',
  )
  assertScaffold(
    clientBundleCarries(clientDir, buildId),
    `${label} carries build id "${buildId}", which no client bundle shares. ` +
      'Hydration would rebuild every page of the deployment that just shipped.',
  )
  log(`${label}: build id ${buildId} reaches the page and the client bundle`)
  return buildId
}

type Tarballs = Readonly<{ cli: string; foldkit: string; plugin: string }>

type DependencyMap = Readonly<Record<string, string>>

type PackageManifest = Readonly<{
  name?: string
  version?: string
  dependencies?: DependencyMap
  devDependencies?: DependencyMap
}>

const readManifest = (path: string): PackageManifest =>
  JSON.parse(readFileSync(path, 'utf8'))

// The `=` prefix marks the manifest as this gate's own copy, so a generated
// project carrying it proves the CLI read the directory under review instead of
// fetching the example from GitHub.
//
// NOTE: only npm accepts `=1.2.3` as a range. Deno installs and builds with it
// but `deno run` then refuses the built server with `Invalid package specifier
// 'npm:effect@=...'`, so the Deno leg gets a verbatim pin. Reading that
// directory is package-manager independent, and the npm leg above asserts it.
const prepareDependencyManifests = (
  workspaceDir: string,
): Readonly<Record<ScaffoldPackageManager, string>> => {
  const directories: Record<ScaffoldPackageManager, string> = {
    npm: join(workspaceDir, 'dependency-manifests/npm'),
    deno: join(workspaceDir, 'dependency-manifests/deno'),
  }

  for (const packageManager of ['npm', 'deno'] as const) {
    for (const rendering of ['ssr', 'ssg'] as const) {
      const source = readManifest(
        join(REPO_ROOT, 'examples', rendering, 'package.json'),
      )
      const effectSpec = source.dependencies?.['effect']
      assertScaffold(
        effectSpec !== undefined && EXACT_VERSION.test(effectSpec),
        `the ${rendering.toUpperCase()} example must pin effect to one exact ` +
          'version so the scaffold gate can distinguish its local manifest',
      )
      const manifest = {
        ...source,
        dependencies: {
          ...source.dependencies,
          effect: packageManager === 'npm' ? `=${effectSpec}` : effectSpec,
        },
      }
      const directory = join(directories[packageManager], rendering)
      mkdirSync(directory, { recursive: true })
      writeFileSync(
        join(directory, 'package.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      )
    }
  }

  return directories
}

// The packages a package manager deliberately rewrites, which the generic
// spec comparison below therefore cannot expect to find unchanged.
// `assertDenoDependencyAdjustments` asserts what replaced each one.
const rewrittenPackagesFor = (
  packageManager: ScaffoldPackageManager,
  rendering: 'ssr' | 'ssg',
): ReadonlyArray<string> => {
  if (packageManager !== 'deno') {
    return []
  }
  return rendering === 'ssr' ? ['@effect/platform-node'] : ['tsx']
}

const assertGeneratedDependencySpecs = (
  rendering: 'ssr' | 'ssg',
  projectDir: string,
  manifestDirectory: string,
  packageManager: ScaffoldPackageManager,
): void => {
  const source = readManifest(
    join(manifestDirectory, rendering, 'package.json'),
  )
  const generated = readManifest(join(projectDir, 'package.json'))
  const rewritten = rewrittenPackagesFor(packageManager, rendering)

  for (const field of ['dependencies', 'devDependencies'] as const) {
    const generatedDependencies = generated[field] ?? {}
    for (const [name, spec] of Object.entries(source[field] ?? {})) {
      if (spec.includes('workspace:') || rewritten.includes(name)) {
        continue
      }
      assertScaffold(
        generatedDependencies[name] === spec,
        `the generated ${rendering.toUpperCase()} ${field} resolved ${name} ` +
          `to ${JSON.stringify(generatedDependencies[name])}, but the local ` +
          `verification manifest declares ${JSON.stringify(spec)}. The packed ` +
          'CLI did not read the dependency manifest under review.',
      )
    }
  }
  log(
    `The generated ${PACKAGE_MANAGER_LABELS[packageManager]} ${rendering.toUpperCase()} dependency specs match the checkout-derived manifest`,
  )
}

// Deno resolves each npm package through a store under `node_modules/.deno`,
// with the project's `node_modules/<name>` a symlink into it and the package's
// own dependencies symlinked alongside it. Replacing the store entry's contents
// keeps that wiring, so `foldkit`'s peer `effect` still resolves to the one the
// project installed. Pointing a `file:` dependency at the tarball instead does
// not work: Deno symlinks `node_modules/foldkit` straight at the `.tgz` and
// exits 0, leaving an install that cannot resolve `foldkit/experimental`.
const denoStorePathFor = (projectDir: string, packageName: string): string => {
  const linkPath = join(projectDir, 'node_modules', packageName)
  if (!existsSync(linkPath)) {
    return fail(
      `the generated Deno project has no node_modules/${packageName}, so ` +
        'this gate cannot install the workspace build over it',
    )
  }
  return realpathSync(linkPath)
}

const extractTarballOver = (tarball: string, target: string): void => {
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  const result = spawnSync(
    'tar',
    ['xzf', tarball, '-C', target, '--strip-components=1'],
    { encoding: 'utf8', stdio: 'pipe' },
  )
  assertScaffold(
    result.status === 0,
    `extracting ${tarball} into ${target} failed:\n${result.stderr}`,
  )
}

// The CLI resolves `foldkit` and `@foldkit/vite-plugin` from the registry, so a
// generated project installs the published versions. The npm leg installs the
// tarballs over them with `npm install`; Deno has no equivalent for a local
// tarball, so the store entries are replaced directly. Without this the Deno
// leg would gate the last release rather than the one being prepared.
const installWorkspacePackagesIntoDenoProject = (
  projectDir: string,
  tarballs: Tarballs,
  rendering: 'ssr' | 'ssg',
): void => {
  const projectRoot = realpathSync(projectDir)
  const packages = [
    { name: 'foldkit', tarball: tarballs.foldkit, sourceDir: FOLDKIT_DIR },
    {
      name: '@foldkit/vite-plugin',
      tarball: tarballs.plugin,
      sourceDir: PLUGIN_DIR,
    },
  ] as const

  for (const { name, tarball, sourceDir } of packages) {
    const target = denoStorePathFor(projectDir, name)
    assertScaffold(
      target.startsWith(projectRoot),
      `${name} in the generated Deno project resolves to ${target}, outside ` +
        'the project. Replacing that would edit a shared cache rather than ' +
        'this run.',
    )
    extractTarballOver(tarball, target)

    const expected = readManifest(join(REPO_ROOT, sourceDir, 'package.json'))
    const installed = readManifest(join(target, 'package.json'))
    assertScaffold(
      installed.name === name && installed.version === expected.version,
      `after replacing the store entry, the generated Deno ` +
        `${rendering.toUpperCase()} project resolves ${name} to ` +
        `${String(installed.name)}@${String(installed.version)} instead of ` +
        `this checkout's ${name}@${String(expected.version)}`,
    )
  }

  log(
    `The generated Deno ${rendering.toUpperCase()} project resolves this workspace's foldkit and vite plugin`,
  )
}

// The CLI rewrites two dependencies for Deno. The ssr scaffold serves requests
// through `@effect/platform-deno`, so the Node platform package is replaced at
// the same pinned version. The ssg scaffold runs its prerender script under
// `deno run`, so it needs no `tsx`.
const assertDenoDependencyAdjustments = (
  rendering: 'ssr' | 'ssg',
  projectDir: string,
  manifestDirectory: string,
): void => {
  const source = readManifest(
    join(manifestDirectory, rendering, 'package.json'),
  )
  const generated = readManifest(join(projectDir, 'package.json'))
  const dependencies = generated.dependencies ?? {}
  const devDependencies = generated.devDependencies ?? {}

  if (rendering === 'ssr') {
    const nodeSpec = source.dependencies?.['@effect/platform-node']
    assertScaffold(
      nodeSpec !== undefined,
      'the SSR verification manifest no longer declares ' +
        '@effect/platform-node, so this assertion cannot tell whether the ' +
        'Deno swap happened',
    )
    assertScaffold(
      dependencies['@effect/platform-node'] === undefined,
      'the generated Deno SSR project still depends on ' +
        '@effect/platform-node, so it would serve requests through the Node ' +
        'HTTP platform',
    )
    assertScaffold(
      dependencies['@effect/platform-deno'] === nodeSpec,
      `the generated Deno SSR project declares @effect/platform-deno as ` +
        `${JSON.stringify(dependencies['@effect/platform-deno'])} instead of ` +
        `the ${JSON.stringify(nodeSpec)} its Node counterpart is pinned to`,
    )
  } else {
    assertScaffold(
      source.devDependencies?.['tsx'] !== undefined,
      'the SSG verification manifest no longer declares tsx, so this ' +
        'assertion cannot tell whether the Deno adjustment happened',
    )
    assertScaffold(
      devDependencies['tsx'] === undefined,
      'the generated Deno SSG project still depends on tsx, which nothing in ' +
        'a Deno build runs',
    )
  }

  log(
    `The generated Deno ${rendering.toUpperCase()} manifest carries the Deno dependency set`,
  )
}

// `templates/package-managers/<pm>/` and `templates/rendering/<mode>/` are both
// copied wholesale into a project, so a rendering overlay parked in either one
// is written into scaffolds it does not apply to. That shipped a server host
// into browser-only projects, which is why this asserts on the generated tree
// and not just on the template layout.
const assertDenoScaffoldShape = (
  rendering: 'ssr' | 'ssg',
  projectDir: string,
): void => {
  assertScaffold(
    existsSync(join(projectDir, 'deno.json')),
    `the generated Deno ${rendering.toUpperCase()} project has no deno.json`,
  )
  assertScaffold(
    !existsSync(join(projectDir, 'rendering')),
    `the generated Deno ${rendering.toUpperCase()} project contains a ` +
      'rendering/ directory, so a package-manager overlay was copied in as a ' +
      'literal path instead of over the files it replaces',
  )

  if (rendering === 'ssr') {
    const main = readFileSync(join(projectDir, 'server/main.ts'), 'utf8')
    assertScaffold(
      main.includes('@effect/platform-deno'),
      'the generated Deno SSR server/main.ts does not import ' +
        '@effect/platform-deno, so the Deno overlay did not replace the Node ' +
        'host',
    )
    assertScaffold(
      main.includes("from './handler'"),
      'the generated Deno SSR server/main.ts does not import its handler, so ' +
        'the overlay carries its own copy of the request rules and can drift ' +
        'from the host this gate probes on Node',
    )
  }

  log(
    `The generated Deno ${rendering.toUpperCase()} project has the Deno overlay and no stray template paths`,
  )
}

// `deno task build` spawns vite from inside build.mjs, where the package
// manager's PATH entry for node_modules/.bin is not inherited. Naming the shim
// by path keeps the build on the vite in package.json; a bare `npm:vite`
// specifier resolves to whatever the registry calls latest, which the lockfile
// records as `npm:vite@*`.
const assertDenoBuildUsedPinnedVite = (
  rendering: 'ssr' | 'ssg',
  projectDir: string,
): void => {
  const lock: Readonly<{ specifiers?: Readonly<Record<string, string>> }> =
    JSON.parse(readFileSync(join(projectDir, 'deno.lock'), 'utf8'))
  const unpinned = Object.keys(lock.specifiers ?? {}).filter(specifier =>
    specifier.startsWith('npm:vite@*'),
  )
  assertScaffold(
    Array_.isArrayEmpty(unpinned),
    `the generated Deno ${rendering.toUpperCase()} lockfile records ` +
      `${JSON.stringify(unpinned)}, so the build resolved vite from the ` +
      'registry instead of the version the project pins',
  )
  log(
    `The generated Deno ${rendering.toUpperCase()} build ran the vite the project pins`,
  )
}

const generateProject = (
  workspaceDir: string,
  rendering: 'ssr' | 'ssg',
  tarballs: Tarballs,
  manifestDirectory: string,
  packageManager: ScaffoldPackageManager,
): string => {
  const label = PACKAGE_MANAGER_LABELS[packageManager]
  const projectName = `my-${rendering}-${packageManager}-app`
  runRequired(
    `Generating a ${label} ${rendering.toUpperCase()} project...`,
    'node',
    [
      join(workspaceDir, 'node_modules/.bin/create-foldkit-app'),
      '--name',
      projectName,
      '--rendering',
      rendering,
      '--package-manager',
      packageManager,
    ],
    {
      cwd: workspaceDir,
      env: {
        [DEPENDENCY_MANIFESTS_DIRECTORY_ENV]: manifestDirectory,
      },
    },
  )

  const projectDir = join(workspaceDir, projectName)
  assertGeneratedDependencySpecs(
    rendering,
    projectDir,
    manifestDirectory,
    packageManager,
  )

  if (packageManager === 'deno') {
    assertDenoDependencyAdjustments(rendering, projectDir, manifestDirectory)
    assertDenoScaffoldShape(rendering, projectDir)
    installWorkspacePackagesIntoDenoProject(projectDir, tarballs, rendering)
    runRequired(
      `Typechecking the generated ${label} ${rendering.toUpperCase()} project...`,
      'deno',
      ['task', 'typecheck'],
      { cwd: projectDir, inherit: true },
    )
  } else {
    // NOTE: the CLI resolves `foldkit` and `@foldkit/vite-plugin` from the
    // registry, so a generated project installs the published versions rather
    // than this workspace's. Installing the tarballs over them is what makes
    // this a gate on the release being prepared instead of on the last one.
    // `--legacy-peer-deps` is needed only because the plugin's peer floor names
    // a version `changeset version` has not produced yet;
    // `check-peer-floors.ts` asserts that floor separately.
    runRequired(
      `Installing this workspace's packages into the ${label} ${rendering.toUpperCase()} project...`,
      'npm',
      [
        'install',
        '--no-audit',
        '--no-fund',
        '--legacy-peer-deps',
        tarballs.foldkit,
        tarballs.plugin,
      ],
      { cwd: projectDir },
    )
  }

  runRequired(
    `Building the ${label} ${rendering.toUpperCase()} project through its documented build command...`,
    packageManager,
    packageManager === 'deno' ? ['task', 'build'] : ['run', 'build'],
    { cwd: projectDir, inherit: true },
  )

  if (packageManager === 'deno') {
    assertDenoBuildUsedPinnedVite(rendering, projectDir)
  }

  return projectDir
}

const assertRejectsRelativeManifestDirectory = (workspaceDir: string): void => {
  const result = run(
    'node',
    [
      join(workspaceDir, 'node_modules/.bin/create-foldkit-app'),
      '--name',
      'invalid-manifest-source',
      '--rendering',
      'ssr',
      '--package-manager',
      'npm',
    ],
    {
      cwd: workspaceDir,
      env: { [DEPENDENCY_MANIFESTS_DIRECTORY_ENV]: 'relative/examples' },
    },
  )
  const output = `${result.stdout}${result.stderr}`
  assertScaffold(
    result.status !== 0 && output.includes('must be an absolute path'),
    'the packed CLI accepted a relative dependency manifest directory or ' +
      `failed without the expected diagnostic:\n${output}`,
  )
  log('The packed CLI refuses a relative dependency manifest directory')
}

const assertGeneratedHostPolicies = async (origin: string): Promise<void> => {
  const offOrigin = await askRaw(origin, '//evil.example/page', 'GET')
  assertScaffold(
    offOrigin.status === 400,
    `the generated SSR host answered an off-origin request target with ` +
      `${String(offOrigin.status)} instead of 400`,
  )

  const missingAsset = await fetch(`${origin}/assets/not-a-real-bundle.js`, {
    headers: { accept: '*/*' },
    signal: AbortSignal.timeout(HOST_REQUEST_TIMEOUT_MS),
  })
  const missingAssetBody = await missingAsset.text()
  assertScaffold(
    missingAsset.status === 404 &&
      !missingAssetBody.includes('data-foldkit-app'),
    'the generated SSR host answered a missing JavaScript asset with ' +
      `${String(missingAsset.status)} or an application shell`,
  )

  const options = await askRaw(origin, '/', 'OPTIONS', {
    origin: 'https://browser.example',
    'access-control-request-method': 'POST',
  })
  assertScaffold(
    options.status === 204 &&
      options.body === '' &&
      options.headers['allow'] === EXPECTED_ALLOW,
    'the generated SSR host did not forward OPTIONS to its entry: ' +
      JSON.stringify(options),
  )
  log(
    'The generated SSR host refuses off-origin targets and missing assets, and forwards OPTIONS',
  )
}

const checkSsrInBrowser = async (
  browser: PlaywrightBrowser,
  origin: string,
): Promise<void> => {
  const hydrated = await openHydratedPage(
    browser,
    `${origin}/deep/route`,
    "document.querySelectorAll('button')[1]",
    'The generated SSR application',
  )
  try {
    const initialCount = await hydrated.page.locator('#count').textContent()
    const provenance = await hydrated.page.locator('#provenance').textContent()
    assertScaffold(
      initialCount === '0' &&
        provenance?.includes('Rendered on the Server') === true,
      'the generated SSR deep route did not preserve its server-rendered state',
    )
    await hydrated.page.getByRole('button', { name: '+' }).click()
    await hydrated.page.waitForFunction(
      "document.querySelector('#count')?.textContent === '1' && document.title === 'Count 1'",
      undefined,
      { timeout: HYDRATION_TIMEOUT_MS },
    )
    assertNoBrowserDiagnostics(
      'The generated SSR application',
      hydrated.diagnostics,
    )
  } finally {
    await hydrated.page.close()
  }
  log('The generated SSR application hydrates in place and responds to input')
}

const checkSsgInBrowser = async (
  browser: PlaywrightBrowser,
  origin: string,
): Promise<void> => {
  const home = await openHydratedPage(
    browser,
    `${origin}/`,
    "document.querySelector('button')",
    'The generated SSG home page',
  )
  try {
    await home.page.getByRole('button', { name: 'Count: 0' }).click()
    await home.page.waitForFunction(
      "document.querySelector('button')?.textContent === 'Count: 1'",
      undefined,
      { timeout: HYDRATION_TIMEOUT_MS },
    )
    await home.page.getByRole('link', { name: 'About' }).click()
    await home.page.waitForFunction(
      "document.title === 'About | Foldkit App' && document.querySelector('#page-title')?.textContent === 'Statically generated about page'",
      undefined,
      { timeout: HYDRATION_TIMEOUT_MS },
    )
    assertScaffold(
      new URL(home.page.url()).pathname === '/about',
      `the generated SSG application navigated to ${home.page.url()} instead of /about`,
    )
    await home.page.getByRole('link', { name: 'Home' }).click()
    await home.page.waitForFunction(
      "document.title === 'Home | Foldkit App' && document.querySelector('button')?.textContent === 'Count: 1'",
      undefined,
      { timeout: HYDRATION_TIMEOUT_MS },
    )
    assertNoBrowserDiagnostics('The generated SSG home page', home.diagnostics)
  } finally {
    await home.page.close()
  }

  const about = await openHydratedPage(
    browser,
    `${origin}/about/`,
    "document.querySelector('#page-title')",
    'The generated SSG about page',
  )
  try {
    assertScaffold(
      (await about.page.locator('#page-title').textContent()) ===
        'Statically generated about page',
      'the generated SSG about file did not render its own route',
    )
    assertNoBrowserDiagnostics(
      'The generated SSG about page',
      about.diagnostics,
    )
  } finally {
    await about.page.close()
  }
  log(
    'The generated SSG pages hydrate in place and preserve state across navigation',
  )
}

const checkSsr = async (
  workspaceDir: string,
  tarballs: Tarballs,
  manifestDirectory: string,
  browser: PlaywrightBrowser,
  packageManager: ScaffoldPackageManager,
): Promise<void> => {
  const label = PACKAGE_MANAGER_LABELS[packageManager]
  const projectDir = generateProject(
    workspaceDir,
    'ssr',
    tarballs,
    manifestDirectory,
    packageManager,
  )

  const port = packageManager === 'deno' ? DENO_SSR_PORT : SSR_PORT
  const origin = `http://127.0.0.1:${String(port)}`
  const host = startHost(
    packageManager,
    packageManager === 'deno' ? ['task', 'start'] : ['run', 'start'],
    projectDir,
    port,
    { PORT: String(port), ORIGIN: origin },
  )
  try {
    const html = await fetchServedPage(host, origin)
    assertBuildIdReachesBothSides(
      `The generated ${label} SSR host`,
      html,
      join(projectDir, 'dist/client'),
    )
    await assertGeneratedHostPolicies(origin)
    await checkSsrInBrowser(browser, origin)
  } finally {
    await stopHost(host)
  }
}

const checkSsg = async (
  workspaceDir: string,
  tarballs: Tarballs,
  manifestDirectory: string,
  browser: PlaywrightBrowser,
  packageManager: ScaffoldPackageManager,
): Promise<void> => {
  const label = PACKAGE_MANAGER_LABELS[packageManager]
  const projectDir = generateProject(
    workspaceDir,
    'ssg',
    tarballs,
    manifestDirectory,
    packageManager,
  )
  const clientDir = join(projectDir, 'dist/client')

  const home = readFileSync(join(clientDir, 'index.html'), 'utf8')
  const homeBuildId = assertBuildIdReachesBothSides(
    `The generated ${label} SSG home page`,
    home,
    clientDir,
  )

  const about = readFileSync(join(clientDir, 'about/index.html'), 'utf8')
  const aboutBuildId = assertBuildIdReachesBothSides(
    `The generated ${label} SSG about page`,
    about,
    clientDir,
  )

  assertScaffold(
    homeBuildId === aboutBuildId,
    `two pages of one build carry different ids ("${homeBuildId}" and ` +
      `"${aboutBuildId}"), so the prerender step did not run under the id the ` +
      'client build was given.',
  )

  const port = packageManager === 'deno' ? DENO_SSG_PORT : SSG_PORT
  const origin = `http://127.0.0.1:${String(port)}`
  // NOTE: `deno task` forwards trailing arguments to the script as they are, so
  // a `--` separator would reach vite as a literal argument. npm needs it.
  const previewArgs = [
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ]
  const host = startHost(
    packageManager,
    packageManager === 'deno'
      ? ['task', 'preview', ...previewArgs]
      : ['run', 'preview', '--', ...previewArgs],
    projectDir,
    port,
  )
  try {
    await fetchServedPage(host, origin)
    await checkSsgInBrowser(browser, origin)
  } finally {
    await stopHost(host)
  }
}

const main = async (): Promise<void> => {
  const tarballPaths: Array<string> = []
  const workspaceDir = mkdtempSync(join(tmpdir(), 'foldkit-scaffold-ssr-'))
  log(`Workspace: ${workspaceDir}`)

  try {
    await assertPortIsFree(SSR_PORT)
    await assertPortIsFree(SSG_PORT)
    const manifestDirectories = prepareDependencyManifests(workspaceDir)

    const deno = denoVersion()
    if (deno === undefined && isDenoRequired) {
      fail(
        'deno is not on PATH and --require-deno was passed. The Deno leg is ' +
          'the only coverage of the generated deno.json, the deno task ' +
          'wiring, the @effect/platform-deno host, and the vite shim the ' +
          'build names by path.',
      )
    }
    if (deno === undefined) {
      log(
        'SKIPPING the Deno leg: deno is not on PATH. Not covered by this run: ' +
          'deno install, the Deno dependency swap, the Deno SSR host, and the ' +
          'Deno build. Install Deno to run it.',
      )
    } else {
      await assertPortIsFree(DENO_SSR_PORT)
      await assertPortIsFree(DENO_SSG_PORT)
      log(`Deno leg enabled (${deno})`)
    }

    if (!isSkipBuild) {
      runRequired(
        'Building the packages the generated projects install...',
        'pnpm',
        [
          '--filter',
          'create-foldkit-app',
          '--filter',
          'foldkit',
          '--filter',
          '@foldkit/vite-plugin',
          'build',
        ],
        { inherit: true },
      )
    }

    const tarballs: Tarballs = {
      cli: packPackage('Packing create-foldkit-app...', CLI_DIR),
      foldkit: packPackage('Packing foldkit...', FOLDKIT_DIR),
      plugin: packPackage('Packing @foldkit/vite-plugin...', PLUGIN_DIR),
    }
    tarballPaths.push(tarballs.cli, tarballs.foldkit, tarballs.plugin)

    runRequired(
      'Preparing the generation workspace...',
      'npm',
      ['init', '-y'],
      {
        cwd: workspaceDir,
      },
    )
    runRequired(
      'Installing the packed CLI...',
      'npm',
      ['install', '--no-audit', '--no-fund', tarballs.cli],
      { cwd: workspaceDir },
    )

    assertRejectsRelativeManifestDirectory(workspaceDir)
    const chromium = loadChromium()
    const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE']
    const browser = await chromium.launch(
      executablePath === undefined ? {} : { executablePath },
    )
    try {
      for (const packageManager of ['npm', 'deno'] as const) {
        if (packageManager === 'deno' && deno === undefined) {
          continue
        }
        await checkSsr(
          workspaceDir,
          tarballs,
          manifestDirectories[packageManager],
          browser,
          packageManager,
        )
        await checkSsg(
          workspaceDir,
          tarballs,
          manifestDirectories[packageManager],
          browser,
          packageManager,
        )
      }
    } finally {
      await browser.close()
    }
  } finally {
    log('Cleaning up...')
    rmSync(workspaceDir, { recursive: true, force: true })
    for (const path of tarballPaths) {
      rmSync(path, { force: true })
    }
  }

  log('PASS')
}

const messageFor = (error: unknown): string => {
  if (error instanceof ScaffoldCheckError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}

main().catch((error: unknown) => {
  console.error(`[scaffold-ssr] FAIL: ${messageFor(error)}`)
  process.exit(1)
})
