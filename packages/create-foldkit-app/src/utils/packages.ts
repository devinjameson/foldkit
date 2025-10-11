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
      'effect@^3.18.2',
      '@tailwindcss/vite@^4.1.10',
      'tailwindcss@^4.1.10',
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
      '@foldkit/vite-plugin@0.2.0',
      'vite@^7.1.9',
      'typescript@^5.9.3',
      'prettier@^3.6.2',
      '@trivago/prettier-plugin-sort-imports@^5.2.2',
      'eslint@^9.37.0',
      '@eslint/js@^9.37.0',
      '@typescript-eslint/eslint-plugin@^8.45.0',
      '@typescript-eslint/parser@^8.45.0',
    ).pipe(
      Command.workingDirectory(projectPath),
      Command.stdout('inherit'),
      Command.stderr('inherit'),
    )
    yield* Command.exitCode(installDevDeps)
  })
