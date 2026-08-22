import {
  Array,
  Data,
  Effect,
  FileSystem,
  Match,
  Option,
  Order,
  Path,
  Record,
  Result,
  Schema,
  pipe,
} from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { spawn } from 'node:child_process'

import { type Scaffold } from '../rendering.js'

export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun' | 'deno'

export const installCommand = (packageManager: PackageManager): string =>
  `${packageManager} install`

const DEV_COMMANDS: Record<PackageManager, string> = {
  pnpm: 'pnpm dev',
  npm: 'npm run dev',
  yarn: 'yarn dev',
  bun: 'bun dev',
  deno: 'deno task dev',
}

export const devCommand = (packageManager: PackageManager): string =>
  DEV_COMMANDS[packageManager]

const RUN_SCRIPT_PREFIXES: Record<PackageManager, string> = {
  pnpm: 'pnpm',
  npm: 'npm run',
  yarn: 'yarn',
  bun: 'bun run',
  deno: 'deno task',
}

export const runScriptCommand = (
  packageManager: PackageManager,
  script: string,
): string => `${RUN_SCRIPT_PREFIXES[packageManager]} ${script}`

const RUNTIME_COMMANDS: Record<PackageManager, string> = {
  pnpm: 'node',
  npm: 'node',
  yarn: 'node',
  bun: 'node',
  deno: 'deno run -A',
}

/**
 * The command a scaffold's `build`/`start` scripts use to run a plain
 * JavaScript entry point, such as `scripts/build.mjs` or the built server
 * bundle. Every package manager but Deno shells out to `node`; Deno runs the
 * file itself under `deno run -A`.
 */
export const runtimeCommand = (packageManager: PackageManager): string =>
  RUNTIME_COMMANDS[packageManager]

const INSTALL_ARGS: Record<PackageManager, ReadonlyArray<string>> = {
  pnpm: ['install'],
  npm: ['install'],
  yarn: ['install'],
  bun: ['install'],
  deno: ['install', '--min-dep-age=0'],
}

/**
 * The arguments the scaffold's own dependency install runs with.
 *
 * Deno refuses an npm package published in the last 24 hours by default, and
 * the versions written just above came from the registry's `latest` tag, so a
 * Foldkit release earlier the same day would leave `deno install` with no
 * version that satisfies the manifest and it would fail outright. Waiving the
 * age check covers this one install; the generated project keeps Deno's default
 * for anything installed later, and the lockfile this writes means a plain
 * `deno install` resolves nothing again.
 */
export const installArgs = (
  packageManager: PackageManager,
): ReadonlyArray<string> => INSTALL_ARGS[packageManager]

const GITHUB_RAW_BASE_URL =
  'https://raw.githubusercontent.com/foldkit/foldkit/main/examples'

const NPM_REGISTRY_BASE_URL = 'https://registry.npmjs.org'

const FOLDKIT_SCOPE_PREFIX = '@foldkit/'

const isWindows = process.platform === 'win32'

const StringRecord = Schema.Record(Schema.String, Schema.String)

const PackageJson = Schema.Struct({
  dependencies: StringRecord.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({})),
  ),
  devDependencies: StringRecord.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({})),
  ),
})

const ProjectPackageJson = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  type: Schema.String,
  scripts: StringRecord,
})

const NpmPackument = Schema.Struct({
  version: Schema.String,
})

const TEMPLATE_DEV_DEPENDENCIES = [
  '@foldkit/devtools',
  '@foldkit/vite-plugin',
  '@foldkit/devtools-mcp',
  '@foldkit/oxlint-plugin',
  '@trivago/prettier-plugin-sort-imports',
  'happy-dom',
  'oxlint',
  'prettier',
  'vitest',
]

const SERVER_RENDERING_DEV_DEPENDENCIES = ['@types/node']

const isFoldkitPackage = (name: string): boolean =>
  name === 'foldkit' || name.startsWith(FOLDKIT_SCOPE_PREFIX)

type UnresolvedSpec = Data.TaggedEnum<{
  Keep: { readonly version: string }
  Latest: {}
}>

const UnresolvedSpec = Data.taggedEnum<UnresolvedSpec>()
const { Keep, Latest } = UnresolvedSpec

const toUnresolvedSpec = (
  spec: string,
  name: string,
): Result.Result<UnresolvedSpec, void> => {
  if (spec.includes('workspace:')) {
    return isFoldkitPackage(name) ? Result.succeed(Latest()) : Result.failVoid
  } else {
    return Result.succeed(Keep({ version: spec }))
  }
}

