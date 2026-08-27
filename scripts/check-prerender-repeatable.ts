import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const REPO_DIR = resolve(import.meta.dirname, '..')
const EXAMPLE_DIR = resolve(REPO_DIR, 'examples/ssg')
const CLIENT_DIR = resolve(EXAMPLE_DIR, 'dist/client')
const DIST_DIR = resolve(EXAMPLE_DIR, 'dist')
const CACHE_DIR = resolve(EXAMPLE_DIR, 'node_modules/.cache')
const INDEX_PATH = resolve(CLIENT_DIR, 'index.html')
const BUILD_ID = 'prerender-repeatable-gate'
const HYDRATION_STAMP_PATTERN = /\sdata-foldkit-[a-z-]+="[^"]*"/g
const HYDRATION_STAMP_PREFIX = 'data-foldkit-'

class PrerenderRepeatableError extends Error {}

const log = (message: string): void => {
  console.log(`[prerender-repeatable] ${message}`)
}

const fail = (message: string): never => {
  throw new PrerenderRepeatableError(message)
}

const runRequired = (
  label: string,
  command: string,
  args: ReadonlyArray<string>,
): void => {
  log(label)
  const result = spawnSync(command, args, {
    cwd: EXAMPLE_DIR,
    stdio: 'inherit',
    env: { ...process.env, FOLDKIT_BUILD_ID: BUILD_ID },
  })

  if (result.error !== undefined) {
    return fail(`${command} ${args.join(' ')} failed: ${result.error.message}`)
  }
  if (result.status !== 0) {
    return fail(`${command} ${args.join(' ')} exited ${String(result.status)}`)
  }
}

const prerender = (label: string): void => {
  runRequired(label, 'pnpm', ['exec', 'tsx', 'scripts/prerender.ts'])
}

// NOTE: the cached template copy is the mechanism under test, and the build is
// byte-identical between runs because the build id is pinned, so a copy left by
// an earlier invocation is indistinguishable from the one the first run is
// supposed to write. The whole cache directory goes rather than the one path
// the prerender script names today, which the example is free to rename.
const clearPriorState = (): void => {
  rmSync(DIST_DIR, { recursive: true, force: true })
  rmSync(CACHE_DIR, { recursive: true, force: true })
}

const readClientFiles = (): Readonly<Record<string, Buffer>> => {
  const entries = readdirSync(CLIENT_DIR, {
    recursive: true,
    withFileTypes: true,
  })
  const files: Record<string, Buffer> = {}

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const filePath = join(entry.parentPath, entry.name)
    files[relative(CLIENT_DIR, filePath)] = readFileSync(filePath)
  }

  return files
}

// The prerender writes the generated `/` over the `index.html` the client build
// left its template in, so that file changing is proof the step ran. Comparing
// against the built template rather than testing for a placeholder literal
// keeps this working when the example renames its container. Without it a
// prerender that generates nothing compares untouched build output with itself
// and agrees.
const assertPrerenderRan = (builtTemplate: Buffer): void => {
  if (readFileSync(INDEX_PATH).equals(builtTemplate)) {
    return fail(
      `"${INDEX_PATH}" is unchanged from the client build, so the prerender generated no page over it`,
    )
  }
}

const assertCachedTemplate = (): void => {
  const cached = readdirSync(CACHE_DIR, {
    recursive: true,
    withFileTypes: true,
  })

  if (!cached.some(entry => entry.isFile())) {
    return fail(
      `"${CACHE_DIR}" holds no cached template after the first prerender, so a re-run has nothing to read back`,
    )
  }
}

const assertSameFiles = (
  label: string,
  before: Readonly<Record<string, Buffer>>,
  after: Readonly<Record<string, Buffer>>,
): void => {
  const paths = [...new Set([...Object.keys(before), ...Object.keys(after)])]

  for (const path of paths.sort()) {
    const first = before[path]
    const second = after[path]

    if (first === undefined) {
      return fail(`${label}: "${path}" appeared only after the re-run`)
    }
    if (second === undefined) {
      return fail(`${label}: "${path}" stopped being written by the re-run`)
    }
    if (!first.equals(second)) {
      return fail(`${label}: "${path}" differs between runs`)
    }
  }

  log(`${label}: ${String(paths.length)} build files match`)
}

// A static render carries none of the hydration stamps, so a guard reading any
// of them mistakes a generated page for a template. Stripping every
// `data-foldkit-` attribute rather than a named list models that render without
// a second build and keeps covering a stamp the renderer adds later.
const stripHydrationStamps = (): void => {
  const generated = readFileSync(INDEX_PATH, 'utf8')
  const stripped = generated.replaceAll(HYDRATION_STAMP_PATTERN, '')

  if (stripped === generated) {
    return fail(
      `"${INDEX_PATH}" carries no ${HYDRATION_STAMP_PREFIX} attribute to strip, so this step no longer models a static render`,
    )
  }

  if (stripped.includes(HYDRATION_STAMP_PREFIX)) {
    return fail(
      `a ${HYDRATION_STAMP_PREFIX} attribute survived stripping in "${INDEX_PATH}", so this step no longer models a static render`,
    )
  }

  writeFileSync(INDEX_PATH, stripped, 'utf8')
}

const main = (): void => {
  clearPriorState()

  runRequired('Building the client', 'pnpm', [
    'exec',
    'vite',
    'build',
    '--outDir',
    'dist/client',
  ])
  runRequired('Building the server entry', 'pnpm', [
    'exec',
    'vite',
    'build',
    '--ssr',
    'src/entry.server.ts',
    '--outDir',
    'dist/server',
  ])

  const builtTemplate = readFileSync(INDEX_PATH)

  prerender('Prerendering against a fresh client build')
  assertPrerenderRan(builtTemplate)
  assertCachedTemplate()
  const firstRun = readClientFiles()

  prerender('Prerendering again against the same client build')
  assertSameFiles(
    're-run against one client build',
    firstRun,
    readClientFiles(),
  )

  stripHydrationStamps()
  prerender('Prerendering again with the hydration stamps stripped')
  assertSameFiles('re-run against static output', firstRun, readClientFiles())

  log('PASS')
}

try {
  main()
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[prerender-repeatable] FAIL ${message}`)
  process.exitCode = 1
}
