import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import { Closed, NoOp, Toggled, init, update } from './disclosure'

describe('Disclosure', () => {
  describe('init', () => {
    it('defaults isOpen to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
      })
    })

    it('accepts a custom isOpen', () => {
      expect(init({ id: 'test', isOpen: true })).toStrictEqual({
        id: 'test',
        isOpen: true,
      })
    })
  })

  describe('update', () => {
    it('opens when closed on Toggled', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, Toggled.make())
      expect(result.isOpen).toBe(true)
      expect(commands).toHaveLength(0)
    })

    it('closes when open on Toggled', () => {
      const model = init({ id: 'test', isOpen: true })
      const [result, commands] = update(model, Toggled.make())
      expect(result.isOpen).toBe(false)
      expect(commands).toHaveLength(1)
    })

    it('closes when open on Closed', () => {
      const model = init({ id: 'test', isOpen: true })
      const [result, commands] = update(model, Closed.make())
      expect(result.isOpen).toBe(false)
      expect(commands).toHaveLength(1)
    })

    it('is a no-op when already closed on Closed', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, Closed.make())
      expect(result).toStrictEqual(model)
      expect(commands).toHaveLength(0)
    })

    it('returns model unchanged on NoOp', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, NoOp.make())
      expect(result).toBe(model)
      expect(commands).toHaveLength(0)
    })
  })
})
