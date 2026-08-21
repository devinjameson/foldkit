import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const PUBLISHABLE_PACKAGES = [
  { name: 'foldkit', manifest: 'packages/foldkit/package.json' },
  { name: '@foldkit/ui', manifest: 'packages/ui/package.json' },
  { name: '@foldkit/devtools', manifest: 'packages/devtools/package.json' },
  {
    name: '@foldkit/vite-plugin',
    manifest: 'packages/vite-plugin-foldkit/package.json',
  },
  {
    name: '@foldkit/devtools-mcp',
    manifest: 'packages/devtools-mcp/package.json',
  },
  {
    name: '@foldkit/oxlint-plugin',
    manifest: 'packages/oxlint-plugin-foldkit/package.json',
  },
  { name: '@foldkit/markdown', manifest: 'packages/markdown/package.json' },
  {
    name: 'create-foldkit-app',
    manifest: 'packages/create-foldkit-app/package.json',
  },
]

export const CANARY_CHANNEL_PACKAGE = 'create-foldkit-app'

const CANARY_CHANGESET_PATH = '.changeset/foldkit-main-canary.md'
const CANARY_VERSION_PATTERN = /^0\.0\.0-canary-([0-9a-f]{40})-(\d{14})$/
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]
const NPM_REGISTRY_BASE_URL = 'https://registry.npmjs.org'
const REGISTRY_RETRY_DELAYS_MS = [0, 1_000, 2_000, 4_000, 8_000]

const validateCommit = commit => {
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error(`Expected a full lowercase Git commit, received ${commit}.`)
  }
}

const expectedPackageNames = () =>
  new Set(PUBLISHABLE_PACKAGES.map(({ name }) => name))

const canaryChangeset = () =>
  [
    '---',
    ...PUBLISHABLE_PACKAGES.map(({ name }) => `'${name}': patch`),
    '---',
    '',
    'Publish a coherent canary snapshot of the current main commit.',
    '',
  ].join('\n')

const readWorkspacePackages = repositoryRoot => {
  const output = execFileSync(
    'pnpm',
    ['list', '--recursive', '--depth', '-1', '--json'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  )
  const workspacePackages = JSON.parse(output)

  if (!Array.isArray(workspacePackages)) {
    throw new Error('pnpm did not return a workspace package list.')
  }

  for (const workspacePackage of workspacePackages) {
    if (
      typeof workspacePackage !== 'object' ||
      workspacePackage === null ||
      typeof workspacePackage.name !== 'string' ||
      typeof workspacePackage.path !== 'string'
    ) {
      throw new Error('pnpm returned invalid workspace package metadata.')
    }
  }

  return workspacePackages
}

export const validatePublishableWorkspace = (
  repositoryRoot,
  workspacePackages,
) => {
  const expectedByName = new Map(
    PUBLISHABLE_PACKAGES.map(packageDefinition => [
      packageDefinition.name,
      packageDefinition,
    ]),
  )
  const publicWorkspacePackages = workspacePackages.filter(
    workspacePackage => workspacePackage.private !== true,
  )
  const publicByName = new Map(
    publicWorkspacePackages.map(workspacePackage => [
      workspacePackage.name,
      workspacePackage,
    ]),
  )

  const missingPackages = [...expectedByName.keys()].filter(
    name => !publicByName.has(name),
  )
  const unexpectedPackages = [...publicByName.keys()].filter(
    name => !expectedByName.has(name),
  )

  if (
    missingPackages.at(0) !== undefined ||
    unexpectedPackages.at(0) !== undefined
  ) {
    throw new Error(
      `Canary package set does not match the public workspace. Missing: ${missingPackages.join(', ') || 'none'}. Unexpected: ${unexpectedPackages.join(', ') || 'none'}.`,
    )
  }

  for (const [name, packageDefinition] of expectedByName) {
    const workspacePackage = publicByName.get(name)

    if (workspacePackage === undefined) {
      throw new Error(`The public workspace package ${name} is missing.`)
    }

    const workspaceManifest = relative(
      repositoryRoot,
      resolve(workspacePackage.path, 'package.json'),
    ).replaceAll('\\', '/')

    if (workspaceManifest !== packageDefinition.manifest) {
      throw new Error(
        `${name} is at ${workspaceManifest}, not ${packageDefinition.manifest}.`,
      )
    }
  }
}

const validateRepositoryPackages = repositoryRoot =>
  validatePublishableWorkspace(
    repositoryRoot,
    readWorkspacePackages(repositoryRoot),
  )

export const preparePackageCanary = (
  repositoryRoot,
  workspacePackages = readWorkspacePackages(repositoryRoot),
) => {
  validatePublishableWorkspace(repositoryRoot, workspacePackages)

  mkdirSync(resolve(repositoryRoot, '.changeset'), { recursive: true })

  writeFileSync(
    resolve(repositoryRoot, CANARY_CHANGESET_PATH),
    canaryChangeset(),
    { flag: 'wx' },
  )
}

const readPackageManifests = repositoryRoot =>
  PUBLISHABLE_PACKAGES.map(({ name, manifest }) => {
    const parsed = JSON.parse(
      readFileSync(resolve(repositoryRoot, manifest), 'utf8'),
    )

    if (parsed.name !== name) {
      throw new Error(
        `${manifest} declares ${String(parsed.name)}, not ${name}.`,
      )
    }

    return parsed
  })

const packPackageCanary = (repositoryRoot, outputDirectory) =>
  PUBLISHABLE_PACKAGES.map(packageDefinition => {
    const packageDirectory = resolve(
      repositoryRoot,
      dirname(packageDefinition.manifest),
    )

    const packed = execFileSync(
      'pnpm',
      ['pack', '--pack-destination', outputDirectory],
      { cwd: packageDirectory, encoding: 'utf8' },
    )

    const tarballOutput = packed.trim().split('\n').at(-1)

    if (tarballOutput === undefined || tarballOutput === '') {
      throw new Error(`pnpm pack produced no tarball for ${packageDirectory}.`)
    }

    const tarball = resolve(packageDirectory, tarballOutput)
    const packedManifest = execFileSync(
      'tar',
      ['-xzOf', tarball, 'package/package.json'],
      { encoding: 'utf8' },
    )

    return {
      ...packageDefinition,
      packageManifest: JSON.parse(packedManifest),
      tarball,
    }
  })

const withPackedPackageCanary = async (repositoryRoot, useArtifacts) => {
  const outputDirectory = mkdtempSync(join(tmpdir(), 'foldkit-canary-pack-'))

  try {
    const artifacts = packPackageCanary(repositoryRoot, outputDirectory)

    return await useArtifacts(artifacts)
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true })
  }
}