/**
 * Build the runtime dependency map for a scaffolded project from an example's
 * raw `dependencies`. Concrete versions are kept, Foldkit monorepo packages are
 * marked for latest-version resolution, and any other workspace packages (which
 * are not published) are dropped.
 */
export const buildUnresolvedDeps = (
  exampleDeps: Record<string, string>,
): Record<string, UnresolvedSpec> =>
  Record.filterMap(exampleDeps, toUnresolvedSpec)

/**
 * Build the devDependency map for a scaffolded project by merging the always-on
 * template tooling and any extra scaffold devDependencies with the example's
 * own `devDependencies`. A concrete version from the example wins over a
 * latest marker for the same package.
 */
export const buildUnresolvedDevDeps = (
  exampleDevDeps: Record<string, string>,
  extraDevDependencies: ReadonlyArray<string>,
): Record<string, UnresolvedSpec> => {
  const templateSpecs = Record.fromIterableWith(
    [...TEMPLATE_DEV_DEPENDENCIES, ...extraDevDependencies],
    name => [name, Latest()],
  )
  const exampleSpecs = Record.filterMap(exampleDevDeps, toUnresolvedSpec)
  return Record.union(
    templateSpecs,
    exampleSpecs,
    (_templateSpec, exampleSpec) => exampleSpec,
  )
}

const PLATFORM_NODE_PACKAGE = '@effect/platform-node'
const PLATFORM_DENO_PACKAGE = '@effect/platform-deno'
const TSX_PACKAGE = 'tsx'

/**
 * Swap the ssr scaffold's Node HTTP platform dependency for the Deno one when
 * scaffolding onto Deno. The reference example that supplies dependency
 * versions is Node-only, so this runs after resolution reads it, reusing the
 * same pinned version since the two packages release in lockstep.
 */
export const adjustDependenciesForPackageManager = (
  scaffold: Scaffold,
  packageManager: PackageManager,
  dependencies: Record<string, UnresolvedSpec>,
): Record<string, UnresolvedSpec> => {
  const swapPlatformPackage = () =>
    Option.match(Record.pop(dependencies, PLATFORM_NODE_PACKAGE), {
      onNone: () => dependencies,
      onSome: ([spec, remainder]) =>
        Record.set(remainder, PLATFORM_DENO_PACKAGE, spec),
    })

  return Match.value(scaffold).pipe(
    Match.withReturnType<Record<string, UnresolvedSpec>>(),
    Match.tagsExhaustive({
      Spa: () => dependencies,
      Ssg: () => dependencies,
      Ssr: () =>
        packageManager === 'deno' ? swapPlatformPackage() : dependencies,
    }),
  )
}

/**
 * Drop the ssg scaffold's `tsx` devDependency when scaffolding onto Deno.
 * `build.mjs` runs `prerender.ts` directly under `deno run` there, so no
 * separate TypeScript executor is needed.
 */
export const adjustDevDependenciesForPackageManager = (
  scaffold: Scaffold,
  packageManager: PackageManager,
  devDependencies: Record<string, UnresolvedSpec>,
): Record<string, UnresolvedSpec> =>
  Match.value(scaffold).pipe(
    Match.withReturnType<Record<string, UnresolvedSpec>>(),
    Match.tagsExhaustive({
      Spa: () => devDependencies,
      Ssr: () => devDependencies,
      Ssg: () =>
        packageManager === 'deno'
          ? Record.remove(devDependencies, TSX_PACKAGE)
          : devDependencies,
    }),
  )

/**
 * The repo example whose `package.json` supplies a scaffold's dependency
 * versions. An SPA scaffold reads from its chosen starter example; the SSG and
 * SSR scaffolds read from the reference apps their overlay files mirror.
 */
export const dependencyExample = (scaffold: Scaffold): string =>
  Match.value(scaffold).pipe(
    Match.tagsExhaustive({
      Spa: ({ example }) => example,
      Ssg: () => 'ssg',
      Ssr: () => 'ssr',
    }),
  )

/**
 * The devDependencies a scaffold needs beyond the template tooling and the
 * example's own list. The server-rendered scaffolds ship Node build and host
 * scripts, so they need `@types/node` to typecheck.
 */
export const scaffoldDevDependencies = (
  scaffold: Scaffold,
): ReadonlyArray<string> =>
  Match.value(scaffold).pipe(
    Match.tagsExhaustive({
      Spa: () => [],
      Ssg: () => SERVER_RENDERING_DEV_DEPENDENCIES,
      Ssr: () => SERVER_RENDERING_DEV_DEPENDENCIES,
    }),
  )

