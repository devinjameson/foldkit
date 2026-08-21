import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'

import {
  CANARY_CHANNEL_PACKAGE,
  PUBLISHABLE_PACKAGES,
  orderPackageCanaryArtifacts,
  packageCanaryTag,
  preparePackageCanary,
  validatePackageCanary,
  validatePackedPackageCanary,
  validatePublishableWorkspace,
  validatePublishedPackageCanary,
  validateStableLatestTags,
  verifyCurrentCanaryCommit,
} from './package-canary.mjs'

const COMMIT = '0123456789abcdef0123456789abcdef01234567'
const VERSION = `0.0.0-canary-${COMMIT}-20260821213000`
const STABLE_VERSION = '0.148.2'

const packageNames = () => PUBLISHABLE_PACKAGES.map(({ name }) => name)

const manifests = () => packageNames().map(name => ({ name, version: VERSION }))

const workspacePackages = repositoryRoot => [
  {
    name: 'foldkit-monorepo',
    path: repositoryRoot,
    private: true,
  },
  ...PUBLISHABLE_PACKAGES.map(({ name, manifest }) => ({
    name,
    path: resolve(repositoryRoot, dirname(manifest)),
    private: false,
  })),
]

const registryPackages = () =>
  packageNames().map(name => ({
    name,
    tags: {
      latest: STABLE_VERSION,
      [packageCanaryTag(name, VERSION)]: VERSION,
    },
    versions: {
      [STABLE_VERSION]: {},
      [VERSION]: {},
    },
  }))

const git = (repositoryRoot, args) =>
  execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim()

test('the canary allowlist matches the public workspace', () => {
  const repositoryRoot = '/workspace/foldkit'

  assert.doesNotThrow(() =>
    validatePublishableWorkspace(
      repositoryRoot,
      workspacePackages(repositoryRoot),
    ),
  )
})

test('an unlisted public workspace package is rejected', () => {
  const repositoryRoot = '/workspace/foldkit'
  const packages = [
    ...workspacePackages(repositoryRoot),
    {
      name: '@foldkit/new-package',
      path: resolve(repositoryRoot, 'packages/new-package'),
      private: false,
    },
  ]

  assert.throws(
    () => validatePublishableWorkspace(repositoryRoot, packages),
    /Unexpected: @foldkit\/new-package/,
  )
})

test('prepare writes one temporary changeset for the complete package set', () => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'foldkit-canary-test-'))

  try {
    preparePackageCanary(repositoryRoot, workspacePackages(repositoryRoot))

    const changeset = readFileSync(
      resolve(repositoryRoot, '.changeset/foldkit-main-canary.md'),
      'utf8',
    )

    for (const name of packageNames()) {
      assert.match(changeset, new RegExp(`^'${name}': patch$`, 'm'))
    }
  } finally {
    rmSync(repositoryRoot, { recursive: true, force: true })
  }
})

test('a coherent package canary returns its shared version', () => {
  assert.equal(validatePackageCanary(COMMIT, manifests()), VERSION)
})

test('a package omitted from the canary is rejected', () => {
  assert.throws(
    () => validatePackageCanary(COMMIT, manifests().slice(1)),
    /does not include every published package/,
  )
})

test('a canary from another commit is rejected', () => {
  assert.throws(
    () => validatePackageCanary('f'.repeat(40), manifests()),
    /do not share a canary version/,
  )
})

test('mixed package canary versions are rejected', () => {
  const packageManifests = manifests()
  const finalManifest = packageManifests.at(-1)

  assert.ok(finalManifest !== undefined)

  finalManifest.version = `0.0.0-canary-${COMMIT}-20260821213001`

  assert.throws(
    () => validatePackageCanary(COMMIT, packageManifests),
    /do not share a canary version/,
  )
})

test('a stale packed internal canary dependency is rejected', () => {
  const packageManifests = manifests()
  const uiManifest = packageManifests.find(({ name }) => name === '@foldkit/ui')

  assert.ok(uiManifest !== undefined)

  uiManifest.peerDependencies = {
    foldkit: `0.0.0-canary-${COMMIT}-20260821212959`,
  }

  assert.throws(
    () => validatePackedPackageCanary(COMMIT, packageManifests),
    /not 0.0.0-canary/,
  )
})

