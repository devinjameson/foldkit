import { Command } from '@effect/platform'
import { Effect, Match, pipe } from 'effect'

type PackageManager = 'pnpm' | 'npm' | 'yarn'

const getInstallArgs = (packageManager: PackageManager, isDev = false): string[] =>
  pipe(
    Match.value(packageManager),
    Match.when('npm', () => ['install']),
    Match.when('yarn', () => ['add']),
    Match.when('pnpm', () => ['add']),
    Match.exhaustive,
    (args) => (isDev ? [...args, '-D'] : args),
  )

export const installDependencies = (projectPath: string, packageManager: PackageManager) =>
  Effect.gen(function* () {
    const installArgs = getInstallArgs(packageManager)
    const installDeps = Command.make(
      packageManager,
      ...installArgs,
      'foldkit',
      'effect',
      '@effect/platform',
      '@effect/platform-browser',
    ).pipe(
      Command.workingDirectory(projectPath),
      Command.stdout('inherit'),
      Command.stderr('inherit'),
    )
    yield* Command.exitCode(installDeps)

    const installDevArgs = getInstallArgs(packageManager, true)
    const installDevDeps = Command.make(
      packageManager,
      ...installDevArgs,
      'vite',
      'typescript',
      '@tailwindcss/vite',
      'tailwindcss',
      '@trivago/prettier-plugin-sort-imports',
      'prettier',
    ).pipe(
      Command.workingDirectory(projectPath),
      Command.stdout('inherit'),
      Command.stderr('inherit'),
    )
    yield* Command.exitCode(installDevDeps)
  })
