import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  assertArtifactsMatchPackages,
  assertPackagesAlreadyExist,
  canaryVersion,
  packagesForChannel,
  packagesToUpload,
  promoteSnapshot,
  uploadArtifacts,
  uploadPlannedArtifacts,
  uploadTag,
  verifyRegistrySnapshot,
} from './coherent-release.mjs'

const packageFor = (name, version, extra = {}) => ({
  packageJson: { name, version, ...extra },
})

const artifactFor = (name, version) => ({
  name,
  version,
  integrity: `sha512-${name}-${version}`,
})

class FakeRegistry {
  constructor(packages) {
    this.packuments = new Map()
    this.versions = new Map()

    for (const pkg of packages) {
      this.packuments.set(pkg.packageJson.name, {
        name: pkg.packageJson.name,
        'dist-tags': {},
      })
    }
  }

  key(name, version) {
    return `${name}@${version}`
  }

  async packument(name) {
    return this.packuments.get(name)
  }

  async version(name, version) {
    return this.versions.get(this.key(name, version))
  }

  add(artifact, extra = {}) {
    this.versions.set(this.key(artifact.name, artifact.version), {
      name: artifact.name,
      version: artifact.version,
      dist: { integrity: artifact.integrity },
      ...extra,
    })
  }
}

test('a partial upload retries without republishing completed versions', async () => {
  const packages = [
    packageFor('foldkit', '1.0.0'),
    packageFor('@foldkit/ui', '1.0.0'),
  ]
  const artifacts = packages.map(pkg =>
    artifactFor(pkg.packageJson.name, pkg.packageJson.version),
  )
  const registry = new FakeRegistry(packages)
  const attempts = []

  await assert.rejects(
    uploadArtifacts({
      artifacts,
      registry,
      publish: async artifact => {
        attempts.push(artifact.name)
        if (artifact.name === '@foldkit/ui') {
          throw new Error('simulated registry failure')
        }
        registry.add(artifact)
      },
      attempts: 1,
      delayMilliseconds: 0,
    }),
    /simulated registry failure/,
  )

  const retry = await uploadArtifacts({
    artifacts,
    registry,
    publish: async artifact => {
      attempts.push(artifact.name)
      registry.add(artifact)
    },
    attempts: 1,
    delayMilliseconds: 0,
  })

  assert.deepEqual(attempts, ['foldkit', '@foldkit/ui', '@foldkit/ui'])
  assert.deepEqual(retry.published, ['@foldkit/ui'])
  assert.deepEqual(retry.skipped, ['foldkit'])
})

test('stable planning uploads only untagged or missing registry versions', () => {
  const packages = [
    packageFor('foldkit', '1.0.0'),
    packageFor('@foldkit/ui', '1.0.0'),
    packageFor('@foldkit/devtools', '1.0.0'),
  ]
  const planned = packagesToUpload({
    packages: packagesForChannel(packages, 'stable', 'unused'),
    channel: 'stable',
    knownTags: new Set(['foldkit@1.0.0', '@foldkit/ui@1.0.0']),
    metadataByName: new Map([
      ['foldkit', { version: '1.0.0' }],
      ['@foldkit/ui', undefined],
      ['@foldkit/devtools', undefined],
    ]),
  })

  assert.deepEqual(
    planned.map(pkg => pkg.packageJson.name),
    ['@foldkit/ui', '@foldkit/devtools'],
  )
})

test('a retry rejects an existing version with different bytes', async () => {
  const packages = [packageFor('foldkit', '1.0.0')]
  const registry = new FakeRegistry(packages)
  const artifact = artifactFor('foldkit', '1.0.0')
  registry.add({ ...artifact, integrity: 'sha512-different' })

  await assert.rejects(
    uploadArtifacts({
      artifacts: [artifact],
      registry,
      publish: async () => assert.fail('publish should not run'),
    }),
    /does not match the packed artifact/,
  )
})

test('registry verification covers the complete internal dependency graph', async () => {
  const packages = [
    packageFor('foldkit', '1.2.3'),
    packageFor('@foldkit/ui', '1.2.3'),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('foldkit', '1.2.3'))
  registry.add(artifactFor('@foldkit/ui', '1.2.3'), {
    peerDependencies: { foldkit: '^1.2.0' },
  })

  await verifyRegistrySnapshot(packages, registry)

  registry.versions.get('@foldkit/ui@1.2.3').peerDependencies.foldkit = '^2.0.0'
  await assert.rejects(
    verifyRegistrySnapshot(packages, registry),
    /does not accept 1.2.3/,
  )
  registry.versions.delete('foldkit@1.2.3')
  await assert.rejects(
    verifyRegistrySnapshot(packages, registry),
    /registry is missing foldkit@1.2.3/,
  )
})

