import { describe, expect, it } from 'vitest'

import { staticHtml } from './index.js'

describe('keyed', () => {
  it('preserves every PropertyKey without coercion', () => {
    const h = staticHtml
    const keys: ReadonlyArray<PropertyKey> = [1, '1', Symbol('1')]

    for (const key of keys) {
      const vnode = h.keyed('div')(key)
      expect(vnode?.key).toBe(key)
    }
  })
})