const validatePackageSet = packageManifests => {
  const expectedNames = expectedPackageNames()
  const manifestsByName = new Map(
    packageManifests.map(manifest => [manifest.name, manifest]),
  )

  if (
    manifestsByName.size !== expectedNames.size ||
    [...expectedNames].some(name => !manifestsByName.has(name))
  ) {
    throw new Error('The canary does not include every published package.')
  }

  return expectedNames
}

export const validatePackageCanary = (expectedCommit, packageManifests) => {
  validateCommit(expectedCommit)

  validatePackageSet(packageManifests)

  const canaryVersionPattern = new RegExp(
    `^0\\.0\\.0-canary-${expectedCommit}-\\d{14}$`,
  )
  const canaryVersions = new Set(
    packageManifests.map(manifest => manifest.version),
  )

  if (
    canaryVersions.size !== 1 ||
    [...canaryVersions].some(version => !canaryVersionPattern.test(version))
  ) {
    throw new Error(
      `Published packages do not share a canary version for ${expectedCommit}.`,
    )
  }

  const canaryVersion = [...canaryVersions].at(0)

  if (canaryVersion === undefined) {
    throw new Error('The canary contains no published packages.')
  }

  return canaryVersion
}

export const validatePackedPackageCanary = (
  expectedCommit,
  packageManifests,
) => {
  const canaryVersion = validatePackageCanary(expectedCommit, packageManifests)
  const expectedNames = expectedPackageNames()

  for (const manifest of packageManifests) {
    for (const field of DEPENDENCY_FIELDS) {
      const dependencies = manifest[field] ?? {}

      for (const [dependency, range] of Object.entries(dependencies)) {
        if (typeof range === 'string' && range.startsWith('workspace:')) {
          throw new Error(
            `${manifest.name} leaves ${dependency} at unsupported ${range}.`,
          )
        }

        const isCanaryDependency =
          typeof range === 'string' && range.includes('0.0.0-canary-')

        if (!expectedNames.has(dependency) && !isCanaryDependency) {
          continue
        }

        if (range !== canaryVersion) {
          throw new Error(
            `${manifest.name} points ${dependency} at ${range}, not ${canaryVersion}.`,
          )
        }
      }
    }
  }

  return canaryVersion
}

