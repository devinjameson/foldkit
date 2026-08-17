import { afterEach, describe, expect, it } from 'vitest'

import { resolveBuildId } from '../src/buildToken.ts'

afterEach(() => {
  delete process.env['FOLDKIT_BUILD_ID']
})

describe('resolveBuildId', () => {
  it('uses the configured id', () => {
    expect(resolveBuildId('release-2026-08-17')).toBe('release-2026-08-17')
  })

  it('falls back to the environment variable', () => {
    process.env['FOLDKIT_BUILD_ID'] = 'from-environment'

    expect(resolveBuildId()).toBe('from-environment')
  })

  it('prefers the configured id over the environment variable', () => {
    process.env['FOLDKIT_BUILD_ID'] = 'from-environment'

    expect(resolveBuildId('configured')).toBe('configured')
  })

  it('treats an empty value as absent', () => {
    process.env['FOLDKIT_BUILD_ID'] = ''

    expect(resolveBuildId('')).toBeUndefined()
  })

  it('reports no id when the deployment supplied none', () => {
    // Nothing is derived from the project. A digest of whatever files sit under
    // the Vite root misses shared modules elsewhere in a monorepo, untracked
    // inputs, and environment-derived configuration, so two deployments that
    // render differently could share an id; it moves when one build reads the
    // output of the build before it, so one deployment could produce two; and
    // hashing whatever files happen to be there turns a value published in the
    // page into an oracle for the secrets among them. A hydratable render
    // refuses instead, naming what to supply.
    expect(resolveBuildId()).toBeUndefined()
  })
})
