import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  assertCompleteReleaseSet,
  publicWorkspacePackages,
  workspacePackagesFromEntries,
} from './workspace-packages.mjs'

const writePackage = (root, dir, packageJson) => {
  const packageDir = join(root, dir)
  mkdirSync(packageDir, { recursive: true })
  writeFileSync(
    join(packageDir, 'package.json'),
    `${JSON.stringify(packageJson)}\n`,
  )
  return { path: dir }
}

test('discovers the public release set from workspace manifests', () => {
  const root = mkdtempSync(join(tmpdir(), 'foldkit-workspaces-'))
  try {
    const entries = [
      writePackage(root, 'packages/alpha', {
        name: '@foldkit/alpha',
        version: '1.0.0',
      }),
      writePackage(root, 'packages/private', {
        name: '@foldkit/private',
        version: '1.0.0',
        private: true,
      }),
    ]
    const packages = workspacePackagesFromEntries(root, entries)

    assert.deepEqual(
      publicWorkspacePackages(packages).map(pkg => pkg.packageJson.name),
      ['@foldkit/alpha'],
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('rejects a coherent set that omits a public workspace package', () => {
  const packages = [
    { packageJson: { name: 'foldkit' } },
    { packageJson: { name: '@foldkit/ui' } },
  ]

  assert.throws(
    () => assertCompleteReleaseSet(packages, packages.slice(0, 1)),
    /missing public packages: @foldkit\/ui/,
  )
})
