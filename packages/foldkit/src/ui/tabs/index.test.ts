import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import {
  TabFocused,
  TabSelected,
  findFirstEnabledIndex,
  init,
  keyToIndex,
  update,
  wrapIndex,
} from './index'

const noneDisabled = () => false

const disabledAt =
  (...indices: ReadonlyArray<number>) =>
  (index: number) =>
    indices.includes(index)

describe('Tabs', () => {
  describe('init', () => {
    it('defaults activeIndex to 0 and orientation to horizontal', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        activeIndex: 0,
        focusedIndex: 0,
        orientation: 'Horizontal',
        activationMode: 'Automatic',
      })
    })

    it('accepts a custom activeIndex', () => {
      expect(init({ id: 'test', activeIndex: 2 })).toStrictEqual({
        id: 'test',
        activeIndex: 2,
        focusedIndex: 2,
        orientation: 'Horizontal',
        activationMode: 'Automatic',
      })
    })

    it('accepts a custom orientation', () => {
      expect(init({ id: 'test', orientation: 'Vertical' })).toStrictEqual({
        id: 'test',
        activeIndex: 0,
        focusedIndex: 0,
        orientation: 'Vertical',
        activationMode: 'Automatic',
      })
    })

    it('accepts a custom activationMode', () => {
      expect(init({ id: 'test', activationMode: 'Manual' })).toStrictEqual({
        id: 'test',
        activeIndex: 0,
        focusedIndex: 0,
        orientation: 'Horizontal',
        activationMode: 'Manual',
      })
    })

    it('syncs focusedIndex with activeIndex', () => {
      const model = init({ id: 'test', activeIndex: 3 })
      expect(model.focusedIndex).toBe(3)
    })
  })

  describe('update', () => {
    it('sets activeIndex and focusedIndex on TabSelected', () => {
      const model = init({ id: 'test' })
      const [result] = update(model, TabSelected({ index: 3 }))
      expect(result.activeIndex).toBe(3)
      expect(result.focusedIndex).toBe(3)
    })

    it('replaces activeIndex on subsequent TabSelected', () => {
      const model = init({ id: 'test', activeIndex: 1 })
      const [result] = update(model, TabSelected({ index: 0 }))
      expect(result.activeIndex).toBe(0)
      expect(result.focusedIndex).toBe(0)
    })

    it('returns a focus command on TabSelected', () => {
      const model = init({ id: 'test' })
      const [, commands] = update(model, TabSelected({ index: 2 }))
      expect(commands).toHaveLength(1)
    })

    it('preserves orientation on TabSelected', () => {
      const model = init({ id: 'test', orientation: 'Vertical' })
      const [result] = update(model, TabSelected({ index: 1 }))
      expect(result.orientation).toBe('Vertical')
    })

    it('updates only focusedIndex on TabFocused', () => {
      const model = init({ id: 'test', activationMode: 'Manual' })
      const [result] = update(model, TabFocused({ index: 2 }))
      expect(result.activeIndex).toBe(0)
      expect(result.focusedIndex).toBe(2)
    })

    it('returns a focus command on TabFocused', () => {
      const model = init({ id: 'test', activationMode: 'Manual' })
      const [, commands] = update(model, TabFocused({ index: 2 }))
      expect(commands).toHaveLength(1)
    })

    it('does not change activeIndex on TabFocused', () => {
      const model = init({
        id: 'test',
        activeIndex: 1,
        activationMode: 'Manual',
      })
      const [result] = update(model, TabFocused({ index: 3 }))
      expect(result.activeIndex).toBe(1)
      expect(result.focusedIndex).toBe(3)
    })

    it('TabSelected updates both indices in manual mode', () => {
      const model = {
        ...init({ id: 'test', activationMode: 'Manual' }),
        focusedIndex: 2,
      }
      const [result] = update(model, TabSelected({ index: 2 }))
      expect(result.activeIndex).toBe(2)
      expect(result.focusedIndex).toBe(2)
    })
  })

  describe('wrapIndex', () => {
    it('returns the index when within range', () => {
      expect(wrapIndex(2, 5)).toBe(2)
    })

    it('wraps positive overflow', () => {
      expect(wrapIndex(5, 5)).toBe(0)
      expect(wrapIndex(7, 5)).toBe(2)
    })

    it('wraps negative index', () => {
      expect(wrapIndex(-1, 5)).toBe(4)
      expect(wrapIndex(-3, 5)).toBe(2)
    })

    it('handles boundary indices', () => {
      expect(wrapIndex(0, 5)).toBe(0)
      expect(wrapIndex(4, 5)).toBe(4)
    })
  })

  describe('findFirstEnabledIndex', () => {
    it('returns startIndex when not disabled', () => {
      const find = findFirstEnabledIndex(5, 0, noneDisabled)
      expect(find(2, 1)).toBe(2)
    })

    it('skips disabled tabs scanning forward', () => {
      const find = findFirstEnabledIndex(5, 0, disabledAt(1, 2))
      expect(find(1, 1)).toBe(3)
    })

    it('skips disabled tabs scanning backward', () => {
      const find = findFirstEnabledIndex(5, 0, disabledAt(3, 2))
      expect(find(3, -1)).toBe(1)
    })

    it('wraps around to find an enabled tab', () => {
      const find = findFirstEnabledIndex(5, 0, disabledAt(3, 4))
      expect(find(3, 1)).toBe(0)
    })

    it('returns focusedIndex when all tabs are disabled', () => {
      const allDisabled = () => true
      const find = findFirstEnabledIndex(3, 1, allDisabled)
      expect(find(0, 1)).toBe(1)
    })

    it('finds last enabled tab scanning backward from end', () => {
      const find = findFirstEnabledIndex(5, 0, disabledAt(4))
      expect(find(4, -1)).toBe(3)
    })

    it('skips a contiguous run of disabled tabs', () => {
      const find = findFirstEnabledIndex(6, 0, disabledAt(1, 2, 3))
      expect(find(1, 1)).toBe(4)
    })
  })

  describe('keyToIndex', () => {
    it('moves to next tab on next key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 0, noneDisabled)
      expect(resolve('ArrowRight')).toBe(1)
    })

    it('moves to previous tab on previous key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 2, noneDisabled)
      expect(resolve('ArrowLeft')).toBe(1)
    })

    it('wraps from last to first on next key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 3, 2, noneDisabled)
      expect(resolve('ArrowRight')).toBe(0)
    })

    it('wraps from first to last on previous key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 3, 0, noneDisabled)
      expect(resolve('ArrowLeft')).toBe(2)
    })

    it('jumps to first enabled tab on Home', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 3, disabledAt(0))
      expect(resolve('Home')).toBe(1)
    })

    it('jumps to first enabled tab on PageUp', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 3, disabledAt(0))
      expect(resolve('PageUp')).toBe(1)
    })

    it('jumps to last enabled tab on End', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 0, disabledAt(4))
      expect(resolve('End')).toBe(3)
    })

    it('jumps to last enabled tab on PageDown', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 0, disabledAt(4))
      expect(resolve('PageDown')).toBe(3)
    })

    it('returns focusedIndex for unrecognized key', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 2, noneDisabled)
      expect(resolve('Tab')).toBe(2)
    })

    it('works with vertical orientation keys', () => {
      const resolve = keyToIndex('ArrowDown', 'ArrowUp', 3, 0, noneDisabled)
      expect(resolve('ArrowDown')).toBe(1)
      expect(resolve('ArrowUp')).toBe(2)
    })

    it('skips disabled tabs during arrow navigation', () => {
      const resolve = keyToIndex('ArrowRight', 'ArrowLeft', 5, 0, disabledAt(1))
      expect(resolve('ArrowRight')).toBe(2)
    })
  })
})
