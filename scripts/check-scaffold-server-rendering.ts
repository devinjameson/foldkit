import { spawn, spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
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
// page carries an id, and the client bundle carries the same one.
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
const BUILD_ID_ATTRIBUTE = /data-foldkit-build="([^"]*)"/

const isSkipBuild = process.argv.includes('--skip-build')

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
  dependencies?: DependencyMap
  devDependencies?: DependencyMap
}>

const readManifest = (path: string): PackageManifest =>
  JSON.parse(readFileSync(path, 'utf8'))

const prepareDependencyManifests = (workspaceDir: string): string => {
  const manifestDirectory = join(workspaceDir, 'dependency-manifests')

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
      dependencies: { ...source.dependencies, effect: `=${effectSpec}` },
    }
    const directory = join(manifestDirectory, rendering)
    mkdirSync(directory, { recursive: true })
    writeFileSync(
      join(directory, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
    )
  }

  return manifestDirectory
}

const assertGeneratedDependencySpecs = (
  rendering: 'ssr' | 'ssg',
  projectDir: string,
  manifestDirectory: string,
): void => {
  const source = readManifest(
    join(manifestDirectory, rendering, 'package.json'),
  )
  const generated = readManifest(join(projectDir, 'package.json'))

  for (const field of ['dependencies', 'devDependencies'] as const) {
    const generatedDependencies = generated[field] ?? {}
    for (const [name, spec] of Object.entries(source[field] ?? {})) {
      if (spec.includes('workspace:')) {
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
    `The generated ${rendering.toUpperCase()} dependency specs match the checkout-derived manifest`,
  )
}

const generateProject = (
  workspaceDir: string,
  rendering: 'ssr' | 'ssg',
  tarballs: Tarballs,
  manifestDirectory: string,
): string => {
  const projectName = `my-${rendering}-app`
  runRequired(
    `Generating a ${rendering.toUpperCase()} project...`,
    'node',
    [
      join(workspaceDir, 'node_modules/.bin/create-foldkit-app'),
      '--name',
      projectName,
      '--rendering',
      rendering,
      '--package-manager',
      'npm',
    ],
    {
      cwd: workspaceDir,
      env: {
        [DEPENDENCY_MANIFESTS_DIRECTORY_ENV]: manifestDirectory,
      },
    },
  )

  const projectDir = join(workspaceDir, projectName)
  assertGeneratedDependencySpecs(rendering, projectDir, manifestDirectory)

  // NOTE: the CLI resolves `foldkit` and `@foldkit/vite-plugin` from the
  // registry, so a generated project installs the published versions rather
  // than this workspace's. Installing the tarballs over them is what makes this
  // a gate on the release being prepared instead of on the last one.
  // `--legacy-peer-deps` is needed only because the plugin's peer floor names a
  // version `changeset version` has not produced yet; `check-peer-floors.ts`
  // asserts that floor separately.
  runRequired(
    `Installing this workspace's packages into the ${rendering.toUpperCase()} project...`,
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

  runRequired(
    `Building the ${rendering.toUpperCase()} project through its documented build command...`,
    'npm',
    ['run', 'build'],
    { cwd: projectDir, inherit: true },
  )

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

const fetchServedPage = async (origin: string): Promise<string> => {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(origin)
      assertScaffold(
        response.status === 200,
        `the generated SSR host answered ${response.status} for ${origin}`,
      )
      return await response.text()
    } catch (error) {
      if (error instanceof ScaffoldCheckError) {
        throw error
      }
      await new Promise(resolveWait => setTimeout(resolveWait, 250))
    }
  }
  return fail('the generated SSR host never accepted a connection')
}

const checkSsr = async (
  workspaceDir: string,
  tarballs: Tarballs,
  manifestDirectory: string,
): Promise<void> => {
  const projectDir = generateProject(
    workspaceDir,
    'ssr',
    tarballs,
    manifestDirectory,
  )

  const server = spawn('node', ['dist/server/main.js'], {
    cwd: projectDir,
    env: { ...process.env, PORT: String(SSR_PORT) },
    stdio: 'ignore',
  })
  try {
    const html = await fetchServedPage(`http://127.0.0.1:${SSR_PORT}/`)
    assertBuildIdReachesBothSides(
      'The generated SSR host',
      html,
      join(projectDir, 'dist/client'),
    )
  } finally {
    server.kill()
  }
}

const checkSsg = (
  workspaceDir: string,
  tarballs: Tarballs,
  manifestDirectory: string,
): void => {
  const projectDir = generateProject(
    workspaceDir,
    'ssg',
    tarballs,
    manifestDirectory,
  )
  const clientDir = join(projectDir, 'dist/client')

  const home = readFileSync(join(clientDir, 'index.html'), 'utf8')
  const homeBuildId = assertBuildIdReachesBothSides(
    'The generated SSG home page',
    home,
    clientDir,
  )

  const about = readFileSync(join(clientDir, 'about/index.html'), 'utf8')
  const aboutBuildId = assertBuildIdReachesBothSides(
    'The generated SSG about page',
    about,
    clientDir,
  )

  assertScaffold(
    homeBuildId === aboutBuildId,
    `two pages of one build carry different ids ("${homeBuildId}" and ` +
      `"${aboutBuildId}"), so the prerender step did not run under the id the ` +
      'client build was given.',
  )
}

const main = async (): Promise<void> => {
  const tarballPaths: Array<string> = []
  const workspaceDir = mkdtempSync(join(tmpdir(), 'foldkit-scaffold-ssr-'))
  log(`Workspace: ${workspaceDir}`)

  try {
    const manifestDirectory = prepareDependencyManifests(workspaceDir)

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
    await checkSsr(workspaceDir, tarballs, manifestDirectory)
    checkSsg(workspaceDir, tarballs, manifestDirectory)
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
