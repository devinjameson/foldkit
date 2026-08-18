import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflow = readFileSync(
  resolve(REPO_ROOT, '.github/workflows/ci.yml'),
  'utf8',
)
const rootPackage = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'),
)

test('changeset status receives trusted pull request context', () => {
  assert.match(
    workflow,
    /- name: Check changeset status\n\s+env:\n\s+FOLDKIT_CI_EVENT_NAME: \$\{\{ github\.event_name \}\}\n\s+FOLDKIT_CI_HEAD_REF: \$\{\{ github\.head_ref \}\}\n\s+FOLDKIT_CI_HEAD_REPOSITORY: \$\{\{ github\.event\.pull_request\.head\.repo\.full_name \}\}\n\s+FOLDKIT_CI_REPOSITORY: \$\{\{ github\.repository \}\}\n\s+run: node scripts\/check-changeset-status\.mjs/,
  )
})

test('the packed SSR consumer runs its critical browser matrix in CI', () => {
  assert.match(
    workflow,
    /playwright install --with-deps chromium firefox webkit/,
  )
  assert.equal(
    rootPackage.scripts['check:packed-ssr-consumer:ci'],
    'tsx scripts/check-packed-ssr-consumer.ts --skip-build --critical-browser-matrix',
  )
})
