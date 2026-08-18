import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// NOTE: A direct website deployment is safe only when every package whose source the
// website bundles still matches the tag for the exact version in its manifest.
// Looking only at the current push is insufficient: a website-only follow-up
// could otherwise deploy package work left unpublished by an earlier push.
const PACKAGES = [
  { directory: 'packages/foldkit', name: 'foldkit' },
  { directory: 'packages/ui', name: '@foldkit/ui' },
  { directory: 'packages/devtools', name: '@foldkit/devtools' },
  { directory: 'packages/markdown', name: '@foldkit/markdown' },
  {
    directory: 'packages/vite-plugin-foldkit',
    name: '@foldkit/vite-plugin',
  },
]
const SHARED_PACKAGE_INPUTS = [
  '.npmrc',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
]

const TARGET = process.argv.at(2) ?? 'HEAD'

const git = args =>
  spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

const blockers = []
const tagCommits = []

const resolvedTarget = git(['rev-parse', '--verify', `${TARGET}^{commit}`])
if (resolvedTarget.status !== 0) {
  throw new Error(resolvedTarget.stderr.trim() || `could not resolve ${TARGET}`)
}
const head = git(['rev-parse', '--verify', 'HEAD^{commit}'])
if (head.status !== 0) {
  throw new Error(head.stderr.trim() || 'could not resolve HEAD')
}
if (resolvedTarget.stdout.trim() !== head.stdout.trim()) {
  blockers.push(`${TARGET} is not the checked-out latest deployment target`)
}
const remoteMain = git([
  'rev-parse',
  '--verify',
  'refs/remotes/origin/main^{commit}',
])
if (
  remoteMain.status === 0 &&
  resolvedTarget.stdout.trim() !== remoteMain.stdout.trim()
) {
  blockers.push(`${TARGET} is older than origin/main`)
}

for (const packageEntry of PACKAGES) {
  const manifest = JSON.parse(
    readFileSync(join(packageEntry.directory, 'package.json'), 'utf8'),
  )
  if (
    manifest.name !== packageEntry.name ||
    typeof manifest.version !== 'string'
  ) {
    throw new Error(
      `${packageEntry.directory}/package.json does not describe ${packageEntry.name}`,
    )
  }

  const tag = `${packageEntry.name}@${manifest.version}`
  const resolved = git(['rev-parse', '--verify', `refs/tags/${tag}^{commit}`])
  if (resolved.status !== 0) {
    blockers.push(`${tag} has no release tag`)
    continue
  }
  const tagCommit = resolved.stdout.trim()
  tagCommits.push(tagCommit)

  const ancestor = git(['merge-base', '--is-ancestor', tagCommit, TARGET])
  if (ancestor.status === 1) {
    blockers.push(`${tag} is not an ancestor of ${TARGET}`)
    continue
  }
  if (ancestor.status !== 0) {
    throw new Error(
      ancestor.stderr.trim() || `could not compare ${tag} to ${TARGET}`,
    )
  }

  const changed = git([
    'diff',
    '--quiet',
    tagCommit,
    TARGET,
    '--',
    packageEntry.directory,
  ])
  if (changed.status === 1) {
    blockers.push(
      `${packageEntry.directory} differs from its published tag ${tag}`,
    )
    continue
  }
  if (changed.status !== 0) {
    throw new Error(
      changed.stderr.trim() || `could not compare ${packageEntry.directory}`,
    )
  }
}

if (blockers.length === 0) {
  const latestPackageRelease = git(['rev-list', '-1', ...tagCommits])
  if (latestPackageRelease.status !== 0) {
    throw new Error(
      latestPackageRelease.stderr.trim() ||
        'could not identify the latest package release',
    )
  }
  const sharedInputsChanged = git([
    'diff',
    '--quiet',
    latestPackageRelease.stdout.trim(),
    TARGET,
    '--',
    ...SHARED_PACKAGE_INPUTS,
  ])
  if (sharedInputsChanged.status === 1) {
    blockers.push(
      'shared package build inputs differ from the latest package release',
    )
  } else if (sharedInputsChanged.status !== 0) {
    throw new Error(
      sharedInputsChanged.stderr.trim() ||
        'could not compare shared package build inputs',
    )
  }
}

for (const blocker of blockers) {
  console.error(`[website-deploy] ${blocker}`)
}
console.log(`deploy=${blockers.length === 0 ? 'true' : 'false'}`)
