import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PLUGIN_MANIFEST = 'packages/vite-plugin-foldkit/package.json'

const runResetPeerDeps = () => {
  const result = spawnSync('npx', ['tsx', 'scripts/reset-peer-deps.ts'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  assert.equal(
    result.status,
    0,
    `reset-peer-deps.ts exited ${result.status}: ${result.stderr}`,
  )
}

const readManifest = path =>
  JSON.parse(readFileSync(resolve(REPO_ROOT, path), 'utf8'))

// The release workflow runs this script as part of `version-packages`, so a
// package whose peer floor names a real minimum must survive it. Broadening
// `@foldkit/vite-plugin`'s `foldkit` peer would republish the compatibility bug
// the floor exists to prevent: a plugin that accepts a foldkit without the
// `foldkit/experimental/server` export it imports, and fails at import instead.
test('leaves the vite plugin foldkit peer floor alone', () => {
  const before = readFileSync(resolve(REPO_ROOT, PLUGIN_MANIFEST), 'utf8')

  try {
    runResetPeerDeps()

    const peer = readManifest(PLUGIN_MANIFEST).peerDependencies.foldkit
    assert.match(
      peer,
      /^>=\d+\.\d+\.\d+$/,
      `expected a ">=" floor, got ${peer}`,
    )
  } finally {
    writeFileSync(resolve(REPO_ROOT, PLUGIN_MANIFEST), before)
  }
})

test('restores the broad range on packages that declare one', () => {
  const path = 'packages/ui/package.json'
  const before = readFileSync(resolve(REPO_ROOT, path), 'utf8')

  try {
    const manifest = readManifest(path)
    manifest.peerDependencies.foldkit = '0.147.0'
    writeFileSync(
      resolve(REPO_ROOT, path),
      JSON.stringify(manifest, null, 2) + '\n',
    )

    runResetPeerDeps()

    assert.equal(readManifest(path).peerDependencies.foldkit, 'workspace:^0')
  } finally {
    writeFileSync(resolve(REPO_ROOT, path), before)
  }
})
