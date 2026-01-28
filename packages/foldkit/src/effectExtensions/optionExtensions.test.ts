import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import { fromString } from './optionExtensions'

describe('fromString', () => {
  it('returns Some for non-empty string', () => {
    const result = fromString('hello')
    expect(Option.isSome(result)).toBe(true)
    expect(Option.getOrNull(result)).toBe('hello')
  })

  it('returns None for empty string', () => {
    const result = fromString('')
    expect(Option.isNone(result)).toBe(true)
  })
})
