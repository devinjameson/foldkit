import { resolveChangedFiles } from './lib/changed-files.mjs'

const { changedFiles, isUnknownDiff } = resolveChangedFiles(
  process.argv.slice(2),
)

const hasChanged = ({ files = [], prefixes = [] }) =>
  isUnknownDiff ||
  changedFiles.some(
    fileName =>
      files.includes(fileName) ||
      prefixes.some(prefix => fileName.startsWith(prefix)),
  )

// NOTE: a workspace-wide change implies every application scope below. Root
// config such as tsconfig.base.json or .npmrc can break a bundle or an install
// while `tsc --noEmit` stays green, so the builds must not be skipped just
// because no package directory was touched.
const fullWorkspaceChecks = hasChanged({
  files: [
    '.github/workflows/ci.yml',
    '.npmrc',
    'examples/vite.aliases.ts',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/lib/changed-files.mjs',
    'scripts/plan-ci.mjs',
    'tsconfig.base.json',
  ],
})
const createFoldkitSmoke =
  fullWorkspaceChecks ||
  hasChanged({
    files: ['scripts/check-create-foldkit-app-smoke.ts'],
    prefixes: [
      'packages/create-foldkit-app/',
      'packages/oxlint-plugin-foldkit/',
    ],
  })
const typingGame =
  fullWorkspaceChecks ||
  hasChanged({
    prefixes: [
      'packages/typing-game/client/',
      'packages/typing-game/server/',
      'packages/typing-game/shared/',
      'packages/foldkit/',
      'packages/devtools/',
      'packages/vite-plugin-foldkit/',
    ],
  })
const website =
  fullWorkspaceChecks ||
  hasChanged({
    prefixes: [
      'packages/website/',
      'packages/foldkit/',
      'packages/ui/',
      'packages/devtools/',
      'packages/markdown/',
      'packages/vite-plugin-foldkit/',
    ],
  })
const workspacePackages = hasChanged({
  files: [
    '.github/workflows/ci.yml',
    '.npmrc',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/lib/changed-files.mjs',
    'scripts/plan-ci.mjs',
    'tsconfig.base.json',
  ],
  prefixes: ['comparisons/', 'examples/', 'internal/', 'packages/'],
})

process.stdout.write(`create_foldkit_smoke=${createFoldkitSmoke}\n`)
process.stdout.write(`typing_game=${typingGame}\n`)
process.stdout.write(`website=${website}\n`)
process.stdout.write(`full_workspace_checks=${fullWorkspaceChecks}\n`)
process.stdout.write(`workspace_packages=${workspacePackages}\n`)
