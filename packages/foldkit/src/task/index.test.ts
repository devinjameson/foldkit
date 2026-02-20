import { describe, it } from '@effect/vitest'
import { DateTime, Effect } from 'effect'
import { expect } from 'vitest'

import {
  focus,
  getTime,
  getTimeZone,
  getZonedTime,
  getZonedTimeIn,
  lockScroll,
  randomInt,
  unlockScroll,
} from './index'

describe('getTime', () => {
  it.scoped('returns a UTC time wrapped in the message constructor', () =>
    Effect.gen(function* () {
      const result = yield* getTime((utc) => ({
        _tag: 'GotTime' as const,
        utc,
      }))
      expect(result._tag).toBe('GotTime')
      expect(DateTime.isUtc(result.utc)).toBe(true)
    }),
  )
})

describe('getTimeZone', () => {
  it.scoped('returns a timezone', () =>
    Effect.gen(function* () {
      const result = yield* getTimeZone((zone) => ({
        _tag: 'GotZone' as const,
        zone,
      }))
      expect(result._tag).toBe('GotZone')
      expect(DateTime.isTimeZone(result.zone)).toBe(true)
    }),
  )
})

describe('getZonedTime', () => {
  it.scoped('returns a zoned datetime', () =>
    Effect.gen(function* () {
      const result = yield* getZonedTime((zoned) => ({
        _tag: 'GotZoned' as const,
        zoned,
      }))
      expect(result._tag).toBe('GotZoned')
      expect(DateTime.isZoned(result.zoned)).toBe(true)
    }),
  )
})

describe('getZonedTimeIn', () => {
  it.scoped('succeeds with a valid timezone', () =>
    Effect.gen(function* () {
      const result = yield* getZonedTimeIn('America/New_York', (zoned) => ({
        _tag: 'GotNY' as const,
        zoned,
      }))
      expect(result._tag).toBe('GotNY')
      expect(DateTime.isZoned(result.zoned)).toBe(true)
    }),
  )

  it.scoped('fails with an invalid timezone', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(
        getZonedTimeIn('Invalid/Zone', (zoned) => ({
          _tag: 'Nope' as const,
          zoned,
        })),
      )
      expect(error).toBe('Invalid timezone: Invalid/Zone')
    }),
  )
})

describe('randomInt', () => {
  it.scoped('produces a value within the specified range', () =>
    Effect.gen(function* () {
      const results: number[] = []
      for (let i = 0; i < 50; i++) {
        const result = yield* randomInt(0, 10, (v) => v)
        results.push(result)
      }
      for (const r of results) {
        expect(r).toBeGreaterThanOrEqual(0)
        expect(r).toBeLessThan(10)
      }
    }),
  )

  it.scoped('wraps the value in the message constructor', () =>
    Effect.gen(function* () {
      const result = yield* randomInt(5, 15, (v) => ({
        _tag: 'GotRandom' as const,
        value: v,
      }))
      expect(result._tag).toBe('GotRandom')
      expect(result.value).toBeGreaterThanOrEqual(5)
      expect(result.value).toBeLessThan(15)
    }),
  )
})

describe('focus', () => {
  it.scoped('returns false when element is not found', () =>
    Effect.gen(function* () {
      const result = yield* focus('#nonexistent', (success) => ({
        _tag: 'Focused' as const,
        success,
      }))
      expect(result._tag).toBe('Focused')
      expect(result.success).toBe(false)
    }),
  )
})

describe('lockScroll', () => {
  it.scoped('sets overflow hidden on document element', () =>
    Effect.gen(function* () {
      const result = yield* lockScroll(() => ({
        _tag: 'Locked' as const,
      }))
      expect(result._tag).toBe('Locked')
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll(() => ({ _tag: 'Unlocked' as const }))
    }),
  )

  it.scoped('restores original overflow on unlock', () =>
    Effect.gen(function* () {
      document.documentElement.style.overflow = 'auto'

      yield* lockScroll(() => ({ _tag: 'Locked' as const }))
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll(() => ({ _tag: 'Unlocked' as const }))
      expect(document.documentElement.style.overflow).toBe('auto')

      document.documentElement.style.overflow = ''
    }),
  )

  it.scoped('supports nested locks via reference counting', () =>
    Effect.gen(function* () {
      yield* lockScroll(() => ({ _tag: 'Locked' as const }))
      yield* lockScroll(() => ({ _tag: 'Locked' as const }))
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll(() => ({ _tag: 'Unlocked' as const }))
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll(() => ({ _tag: 'Unlocked' as const }))
      expect(document.documentElement.style.overflow).toBe('')
    }),
  )
})

describe('unlockScroll', () => {
  it.scoped('is safe to call without a preceding lock', () =>
    Effect.gen(function* () {
      const result = yield* unlockScroll(() => ({
        _tag: 'Unlocked' as const,
      }))
      expect(result._tag).toBe('Unlocked')
    }),
  )
})