test('a stable packed internal dependency is rejected', () => {
  const packageManifests = manifests()
  const uiManifest = packageManifests.find(({ name }) => name === '@foldkit/ui')

  assert.ok(uiManifest !== undefined)

  uiManifest.peerDependencies = { foldkit: '^0.5.0' }

  assert.throws(
    () => validatePackedPackageCanary(COMMIT, packageManifests),
    /not 0.0.0-canary/,
  )
})

test('a workspace protocol is rejected from packed packages', () => {
  const packageManifests = manifests()
  const uiManifest = packageManifests.find(({ name }) => name === '@foldkit/ui')

  assert.ok(uiManifest !== undefined)

  uiManifest.devDependencies = { '@private/build-helper': 'workspace:*' }

  assert.throws(
    () => validatePackedPackageCanary(COMMIT, packageManifests),
    /leaves @private\/build-helper at unsupported workspace:\*/,
  )
})

test('the source check allows workspace ranges that packing will resolve', () => {
  const packageManifests = manifests()
  const uiManifest = packageManifests.find(({ name }) => name === '@foldkit/ui')

  assert.ok(uiManifest !== undefined)

  uiManifest.devDependencies = { '@foldkit/vite-plugin': 'workspace:*' }

  assert.equal(validatePackageCanary(COMMIT, packageManifests), VERSION)
})

test('a stale main commit is refused', () => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'foldkit-canary-git-'))

  try {
    git(repositoryRoot, ['init'])
    git(repositoryRoot, ['config', 'user.name', 'Foldkit Test'])
    git(repositoryRoot, ['config', 'user.email', 'test@foldkit.dev'])

    const trackedFile = resolve(repositoryRoot, 'tracked.txt')
    writeFileSync(trackedFile, 'first\n')
    git(repositoryRoot, ['add', 'tracked.txt'])
    git(repositoryRoot, ['commit', '-m', 'first'])

    const staleCommit = git(repositoryRoot, ['rev-parse', 'HEAD'])

    writeFileSync(trackedFile, 'second\n')
    git(repositoryRoot, ['add', 'tracked.txt'])
    git(repositoryRoot, ['commit', '-m', 'second'])

    const currentCommit = git(repositoryRoot, ['rev-parse', 'HEAD'])

    git(repositoryRoot, [
      'update-ref',
      'refs/remotes/origin/main',
      currentCommit,
    ])

    assert.equal(
      verifyCurrentCanaryCommit(repositoryRoot, currentCommit, 'origin/main'),
      currentCommit,
    )
    assert.throws(
      () =>
        verifyCurrentCanaryCommit(repositoryRoot, staleCommit, 'origin/main'),
      /Refusing to publish stale canary/,
    )
  } finally {
    rmSync(repositoryRoot, { recursive: true, force: true })
  }
})

test('the moving canary channel publishes after immutable snapshots', () => {
  const artifacts = packageNames().map(name => ({
    packageManifest: { name },
  }))
  const orderedArtifacts = orderPackageCanaryArtifacts(artifacts)
  const channelArtifact = orderedArtifacts.at(-1)

  assert.equal(channelArtifact?.packageManifest.name, CANARY_CHANNEL_PACKAGE)

  for (const artifact of orderedArtifacts.slice(0, -1)) {
    assert.equal(
      packageCanaryTag(artifact.packageManifest.name, VERSION),
      VERSION.slice('0.0.0-'.length),
    )
  }

  assert.equal(packageCanaryTag(CANARY_CHANNEL_PACKAGE, VERSION), 'canary')
})

test('every package needs an existing stable latest version', () => {
  assert.doesNotThrow(() => validateStableLatestTags(registryPackages()))

  const packages = registryPackages()
  const foldkit = packages.find(({ name }) => name === 'foldkit')

  assert.ok(foldkit !== undefined)

  foldkit.tags = {}

  assert.throws(
    () => validateStableLatestTags(packages),
    /must have an existing stable latest version/,
  )
})