test('registry verification derives internal package names from the release set', async () => {
  const packages = [
    packageFor('public-core', '1.0.0'),
    packageFor('public-consumer', '1.0.0'),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('public-core', '1.0.0'))
  registry.add(artifactFor('public-consumer', '1.0.0'), {
    dependencies: { 'public-core': '^2.0.0' },
  })

  await assert.rejects(
    verifyRegistrySnapshot(packages, registry),
    /does not accept 1.0.0/,
  )
})

test('registry verification rejects any workspace dependency outside the public snapshot', async () => {
  const packages = [packageFor('public-consumer', '1.0.0')]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('public-consumer', '1.0.0'), {
    dependencies: { 'private-helper': 'workspace:*' },
  })

  await assert.rejects(
    verifyRegistrySnapshot(
      packages,
      registry,
      new Set(['public-consumer', 'private-helper']),
    ),
    /references private-helper outside the coherent public package set/,
  )
})

test('an artifact mismatch stops before the first publication', async () => {
  const packages = [packageFor('foldkit', '1.0.0')]
  const registry = new FakeRegistry(packages)
  const attempted = []

  await assert.rejects(
    () =>
      uploadPlannedArtifacts({
        artifacts: [
          {
            ...artifactFor('unexpected-package', '1.0.0'),
            packageJson: {
              name: 'unexpected-package',
              version: '1.0.0',
            },
          },
        ],
        packages,
        releasePackages: packages,
        registry,
        publish: async artifact => attempted.push(artifact.name),
        attempts: 1,
        delayMilliseconds: 0,
      }),
    /unexpected artifact unexpected-package@1.0.0/,
  )
  assert.deepEqual(attempted, [])
})

test('a missing packed dependency stops before the first publication', async () => {
  const core = packageFor('core', '1.0.0')
  const consumer = packageFor('consumer', '1.0.0', {
    dependencies: { core: 'workspace:*' },
  })
  const registry = new FakeRegistry([core, consumer])
  const attempted = []

  await assert.rejects(
    () =>
      uploadPlannedArtifacts({
        artifacts: [
          {
            ...artifactFor('consumer', '1.0.0'),
            packageJson: { name: 'consumer', version: '1.0.0' },
          },
        ],
        packages: [consumer],
        releasePackages: [core, consumer],
        registry,
        publish: async artifact => attempted.push(artifact.name),
        attempts: 1,
        delayMilliseconds: 0,
      }),
    /packed dependencies keys.*, expected core/,
  )
  assert.deepEqual(attempted, [])
})

test('packed artifacts preserve non-workspace dependency specs', () => {
  const packages = [
    packageFor('consumer', '1.0.0', {
      dependencies: { semver: '^7.7.4' },
    }),
  ]

  assert.throws(
    () =>
      assertArtifactsMatchPackages({
        artifacts: [
          {
            ...artifactFor('consumer', '1.0.0'),
            packageJson: {
              name: 'consumer',
              version: '1.0.0',
              dependencies: { semver: '^8.0.0' },
            },
          },
        ],
        packages,
        releasePackages: packages,
      }),
    /packed dependencies.semver=\^8.0.0, expected \^7.7.4 from \^7.7.4/,
  )
})

test('a weakened internal range stops before the first publication', async () => {
  const core = packageFor('core', '1.0.0')
  const consumer = packageFor('consumer', '1.0.0', {
    peerDependencies: { core: '^1.0.0' },
  })
  const registry = new FakeRegistry([core, consumer])
  const attempted = []

  await assert.rejects(
    () =>
      uploadPlannedArtifacts({
        artifacts: [
          {
            ...artifactFor('consumer', '1.0.0'),
            packageJson: {
              name: 'consumer',
              version: '1.0.0',
              peerDependencies: { core: '*' },
            },
          },
        ],
        packages: [consumer],
        releasePackages: [core, consumer],
        registry,
        publish: async artifact => attempted.push(artifact.name),
        attempts: 1,
        delayMilliseconds: 0,
      }),
    /packed peerDependencies.core=\*, expected \^1.0.0/,
  )
  assert.deepEqual(attempted, [])
})