export const verifyCurrentCanaryCommit = (
  repositoryRoot,
  expectedCommit,
  currentReference,
) => {
  validateCommit(expectedCommit)

  const currentCommit = execFileSync(
    'git',
    ['rev-parse', '--verify', `${currentReference}^{commit}`],
    { cwd: repositoryRoot, encoding: 'utf8' },
  ).trim()

  validateCommit(currentCommit)

  if (currentCommit !== expectedCommit) {
    throw new Error(
      `Refusing to publish stale canary ${expectedCommit}; ${currentReference} is ${currentCommit}.`,
    )
  }

  return currentCommit
}

export const packageCanaryTag = (name, canaryVersion) => {
  if (!CANARY_VERSION_PATTERN.test(canaryVersion)) {
    throw new Error(`Invalid canary version ${canaryVersion}.`)
  }

  if (name === CANARY_CHANNEL_PACKAGE) {
    return 'canary'
  }

  return canaryVersion.slice('0.0.0-'.length)
}

export const orderPackageCanaryArtifacts = artifacts => {
  const channelArtifact = artifacts.find(
    artifact => artifact.packageManifest.name === CANARY_CHANNEL_PACKAGE,
  )

  if (channelArtifact === undefined) {
    throw new Error(`The canary is missing ${CANARY_CHANNEL_PACKAGE}.`)
  }

  return [
    ...artifacts.filter(
      artifact => artifact.packageManifest.name !== CANARY_CHANNEL_PACKAGE,
    ),
    channelArtifact,
  ]
}

const registryPackagesByName = registryPackages =>
  new Map(
    registryPackages.map(registryPackage => [
      registryPackage.name,
      registryPackage,
    ]),
  )

export const validateStableLatestTags = registryPackages => {
  const packagesByName = registryPackagesByName(registryPackages)

  for (const name of expectedPackageNames()) {
    const registryPackage = packagesByName.get(name)
    const latest = registryPackage?.tags.latest

    if (
      registryPackage === undefined ||
      typeof latest !== 'string' ||
      CANARY_VERSION_PATTERN.test(latest) ||
      !Object.hasOwn(registryPackage.versions, latest)
    ) {
      throw new Error(
        `${name} must have an existing stable latest version before canary publishing.`,
      )
    }
  }
}

const validatePublishedArtifact = (registryPackage, name, canaryVersion) => {
  const tag = packageCanaryTag(name, canaryVersion)

  if (!Object.hasOwn(registryPackage.versions, canaryVersion)) {
    throw new Error(`${name}@${canaryVersion} is not available on npm.`)
  }

  if (registryPackage.tags[tag] !== canaryVersion) {
    throw new Error(`${name}@${tag} does not point to ${canaryVersion} on npm.`)
  }
}

export const validatePublishedPackageCanary = (
  canaryVersion,
  registryPackages,
) => {
  validateStableLatestTags(registryPackages)

  const packagesByName = registryPackagesByName(registryPackages)

  for (const name of expectedPackageNames()) {
    const registryPackage = packagesByName.get(name)

    if (registryPackage === undefined) {
      throw new Error(`${name} is missing from the npm registry response.`)
    }

    validatePublishedArtifact(registryPackage, name, canaryVersion)
  }
}

const fetchRegistryPackage = async name => {
  const encodedName = encodeURIComponent(name)
  const response = await fetch(
    `${NPM_REGISTRY_BASE_URL}/${encodedName}?canary=${Date.now()}`,
    { cache: 'no-store' },
  )

  if (response.status === 404) {
    return { name, tags: {}, versions: {} }
  }

  if (!response.ok) {
    throw new Error(`npm returned ${response.status} for ${name}.`)
  }

  const packument = await response.json()

  if (
    typeof packument !== 'object' ||
    packument === null ||
    typeof packument['dist-tags'] !== 'object' ||
    packument['dist-tags'] === null ||
    typeof packument.versions !== 'object' ||
    packument.versions === null
  ) {
    throw new Error(`npm returned invalid package metadata for ${name}.`)
  }

  return {
    name,
    tags: packument['dist-tags'],
    versions: packument.versions,
  }
}

const fetchRegistryPackages = names =>
  Promise.all(names.map(fetchRegistryPackage))

