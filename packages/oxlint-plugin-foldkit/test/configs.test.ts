import { describe, expect, it } from 'vitest'

import plugin from '../src/index.ts'

const testFilePatterns = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
]

const serverFilePatterns = [
  '**/entry.server.ts',
  '**/entry.server.tsx',
  '**/server/**/*.ts',
  '**/server/**/*.tsx',
  '**/prerender.ts',
]

const serverRuleId = 'foldkit/no-nonportable-server-globals'

const presets = [
  { name: 'recommended', config: plugin.configs.recommended },
  { name: 'all', config: plugin.configs.all },
]

describe('configs', () => {
  for (const { name, config } of presets) {
    describe(name, () => {
      it('enables foldkit rules at error severity', () => {
        expect(
          config.rules['foldkit/no-child-message-construction-in-root'],
        ).toBe('error')
        expect(config.rules['foldkit/no-noop-message']).toBe('error')
        expect(config.rules['foldkit/no-empty-commands-array']).toBe('error')
        expect(config.rules['foldkit/got-submodel-message-name']).toBe('error')
      })

      it('scopes the server portability rule to recognized server files', () => {
        const serverOverride = config.overrides[0]

        expect(config.rules[serverRuleId]).toBe('off')
        expect(serverOverride?.files).toEqual(serverFilePatterns)
        expect(serverOverride?.excludeFiles).toEqual(testFilePatterns)
        expect(serverOverride?.rules).toEqual({ [serverRuleId]: 'error' })
      })

      it('turns every foldkit rule off in test files', () => {
        const testOverride = config.overrides[1]

        expect(testOverride?.files).toEqual(testFilePatterns)
        for (const ruleId of Object.keys(config.rules)) {
          expect(testOverride?.rules[ruleId]).toBe('off')
        }
      })
    })
  }
})
