import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT_PATH = 'scripts/plan-ci.mjs'
const ZERO_SHA = '0'.repeat(40)
const MISSING_SHA_A = 'deadbeef'.repeat(5)
const MISSING_SHA_B = 'cafebabe'.repeat(5)
const SCOPES = [
  'create_foldkit_smoke',
  'typing_game',
  'website',
  'full_workspace_checks',
  'workspace_packages',
]

const planCi = (...args) => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, `plan-ci.mjs exited ${result.status}`)

  return Object.fromEntries(
    result.stdout
      .split('\n')
      .filter(line => line !== '')
      .map(line => {
        const separatorIndex = line.indexOf('=')
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
      }),
  )
}

const planCiForFile = fileName => planCi('base', 'head', fileName)

test('emits every scope exactly once as a boolean', () => {
  const scopes = planCiForFile('README.md')

  assert.deepEqual(Object.keys(scopes).sort(), [...SCOPES].sort())
  for (const value of Object.values(scopes)) {
    assert.ok(value === 'true' || value === 'false', `not a boolean: ${value}`)
  }
})

test('a documentation-only change selects nothing', () => {
  const scopes = planCiForFile('README.md')

  for (const scope of SCOPES) {
    assert.equal(scopes[scope], 'false', `${scope} should be false`)
  }
})

test('a foldkit change reaches the website and the typing game', () => {
  const scopes = planCiForFile('packages/foldkit/src/runtime/runtime.ts')

  assert.equal(scopes['website'], 'true')
  assert.equal(scopes['typing_game'], 'true')
  assert.equal(scopes['workspace_packages'], 'true')
  assert.equal(scopes['full_workspace_checks'], 'false')
})

test('a markdown change reaches the website', () => {
  const scopes = planCiForFile('packages/markdown/src/index.ts')

  assert.equal(scopes['website'], 'true')
  assert.equal(scopes['typing_game'], 'false')
})

test('a create-foldkit-app change selects the smoke test', () => {
  assert.equal(
    planCiForFile('packages/create-foldkit-app/src/index.ts')[
      'create_foldkit_smoke'
    ],
    'true',
  )
})

test('an oxlint plugin change selects the smoke test', () => {
  assert.equal(
    planCiForFile('packages/oxlint-plugin-foldkit/src/index.ts')[
      'create_foldkit_smoke'
    ],
    'true',
  )
})

test('a typing game change stays out of the website scope', () => {
  const scopes = planCiForFile('packages/typing-game/client/src/main.ts')

  assert.equal(scopes['typing_game'], 'true')
  assert.equal(scopes['website'], 'false')
})

test('a lockfile change selects everything, including the typing game', () => {
  const scopes = planCiForFile('pnpm-lock.yaml')

  for (const scope of SCOPES) {
    assert.equal(scopes[scope], 'true', `${scope} should be true`)
  }
})

test('changing the planner forces the conservative fallback', () => {
  const scopes = planCiForFile(SCRIPT_PATH)

  assert.equal(scopes['full_workspace_checks'], 'true')
  assert.equal(scopes['workspace_packages'], 'true')
})

test('changing the shared diff helper forces the conservative fallback', () => {
  const scopes = planCiForFile('scripts/lib/changed-files.mjs')

  assert.equal(scopes['full_workspace_checks'], 'true')
  assert.equal(scopes['workspace_packages'], 'true')
})

test('a workspace-wide change also selects every application scope', () => {
  for (const fileName of ['tsconfig.base.json', '.npmrc', 'pnpm-lock.yaml']) {
    const scopes = planCiForFile(fileName)

    assert.equal(scopes['full_workspace_checks'], 'true', fileName)
    for (const scope of SCOPES) {
      assert.equal(scopes[scope], 'true', `${fileName} should select ${scope}`)
    }
  }
})

test('an all-zero base revision selects everything', () => {
  const scopes = planCi(ZERO_SHA, 'head')

  for (const scope of SCOPES) {
    assert.equal(scopes[scope], 'true', `${scope} should be true`)
  }
})

test('an unresolvable revision range selects everything', () => {
  const scopes = planCi(MISSING_SHA_A, MISSING_SHA_B)

  for (const scope of SCOPES) {
    assert.equal(scopes[scope], 'true', `${scope} should be true`)
  }
})