const pause = milliseconds =>
  new Promise(resolvePause => setTimeout(resolvePause, milliseconds))

const waitForRegistry = async (names, validateRegistryPackages) => {
  let latestError = new Error('npm registry validation did not run.')

  for (const delay of REGISTRY_RETRY_DELAYS_MS) {
    if (delay !== 0) {
      await pause(delay)
    }

    try {
      const registryPackages = await fetchRegistryPackages(names)

      validateRegistryPackages(registryPackages)

      return registryPackages
    } catch (error) {
      latestError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw latestError
}

const waitForPublishedArtifact = (name, canaryVersion) =>
  waitForRegistry([name], registryPackages => {
    const registryPackage = registryPackages.at(0)

    if (registryPackage === undefined) {
      throw new Error(`npm returned no package metadata for ${name}.`)
    }

    validatePublishedArtifact(registryPackage, name, canaryVersion)
  })

const publishPackageArtifact = async (
  repositoryRoot,
  artifact,
  canaryVersion,
) => {
  const name = artifact.packageManifest.name
  const tag = packageCanaryTag(name, canaryVersion)

  try {
    execFileSync(
      'npm',
      ['publish', artifact.tarball, '--tag', tag, '--access', 'public'],
      {
        cwd: resolve(repositoryRoot, dirname(artifact.manifest)),
        stdio: 'inherit',
      },
    )
  } catch (publishError) {
    try {
      await waitForPublishedArtifact(name, canaryVersion)

      return
    } catch {
      throw publishError
    }
  }

  await waitForPublishedArtifact(name, canaryVersion)
}

export const inspectPackageCanary = (repositoryRoot, expectedCommit) => {
  validateRepositoryPackages(repositoryRoot)

  return validatePackageCanary(
    expectedCommit,
    readPackageManifests(repositoryRoot),
  )
}

export const inspectPackedPackageCanary = (repositoryRoot, expectedCommit) => {
  validateRepositoryPackages(repositoryRoot)

  return withPackedPackageCanary(repositoryRoot, artifacts =>
    validatePackedPackageCanary(
      expectedCommit,
      artifacts.map(({ packageManifest }) => packageManifest),
    ),
  )
}

export const publishPackageCanary = (
  repositoryRoot,
  expectedCommit,
  currentReference,
) => {
  validateRepositoryPackages(repositoryRoot)

  return withPackedPackageCanary(repositoryRoot, async artifacts => {
    const canaryVersion = validatePackedPackageCanary(
      expectedCommit,
      artifacts.map(({ packageManifest }) => packageManifest),
    )
    const packageNames = artifacts.map(
      ({ packageManifest }) => packageManifest.name,
    )

    await waitForRegistry(packageNames, validateStableLatestTags)

    verifyCurrentCanaryCommit(repositoryRoot, expectedCommit, currentReference)

    for (const artifact of orderPackageCanaryArtifacts(artifacts)) {
      await publishPackageArtifact(repositoryRoot, artifact, canaryVersion)
    }

    await waitForRegistry(packageNames, registryPackages =>
      validatePublishedPackageCanary(canaryVersion, registryPackages),
    )

    return canaryVersion
  })
}

const entryPath = process.argv.at(1)

if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(resolve(entryPath)).href
) {
  const command = process.argv.at(2)

  if (command === 'prepare') {
    preparePackageCanary(process.cwd())
  } else if (command === 'inspect' || command === 'inspect-packed') {
    const expectedCommit = process.argv.at(3)

    if (expectedCommit === undefined) {
      throw new Error('Pass the canary commit to inspect.')
    }

    const canaryVersion =
      command === 'inspect'
        ? inspectPackageCanary(process.cwd(), expectedCommit)
        : await inspectPackedPackageCanary(process.cwd(), expectedCommit)

    process.stdout.write(`version=${canaryVersion}\n`)
  } else if (command === 'publish') {
    const expectedCommit = process.argv.at(3)
    const currentReference = process.argv.at(4)

    if (expectedCommit === undefined || currentReference === undefined) {
      throw new Error('Pass the canary commit and current Git reference.')
    }

    const canaryVersion = await publishPackageCanary(
      process.cwd(),
      expectedCommit,
      currentReference,
    )

    process.stdout.write(`version=${canaryVersion}\n`)
  } else {
    throw new Error('Pass prepare, inspect, inspect-packed, or publish.')
  }
}