test('packed artifacts use pnpm workspace protocol transformations', () => {
  const releasePackages = [
    packageFor('star-core', '1.2.3'),
    packageFor('caret-core', '1.2.3'),
    packageFor('zero-core', '0.148.0'),
  ]
  const consumer = packageFor('consumer', '1.0.0', {
    dependencies: {
      'star-core': 'workspace:*',
      'caret-core': 'workspace:^',
      'zero-core': 'workspace:^0',
    },
  })

  assert.doesNotThrow(() =>
    assertArtifactsMatchPackages({
      artifacts: [
        {
          ...artifactFor('consumer', '1.0.0'),
          packageJson: {
            name: 'consumer',
            version: '1.0.0',
            dependencies: {
              'star-core': '1.2.3',
              'caret-core': '^1.2.3',
              'zero-core': '^0',
            },
          },
        },
      ],
      packages: [consumer],
      releasePackages: [...releasePackages, consumer],
    }),
  )

  assert.throws(
    () =>
      assertArtifactsMatchPackages({
        artifacts: [
          {
            ...artifactFor('consumer', '1.0.0'),
            packageJson: {
              name: 'consumer',
              version: '1.0.0',
              dependencies: {
                'star-core': '*',
                'caret-core': '^1.2.3',
                'zero-core': '^0',
              },
            },
          },
        ],
        packages: [consumer],
        releasePackages: [...releasePackages, consumer],
      }),
    /packed dependencies.star-core=\*, expected 1.2.3 from workspace:\*/,
  )
})

test('packed artifacts reject duplicate planned packages', () => {
  const packages = [packageFor('foldkit', '1.0.0')]
  const artifact = {
    ...artifactFor('foldkit', '1.0.0'),
    packageJson: { name: 'foldkit', version: '1.0.0' },
  }

  assert.throws(
    () =>
      assertArtifactsMatchPackages({
        artifacts: [artifact, artifact],
        packages,
        releasePackages: packages,
      }),
    /duplicate artifacts for foldkit/,
  )
})

test('canary versions and internal references are commit-addressed', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567'
  const packages = packagesForChannel(
    [
      packageFor('foldkit', '1.2.3'),
      packageFor('@foldkit/ui', '1.2.3', {
        peerDependencies: { foldkit: 'workspace:^0' },
      }),
    ],
    'canary',
    commit,
  )

  assert.equal(canaryVersion('1.2.3', commit), '1.2.3-canary.0123456789ab')
  assert.equal(
    packages[1].packageJson.peerDependencies.foldkit,
    '1.2.3-canary.0123456789ab',
  )
  assert.equal(
    uploadTag('canary', commit),
    'foldkit-canary-upload-0123456789ab',
  )
  assert.deepEqual(
    packagesToUpload({
      packages,
      channel: 'canary',
      knownTags: new Set(),
      metadataByName: new Map(),
    }),
    packages,
  )
})

test('registry verification requires exact internal canary references', async () => {
  const version = '1.2.3-canary.0123456789ab'
  const packages = [
    packageFor('foldkit', version),
    packageFor('@foldkit/ui', version),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('foldkit', version))
  registry.add(artifactFor('@foldkit/ui', version), {
    peerDependencies: { foldkit: '>=1.2.3-canary.0123456789ab' },
  })

  await assert.rejects(
    verifyRegistrySnapshot(packages, registry),
    /not the exact canary version/,
  )
})

test('canary upload refuses a package name npm has never published', async () => {
  const packages = [packageFor('@foldkit/new-package', '0.1.0')]
  const registry = new FakeRegistry([])

  await assert.rejects(
    assertPackagesAlreadyExist(packages, registry),
    /refusing first publication.*@foldkit\/new-package/,
  )
})

test('partial tag promotion resumes idempotently', async () => {
  const packages = [
    packageFor('foldkit', '1.2.3'),
    packageFor('create-foldkit-app', '2.0.0'),
  ]
  const registry = new FakeRegistry(packages)

  for (const pkg of packages) {
    registry.add(artifactFor(pkg.packageJson.name, pkg.packageJson.version))
  }

  registry.add(artifactFor('foldkit', '1.2.2'))
  registry.add(artifactFor('create-foldkit-app', '1.9.0'))
  registry.packuments.get('foldkit')['dist-tags'].latest = '1.2.2'
  registry.packuments.get('create-foldkit-app')['dist-tags'].latest = '1.9.0'
  let isFirstAttempt = true
  const addTag = async (pkg, tag) => {
    if (pkg.packageJson.name === 'foldkit' && isFirstAttempt) {
      throw new Error('simulated promotion failure')
    }
    registry.packuments.get(pkg.packageJson.name)['dist-tags'][tag] =
      pkg.packageJson.version
  }

  await assert.rejects(
    promoteSnapshot({ packages, tag: 'latest', registry, addTag }),
    /simulated promotion failure/,
  )
  assert.equal(
    registry.packuments.get('create-foldkit-app')['dist-tags'].latest,
    '2.0.0',
  )

  isFirstAttempt = false
  const retry = await promoteSnapshot({
    packages,
    tag: 'latest',
    registry,
    addTag,
  })
  assert.deepEqual(retry.alreadyPromoted, ['create-foldkit-app'])
  assert.deepEqual(retry.promoted, ['foldkit'])
})

