import { Command, FileSystem, Path } from '@effect/platform'
import chalk from 'chalk'
import { Console, Effect, Match } from 'effect'

import { createProject } from '../utils/files.js'
import { installDependencies } from '../utils/packages.js'

type PackageManager = 'pnpm' | 'npm' | 'yarn'
type Example =
  | 'counter'
  | 'form'
  | 'routing'
  | 'shopping-cart'
  | 'snake'
  | 'stopwatch'
  | 'todo'
  | 'weather'

type CreateOptions = {
  name: string
  example: Example
  packageManager: PackageManager
}

const validateProject = (name: string, projectPath: string, packageManager: PackageManager) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const exists = yield* fs.exists(projectPath)
    if (exists) {
      return yield* Effect.fail(`Directory ${name} already exists!`)
    }

    const checkCommand = Command.make('which', packageManager).pipe(
      Command.stdout('pipe'),
      Command.stderr('pipe'),
    )

    return yield* Command.exitCode(checkCommand).pipe(
      Effect.filterOrFail(
        (exitCode) => exitCode === 0,
        () => `Package manager '${packageManager}' is not available. Please install it first.`,
      ),
    )
  })

const setupProject = (name: string, projectPath: string, example: Example) =>
  Effect.gen(function* () {
    yield* Console.log(chalk.blue('🚀 Creating your Foldkit app...'))
    yield* Console.log('')

    yield* createProject(name, projectPath, example)

    yield* Console.log(chalk.green(`✅ Created project`))
    yield* Console.log('')
  })

const installProjectDependencies = (projectPath: string, packageManager: PackageManager) =>
  Effect.gen(function* () {
    yield* Console.log(chalk.blue(`📦 Installing dependencies with ${packageManager}...`))

    yield* installDependencies(projectPath, packageManager)

    yield* Console.log(chalk.green('✅ Dependencies installed'))
    yield* Console.log('')
  })

const runDevServerCommand = (packageManager: PackageManager) =>
  Match.value(packageManager).pipe(
    Match.when('pnpm', () => 'pnpm dev'),
    Match.when('npm', () => 'npm run dev'),
    Match.when('yarn', () => 'yarn dev'),
    Match.exhaustive,
  )

const displaySuccessMessage = (name: string, packageManager: PackageManager) =>
  Effect.gen(function* () {
    yield* Console.log(chalk.bold('🎉 Success! Your Foldkit app is ready.'))
    yield* Console.log('')
    yield* Console.log('Next steps:')
    yield* Console.log(`  ${chalk.cyan('cd')} ${name}`)
    yield* Console.log(`  ${chalk.cyan(runDevServerCommand(packageManager))}`)
    yield* Console.log('')
    yield* Console.log('Happy coding! 🎨')
  })

export const create = ({ name, example, packageManager }: CreateOptions) =>
  Effect.gen(function* () {
    const path = yield* Path.Path
    const projectPath = path.resolve(name)

    yield* validateProject(name, projectPath, packageManager)
    yield* setupProject(name, projectPath, example)
    yield* installProjectDependencies(projectPath, packageManager)
    yield* displaySuccessMessage(name, packageManager)

    return name
  })
