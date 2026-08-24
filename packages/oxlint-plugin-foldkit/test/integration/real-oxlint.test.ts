import { build } from 'esbuild'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runOxlint } from './run-oxlint.ts'

// Runs every rule through real oxlint against fixtures written in real
// Foldkit idioms. `invalid/` must produce at least one diagnostic and
// `valid/` must produce none. This is the check the off-by-default unit
// tests cannot give: it catches a rule that passes hand-built mock ASTs
// but misfires on the code people actually write.

const here = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(here, '..', '..')
const repoRoot = join(pluginRoot, '..', '..')
const fixturesRoot = join(here, 'fixtures')
const oxlintBin = join(repoRoot, 'node_modules', 'oxlint', 'bin', 'oxlint')
const workDir = mkdtempSync(join(tmpdir(), 'foldkit-oxlint-integration-'))
const bundlePath = join(workDir, 'plugin.mjs')

beforeAll(async () => {
  await build({
    entryPoints: [join(pluginRoot, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
  })
})

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

type FixtureKind = 'valid' | 'invalid'

const countDiagnostics = (rule: string, kind: FixtureKind): number => {
  const targetDir = join(fixturesRoot, rule, kind)
  const config = {
    plugins: ['typescript'],
    jsPlugins: [{ name: 'foldkit', specifier: pathToFileURL(bundlePath).href }],
    categories: { correctness: 'off' },
    rules: { [`foldkit/${rule}`]: 'error' },
  }
  const configPath = join(workDir, `${rule}.${kind}.oxlintrc.json`)
  writeFileSync(configPath, JSON.stringify(config))
  const diagnostics = runOxlint({
    oxlintBin,
    cwd: workDir,
    configPath,
    target: targetDir,
  })
  const expectedCode = `foldkit(${rule})`

  for (const diagnostic of diagnostics) {
    if (diagnostic.code !== expectedCode) {
      throw new Error(
        `Expected ${expectedCode}, received ${diagnostic.code} in ${diagnostic.filename}`,
      )
    }
  }
  return diagnostics.length
}

const ruleFixtures = readdirSync(fixturesRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

describe('real-oxlint rule fixtures', () => {
  it('has a fixture directory for every registered rule', async () => {
    const plugin = await import(pathToFileURL(bundlePath).href)
    const registered: ReadonlyArray<string> = Object.keys(
      (plugin.default ?? plugin).rules,
    )
    const missing = registered.filter(rule => !ruleFixtures.includes(rule))
    expect(missing, `rules without a fixture directory: ${missing}`).toEqual([])
  })

  for (const rule of ruleFixtures) {
    it(`${rule} fires on invalid and stays quiet on valid`, () => {
      expect(existsSync(join(fixturesRoot, rule, 'invalid'))).toBe(true)
      expect(existsSync(join(fixturesRoot, rule, 'valid'))).toBe(true)
      expect(countDiagnostics(rule, 'invalid')).toBeGreaterThan(0)
      expect(countDiagnostics(rule, 'valid')).toBe(0)
    })
  }

  it('fixes only structurally safe empty commands properties', () => {
    const rule = 'no-empty-commands-array'
    const sourcePath = join(fixturesRoot, rule, 'invalid', 'update.ts')
    const targetPath = join(workDir, `${rule}.fix.ts`)
    const configPath = join(workDir, `${rule}.fix.oxlintrc.json`)
    copyFileSync(sourcePath, targetPath)
    writeFileSync(
      configPath,
      JSON.stringify({
        plugins: ['typescript'],
        jsPlugins: [
          { name: 'foldkit', specifier: pathToFileURL(bundlePath).href },
        ],
        categories: { correctness: 'off' },
        rules: { [`foldkit/${rule}`]: 'error' },
      }),
    )

    const diagnostics = runOxlint({
      oxlintBin,
      cwd: workDir,
      configPath,
      target: targetPath,
      fix: true,
    })
    const fixedSource = readFileSync(targetPath, 'utf8')

    expect(diagnostics).toHaveLength(1)
    expect(fixedSource).not.toContain('commands: []')
    expect(fixedSource).toContain('// A comment does not make this a Command.')
  })
})