const resolveLatestVersion = (name: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const encodedName = name.replace('/', '%2F')
    const url = `${NPM_REGISTRY_BASE_URL}/${encodedName}/latest`
    const response = yield* client.execute(HttpClientRequest.get(url))
    const json = yield* response.json
    const packument = yield* Schema.decodeUnknownEffect(NpmPackument)(json)
    return `^${packument.version}`
  })

const resolveEntry = (name: string, spec: UnresolvedSpec) =>
  Match.value(spec).pipe(
    Match.tagsExhaustive({
      Keep: ({ version }) => Effect.succeed([name, version] as const),
      Latest: () =>
        Effect.map(
          resolveLatestVersion(name),
          version => [name, version] as const,
        ),
    }),
  )

const resolveSpecs = (unresolved: Record<string, UnresolvedSpec>) =>
  Effect.gen(function* () {
    const entries = Record.toEntries(unresolved)
    const resolved = yield* Effect.forEach(
      entries,
      ([name, spec]) => resolveEntry(name, spec),
      { concurrency: 'unbounded' },
    )
    return Record.fromEntries(resolved)
  })

const byPackageName = Order.mapInput(
  Order.String,
  ([name]: readonly [string, string]) => name,
)

const sortDependencies = (
  dependencies: Record<string, string>,
): Record<string, string> =>
  pipe(
    dependencies,
    Record.toEntries,
    Array.sort(byPackageName),
    Record.fromEntries,
  )

const fetchExamplePackageJson = (example: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const url = `${GITHUB_RAW_BASE_URL}/${example}/package.json`
    const response = yield* client.execute(HttpClientRequest.get(url))
    const json = yield* response.json
    return yield* Schema.decodeUnknownEffect(PackageJson)(json)
  })

const readExamplePackageJson = (
  example: string,
  maybeDependencyManifestsDirectory: Option.Option<string>,
) =>
  Option.match(maybeDependencyManifestsDirectory, {
    onNone: () => fetchExamplePackageJson(example),
    onSome: directory =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const content = yield* fs.readFileString(
          path.join(directory, example, 'package.json'),
        )
        return yield* Schema.decodeUnknownEffect(PackageJson)(
          JSON.parse(content),
        )
      }),
  })

const writeManifest = (
  projectPath: string,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    const packageJsonPath = path.join(projectPath, 'package.json')
    const content = yield* fs.readFileString(packageJsonPath)
    const packageJson = yield* Schema.decodeUnknownEffect(ProjectPackageJson)(
      JSON.parse(content),
    )

    const updated = {
      ...packageJson,
      dependencies,
      devDependencies,
    }

    yield* fs.writeFileString(
      packageJsonPath,
      `${JSON.stringify(updated, null, 2)}\n`,
    )
  })

const runCommand = (
  command: string,
  args: ReadonlyArray<string>,
  cwd: string,
): Effect.Effect<void, Error> =>
  Effect.callback<void, Error>(
    (resume: (effect: Effect.Effect<void, Error>) => void) => {
      const child = spawn(command, [...args], {
        cwd,
        shell: isWindows,
        stdio: 'inherit',
      })
      child.on('error', error => resume(Effect.fail(error)))
      child.on('exit', code => {
        if (code === 0) {
          resume(Effect.void)
        } else {
          resume(Effect.fail(new Error(`${command} exited with code ${code}`)))
        }
      })
      // NOTE: SIGTERM only — the Effect.callback finalizer is sync so we
      // can't escalate to SIGKILL. On Windows with shell:true the signal
      // hits cmd.exe but doesn't propagate to the package manager.
      return Effect.sync(() => {
        if (child.exitCode === null && !child.killed) {
          child.kill()
        }
      })
    },
  )

export const installDependencies = (
  projectPath: string,
  packageManager: PackageManager,
  scaffold: Scaffold,
  maybeDependencyManifestsDirectory: Option.Option<string>,
) =>
  Effect.gen(function* () {
    const examplePackageJson = yield* readExamplePackageJson(
      dependencyExample(scaffold),
      maybeDependencyManifestsDirectory,
    )

    const dependencies = yield* resolveSpecs(
      adjustDependenciesForPackageManager(
        scaffold,
        packageManager,
        buildUnresolvedDeps(examplePackageJson.dependencies),
      ),
    )
    const devDependencies = yield* resolveSpecs(
      adjustDevDependenciesForPackageManager(
        scaffold,
        packageManager,
        buildUnresolvedDevDeps(
          examplePackageJson.devDependencies,
          scaffoldDevDependencies(scaffold),
        ),
      ),
    )

    yield* writeManifest(
      projectPath,
      sortDependencies(dependencies),
      sortDependencies(devDependencies),
    )

    yield* runCommand(packageManager, installArgs(packageManager), projectPath)
  })