test('promotion keeps every intermediate latest snapshot compatible', async () => {
  const packages = [
    packageFor('@foldkit/ui', '0.149.0', {
      peerDependencies: { foldkit: '>=0.148.0 <0.150.0' },
    }),
    packageFor('create-foldkit-app', '2.0.0'),
    packageFor('foldkit', '0.149.0'),
  ]
  const registry = new FakeRegistry(packages)

  for (const pkg of packages) {
    registry.add(artifactFor(pkg.packageJson.name, pkg.packageJson.version))
  }

  registry.add(artifactFor('@foldkit/ui', '0.149.0'), {
    peerDependencies: { foldkit: '>=0.148.0 <0.150.0' },
  })
  registry.add(artifactFor('@foldkit/ui', '0.148.0'), {
    peerDependencies: { foldkit: '^0.148.0' },
  })
  registry.add(artifactFor('create-foldkit-app', '1.9.0'))
  registry.add(artifactFor('foldkit', '0.148.0'))
  registry.packuments.get('@foldkit/ui')['dist-tags'].latest = '0.148.0'
  registry.packuments.get('create-foldkit-app')['dist-tags'].latest = '1.9.0'
  registry.packuments.get('foldkit')['dist-tags'].latest = '0.148.0'
  const promoted = []

  await promoteSnapshot({
    packages,
    tag: 'latest',
    registry,
    addTag: async (pkg, tag) => {
      promoted.push(pkg.packageJson.name)
      registry.packuments.get(pkg.packageJson.name)['dist-tags'][tag] =
        pkg.packageJson.version
    },
  })

  assert.deepEqual(promoted, ['create-foldkit-app', '@foldkit/ui', 'foldkit'])
})

test('promotion stops before changing tags when no compatible path exists', async () => {
  const packages = [
    packageFor('foldkit', '0.149.0'),
    packageFor('@foldkit/ui', '0.149.0', {
      peerDependencies: { foldkit: '^0.149.0' },
    }),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('foldkit', '0.149.0'))
  registry.add(artifactFor('@foldkit/ui', '0.149.0'), {
    peerDependencies: { foldkit: '^0.149.0' },
  })
  registry.add(artifactFor('foldkit', '0.148.0'))
  registry.add(artifactFor('@foldkit/ui', '0.148.0'), {
    peerDependencies: { foldkit: '^0.148.0' },
  })
  registry.packuments.get('foldkit')['dist-tags'].latest = '0.148.0'
  registry.packuments.get('@foldkit/ui')['dist-tags'].latest = '0.148.0'
  const attempted = []

  await assert.rejects(
    promoteSnapshot({
      packages,
      tag: 'latest',
      registry,
      addTag: async pkg => attempted.push(pkg.packageJson.name),
    }),
    /no dependency-compatible dist-tag order exists/,
  )
  assert.deepEqual(attempted, [])
})

test('promotion refuses every backward tag before changing any tag', async () => {
  const packages = [
    packageFor('create-foldkit-app', '2.0.0'),
    packageFor('foldkit', '1.2.3'),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('create-foldkit-app', '2.0.0'))
  registry.add(artifactFor('create-foldkit-app', '1.9.0'))
  registry.add(artifactFor('foldkit', '1.2.3'))
  registry.add(artifactFor('foldkit', '1.3.0'))
  registry.packuments.get('create-foldkit-app')['dist-tags'].latest = '1.9.0'
  registry.packuments.get('foldkit')['dist-tags'].latest = '1.3.0'
  const attempted = []

  await assert.rejects(
    promoteSnapshot({
      packages,
      tag: 'latest',
      registry,
      addTag: async pkg => attempted.push(pkg.packageJson.name),
    }),
    /refusing to move foldkit@latest backward.*No tags were changed/,
  )
  assert.deepEqual(attempted, [])
})
