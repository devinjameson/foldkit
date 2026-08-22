import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/release.yml'),
  'utf8',
)
const rootPackage = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'),
)

test('stable publication uses the coherent uploader instead of Changesets publish', () => {
  assert.equal(
    rootPackage.scripts.release,
    'pnpm check:peer-floors && node scripts/coherent-release.mjs stable',
  )
  assert.doesNotMatch(rootPackage.scripts.release, /changeset publish/)
  assert.match(workflow, /publish: pnpm release/)
  assert.match(workflow, /NPM_CONFIG_PROVENANCE: true/)
})

test('canaries publish from the trusted release workflow and use exact snapshots', () => {
  assert.match(
    workflow,
    /canary:\n\s+name: Upload and verify commit-addressed package canary/,
  )
  assert.match(workflow, /run: pnpm release:canary/)
  assert.match(workflow, /^\s+- 'packages\/\*\*'$/m)
  assert.match(workflow, /^\s+- 'examples\/\*\*'$/m)
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN/)
})

test('website deployment waits for a separately verified latest promotion', () => {
  const finalize = workflow.indexOf('finalize:')
  const deploy = workflow.indexOf('deploy-website:')

  assert.ok(finalize > 0)
  assert.ok(deploy > finalize)
  assert.match(workflow, /run: pnpm release:verify-latest/)
  assert.match(workflow, /needs: finalize/)
  assert.doesNotMatch(workflow, /needs: release\n\s+if: needs\.release/)
})