test('the advertised channel requires every exact package version', () => {
  assert.doesNotThrow(() =>
    validatePublishedPackageCanary(VERSION, registryPackages()),
  )

  const packages = registryPackages()
  const uiPackage = packages.find(({ name }) => name === '@foldkit/ui')

  assert.ok(uiPackage !== undefined)

  uiPackage.tags[packageCanaryTag('@foldkit/ui', VERSION)] = STABLE_VERSION

  assert.throws(
    () => validatePublishedPackageCanary(VERSION, packages),
    /does not point to/,
  )
})

test('the release workflow keeps stable and canary publication separate', () => {
  const repositoryRoot = resolve(import.meta.dirname, '..')

  const workflow = readFileSync(
    resolve(repositoryRoot, '.github/workflows/release.yml'),
    'utf8',
  )
  const rootPackage = JSON.parse(
    readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8'),
  )
  const changesetConfig = JSON.parse(
    readFileSync(resolve(repositoryRoot, '.changeset/config.json'), 'utf8'),
  )

  assert.equal(
    changesetConfig.snapshot.prereleaseTemplate,
    '{tag}-{commit}-{datetime}',
  )
  assert.equal(changesetConfig.snapshot.useCalculatedVersion, false)

  assert.equal(
    rootPackage.scripts['version-packages:canary'],
    'node scripts/package-canary.mjs prepare && changeset version --snapshot canary && pnpm install --no-frozen-lockfile',
  )
  assert.equal(
    rootPackage.scripts['release:canary'],
    'node scripts/package-canary.mjs publish "$FOLDKIT_CANARY_COMMIT" origin/main',
  )
  assert.equal(
    rootPackage.scripts.release,
    'pnpm check:peer-floors && pnpm build:packages && changeset publish',
  )

  assert.doesNotMatch(workflow, /^\s+paths:/m)

  const deployWebsiteIndex = workflow.indexOf('  deploy-website:')
  const publishCanaryIndex = workflow.indexOf('  publish-canary:')

  const deployWebsiteJob = workflow.slice(
    deployWebsiteIndex,
    publishCanaryIndex,
  )
  const publishCanaryJob = workflow.slice(publishCanaryIndex)

  assert.ok(deployWebsiteIndex >= 0)
  assert.ok(publishCanaryIndex > deployWebsiteIndex)
  assert.match(
    deployWebsiteJob,
    /needs: release\n\s+if: needs\.release\.outputs\.published == 'true'/,
  )
  assert.match(publishCanaryJob, /name: Publish package canaries/)
  assert.match(
    publishCanaryJob,
    /permissions:\n\s+contents: read\n\s+id-token: write/,
  )
  assert.match(
    publishCanaryJob,
    /needs: release\n\s+if: needs\.release\.outputs\.published != 'true'/,
  )
  assert.match(publishCanaryJob, /fetch-depth: 0/)
  assert.match(publishCanaryJob, /NPM_CONFIG_PROVENANCE: true/)
  assert.match(
    publishCanaryJob,
    /FOLDKIT_CANARY_COMMIT: \$\{\{ github\.sha \}\}/,
  )
  assert.match(
    publishCanaryJob,
    /git fetch --no-tags origin main:refs\/remotes\/origin\/main/,
  )
  assert.match(publishCanaryJob, /run: pnpm release:canary/)
  assert.doesNotMatch(publishCanaryJob, /changeset publish/)

  const prepareIndex = workflow.indexOf('Version package canaries')
  const verifySourceIndex = workflow.indexOf('Verify package canary versions')
  const buildIndex = workflow.indexOf('Build package canaries')
  const verifyPackedIndex = workflow.indexOf('Verify packed package canaries')
  const fetchMainIndex = workflow.indexOf('Fetch current main')
  const publishIndex = workflow.indexOf(
    'Publish package canaries',
    prepareIndex,
  )

  assert.ok(prepareIndex < verifySourceIndex)
  assert.ok(verifySourceIndex < buildIndex)
  assert.ok(buildIndex < verifyPackedIndex)
  assert.ok(verifyPackedIndex < fetchMainIndex)
  assert.ok(fetchMainIndex < publishIndex)
})
