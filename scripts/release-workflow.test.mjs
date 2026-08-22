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
const canaryWorkflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/deploy-website-canary.yml'),
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

test('website canaries deploy only after their package snapshot is verified', () => {
  const packageCanary = workflow.indexOf('\n  canary:')
  const websiteCanary = workflow.indexOf('\n  deploy-website-canary:')

  assert.ok(packageCanary > 0)
  assert.ok(websiteCanary > packageCanary)
  assert.match(
    workflow,
    /deploy-website-canary:\n\s+needs: canary\n\s+uses: \.\/\.github\/workflows\/deploy-website-canary\.yml\n\s+with:\n\s+target: \$\{\{ github\.sha \}\}/,
  )
  assert.match(canaryWorkflow, /workflow_call:/)
  assert.doesNotMatch(canaryWorkflow, /\n  push:/)

  for (const path of [
    '.npmrc',
    'scripts/build-examples.ts',
    'scripts/check-playground-ssg-build.ts',
    'scripts/example-bridge.js',
    'scripts/restore-website-fonts.sh',
    'scripts/website-vercel-config.mjs',
    'tsconfig.base.json',
    '.github/workflows/deploy-website-build.yml',
    '.github/workflows/deploy-website-canary.yml',
  ]) {
    assert.match(workflow, new RegExp(`^\\s+- '${path}'$`, 'm'), path)
  }
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
