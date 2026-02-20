import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import {
  ClearedSearch,
  Closed,
  ClosedByTab,
  ItemActivated,
  ItemDeactivated,
  ItemSelected,
  NoOp,
  Opened,
  PointerMovedOverItem,
  Searched,
  TransitionEnded,
  TransitionFrameAdvanced,
  groupContiguous,
  init,
  resolveTypeaheadMatch,
  update,
} from './index'

const closedModel = () => init({ id: 'test' })

const openModel = () => {
  const model = init({ id: 'test' })
  const [result] = update(
    model,
    Opened({ maybeActiveItemIndex: Option.some(0) }),
  )
  return result
}

const closedAnimatedModel = () => init({ id: 'test', isAnimated: true })

const openAnimatedModel = () => {
  const model = closedAnimatedModel()
  const [result] = update(
    model,
    Opened({ maybeActiveItemIndex: Option.some(0) }),
  )
  return result
}

describe('Menu', () => {
  describe('init', () => {
    it('defaults to closed with no active item', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        transitionState: 'Idle',
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        searchQuery: '',
        searchVersion: 0,
        maybeLastPointerPosition: Option.none(),
      })
    })

    it('accepts isAnimated option', () => {
      const model = init({ id: 'test', isAnimated: true })
      expect(model.isAnimated).toBe(true)
      expect(model.transitionState).toBe('Idle')
    })
  })

  describe('update', () => {
    describe('Opened', () => {
      it('opens the menu with the given active item', () => {
        const model = closedModel()
        const [result, commands] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(2) }),
        )
        expect(result.isOpen).toBe(true)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(2))
        expect(commands).toHaveLength(1)
      })

      it('resets search state on open', () => {
        const model = {
          ...closedModel(),
          searchQuery: 'stale',
          searchVersion: 1,
        }
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(0) }),
        )
        expect(result.searchQuery).toBe('')
        expect(result.searchVersion).toBe(0)
      })

      it('sets trigger to Keyboard when opened with active item', () => {
        const model = closedModel()
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(0) }),
        )
        expect(result.activationTrigger).toBe('Keyboard')
      })

      it('sets trigger to Pointer when opened without active item', () => {
        const model = closedModel()
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.none() }),
        )
        expect(result.activationTrigger).toBe('Pointer')
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
      })

      it('resets pointer position on open', () => {
        const model = {
          ...closedModel(),
          maybeLastPointerPosition: Option.some({
            screenX: 100,
            screenY: 200,
          }),
        }
        const [result] = update(
          model,
          Opened({ maybeActiveItemIndex: Option.some(0) }),
        )
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
      })
    })

    describe('Closed', () => {
      it('closes the menu and resets state', () => {
        const model = openModel()
        const [result, commands] = update(model, Closed())
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.activationTrigger).toBe('Keyboard')
        expect(result.searchQuery).toBe('')
        expect(result.searchVersion).toBe(0)
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })
    })

    describe('ClosedByTab', () => {
      it('closes the menu without a focus command', () => {
        const model = openModel()
        const [result, commands] = update(model, ClosedByTab())
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(result.maybeLastPointerPosition).toStrictEqual(Option.none())
        expect(commands).toHaveLength(0)
      })
    })

    describe('ItemActivated', () => {
      it('sets the active item index', () => {
        const model = openModel()
        const [result] = update(
          model,
          ItemActivated({ index: 3, activationTrigger: 'Keyboard' }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(3))
      })

      it('replaces the previous active item', () => {
        const model = openModel()
        const [intermediate] = update(
          model,
          ItemActivated({ index: 1, activationTrigger: 'Keyboard' }),
        )
        const [result] = update(
          intermediate,
          ItemActivated({ index: 4, activationTrigger: 'Keyboard' }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(4))
      })

      it('stores activation trigger in model', () => {
        const model = openModel()
        const [result] = update(
          model,
          ItemActivated({ index: 1, activationTrigger: 'Pointer' }),
        )
        expect(result.activationTrigger).toBe('Pointer')
      })

      it('returns scroll command for keyboard activation', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          ItemActivated({ index: 2, activationTrigger: 'Keyboard' }),
        )
        expect(commands).toHaveLength(1)
      })

      it('returns no commands for pointer activation', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          ItemActivated({ index: 2, activationTrigger: 'Pointer' }),
        )
        expect(commands).toHaveLength(0)
      })
    })

    describe('ItemDeactivated', () => {
      it('clears active item when pointer-activated', () => {
        const model = openModel()
        const [afterPointer] = update(
          model,
          ItemActivated({ index: 1, activationTrigger: 'Pointer' }),
        )
        const [result, commands] = update(afterPointer, ItemDeactivated())
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(commands).toHaveLength(0)
      })

      it('preserves active item when keyboard-activated', () => {
        const model = openModel()
        const [afterKeyboard] = update(
          model,
          ItemActivated({ index: 2, activationTrigger: 'Keyboard' }),
        )
        const [result, commands] = update(afterKeyboard, ItemDeactivated())
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(2))
        expect(result).toBe(afterKeyboard)
        expect(commands).toHaveLength(0)
      })
    })

    describe('PointerMovedOverItem', () => {
      it('activates item on first pointer move', () => {
        const model = openModel()
        const [result, commands] = update(
          model,
          PointerMovedOverItem({
            index: 2,
            screenX: 100,
            screenY: 200,
          }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(2))
        expect(result.activationTrigger).toBe('Pointer')
        expect(result.maybeLastPointerPosition).toStrictEqual(
          Option.some({ screenX: 100, screenY: 200 }),
        )
        expect(commands).toHaveLength(0)
      })

      it('activates when position differs from stored', () => {
        const model = openModel()
        const [afterFirst] = update(
          model,
          PointerMovedOverItem({
            index: 1,
            screenX: 100,
            screenY: 200,
          }),
        )
        const [result] = update(
          afterFirst,
          PointerMovedOverItem({
            index: 3,
            screenX: 150,
            screenY: 250,
          }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(3))
        expect(result.maybeLastPointerPosition).toStrictEqual(
          Option.some({ screenX: 150, screenY: 250 }),
        )
      })

      it('returns model unchanged when position matches', () => {
        const model = openModel()
        const [afterFirst] = update(
          model,
          PointerMovedOverItem({
            index: 1,
            screenX: 100,
            screenY: 200,
          }),
        )
        const [result, commands] = update(
          afterFirst,
          PointerMovedOverItem({
            index: 2,
            screenX: 100,
            screenY: 200,
          }),
        )
        expect(result).toBe(afterFirst)
        expect(commands).toHaveLength(0)
      })

      it('does not return scroll commands', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          PointerMovedOverItem({
            index: 2,
            screenX: 100,
            screenY: 200,
          }),
        )
        expect(commands).toHaveLength(0)
      })
    })

    describe('ItemSelected', () => {
      it('closes the menu and returns a focus command', () => {
        const model = openModel()
        const [result, commands] = update(model, ItemSelected({ index: 2 }))
        expect(result.isOpen).toBe(false)
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.none())
        expect(commands).toHaveLength(1)
      })
    })

    describe('Searched', () => {
      it('appends the key to the search query', () => {
        const model = openModel()
        const [result] = update(
          model,
          Searched({ key: 'a', maybeTargetIndex: Option.none() }),
        )
        expect(result.searchQuery).toBe('a')

        const [result2] = update(
          result,
          Searched({ key: 'b', maybeTargetIndex: Option.none() }),
        )
        expect(result2.searchQuery).toBe('ab')
      })

      it('bumps the search version', () => {
        const model = openModel()
        const [result] = update(
          model,
          Searched({ key: 'x', maybeTargetIndex: Option.none() }),
        )
        expect(result.searchVersion).toBe(1)

        const [result2] = update(
          result,
          Searched({ key: 'y', maybeTargetIndex: Option.none() }),
        )
        expect(result2.searchVersion).toBe(2)
      })

      it('updates active item when a match is found', () => {
        const model = openModel()
        const [result] = update(
          model,
          Searched({ key: 'd', maybeTargetIndex: Option.some(3) }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(3))
      })

      it('keeps existing active item when no match is found', () => {
        const model = openModel()
        const [result] = update(
          model,
          Searched({ key: 'z', maybeTargetIndex: Option.none() }),
        )
        expect(result.maybeActiveItemIndex).toStrictEqual(Option.some(0))
      })

      it('returns a delay command for debounce', () => {
        const model = openModel()
        const [, commands] = update(
          model,
          Searched({ key: 'a', maybeTargetIndex: Option.none() }),
        )
        expect(commands).toHaveLength(1)
      })
    })

    describe('ClearedSearch', () => {
      it('clears search query when version matches', () => {
        const model = openModel()
        const [afterSearch] = update(
          model,
          Searched({ key: 'a', maybeTargetIndex: Option.none() }),
        )
        expect(afterSearch.searchVersion).toBe(1)

        const [result, commands] = update(
          afterSearch,
          ClearedSearch({ version: 1 }),
        )
        expect(result.searchQuery).toBe('')
        expect(commands).toHaveLength(0)
      })

      it('ignores stale version', () => {
        const model = openModel()
        const [afterFirstSearch] = update(
          model,
          Searched({ key: 'a', maybeTargetIndex: Option.none() }),
        )
        const [afterSecondSearch] = update(
          afterFirstSearch,
          Searched({ key: 'b', maybeTargetIndex: Option.none() }),
        )
        expect(afterSecondSearch.searchVersion).toBe(2)

        const [result] = update(
          afterSecondSearch,
          ClearedSearch({ version: 1 }),
        )
        expect(result.searchQuery).toBe('ab')
      })
    })

    describe('NoOp', () => {
      it('returns model unchanged', () => {
        const model = openModel()
        const [result, commands] = update(model, NoOp())
        expect(result).toBe(model)
        expect(commands).toHaveLength(0)
      })
    })

    describe('transitions', () => {
      describe('enter flow', () => {
        it('sets EnterStart and emits focus + nextFrame on Opened', () => {
          const model = closedAnimatedModel()
          const [result, commands] = update(
            model,
            Opened({ maybeActiveItemIndex: Option.some(0) }),
          )
          expect(result.isOpen).toBe(true)
          expect(result.transitionState).toBe('EnterStart')
          expect(commands).toHaveLength(2)
        })

        it('advances EnterStart to EnterAnimating on TransitionFrameAdvanced', () => {
          const model = openAnimatedModel()
          expect(model.transitionState).toBe('EnterStart')

          const [result, commands] = update(model, TransitionFrameAdvanced())
          expect(result.transitionState).toBe('EnterAnimating')
          expect(commands).toHaveLength(1)
        })

        it('completes EnterAnimating to Idle on TransitionEnded', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, TransitionFrameAdvanced())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result, commands] = update(enterAnimating, TransitionEnded())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })
      })

      describe('leave flow', () => {
        it('sets LeaveStart on Closed', () => {
          const model = openAnimatedModel()
          const [result, commands] = update(model, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
          expect(commands).toHaveLength(2)
        })

        it('sets LeaveStart on ClosedByTab', () => {
          const model = openAnimatedModel()
          const [result, commands] = update(model, ClosedByTab())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
          expect(commands).toHaveLength(1)
        })

        it('sets LeaveStart on ItemSelected', () => {
          const model = openAnimatedModel()
          const [result, commands] = update(model, ItemSelected({ index: 0 }))
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
          expect(commands).toHaveLength(2)
        })

        it('advances LeaveStart to LeaveAnimating on TransitionFrameAdvanced', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          expect(closed.transitionState).toBe('LeaveStart')

          const [result, commands] = update(closed, TransitionFrameAdvanced())
          expect(result.transitionState).toBe('LeaveAnimating')
          expect(commands).toHaveLength(1)
        })

        it('completes LeaveAnimating to Idle on TransitionEnded', () => {
          const model = openAnimatedModel()
          const [closed] = update(model, Closed())
          const [leaveAnimating] = update(closed, TransitionFrameAdvanced())
          expect(leaveAnimating.transitionState).toBe('LeaveAnimating')

          const [result, commands] = update(leaveAnimating, TransitionEnded())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(0)
        })
      })

      describe('non-animated', () => {
        it('keeps transitionState Idle on Opened', () => {
          const model = closedModel()
          const [result, commands] = update(
            model,
            Opened({ maybeActiveItemIndex: Option.some(0) }),
          )
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(1)
        })

        it('keeps transitionState Idle on Closed', () => {
          const model = openModel()
          const [result, commands] = update(model, Closed())
          expect(result.transitionState).toBe('Idle')
          expect(commands).toHaveLength(1)
        })
      })

      describe('stale messages', () => {
        it('ignores TransitionFrameAdvanced when Idle', () => {
          const model = openModel()
          const [result, commands] = update(model, TransitionFrameAdvanced())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })

        it('ignores TransitionEnded when Idle', () => {
          const model = openModel()
          const [result, commands] = update(model, TransitionEnded())
          expect(result).toBe(model)
          expect(commands).toHaveLength(0)
        })
      })

      describe('interruptions', () => {
        it('transitions to LeaveStart when Closed during EnterStart', () => {
          const model = openAnimatedModel()
          expect(model.transitionState).toBe('EnterStart')

          const [result] = update(model, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
        })

        it('transitions to LeaveStart when Closed during EnterAnimating', () => {
          const model = openAnimatedModel()
          const [enterAnimating] = update(model, TransitionFrameAdvanced())
          expect(enterAnimating.transitionState).toBe('EnterAnimating')

          const [result] = update(enterAnimating, Closed())
          expect(result.isOpen).toBe(false)
          expect(result.transitionState).toBe('LeaveStart')
        })
      })
    })
  })

  describe('resolveTypeaheadMatch', () => {
    const items: ReadonlyArray<string> = [
      'Edit',
      'Duplicate',
      'Archive',
      'Move',
      'Delete',
    ]
    const noneDisabled = () => false
    const identity = (item: string) => item

    it('finds item matching the query', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'a',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(2))
    })

    it('matches case-insensitively', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'A',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(2))
    })

    it('starts searching after the active item on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'd',
          Option.some(1),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('wraps around when no match after active item', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'e',
          Option.some(3),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(0))
    })

    it('returns none when no item matches', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'z',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.none())
    })

    it('skips disabled items', () => {
      const archiveDisabled = (index: number) => index === 2
      expect(
        resolveTypeaheadMatch(
          items,
          'a',
          Option.none(),
          archiveDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.none())
    })

    it('matches multi-character queries', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'de',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('uses the itemToSearchText function', () => {
      const withLabels = (item: string) => `Action: ${item}`
      expect(
        resolveTypeaheadMatch(
          items,
          'action: m',
          Option.none(),
          noneDisabled,
          withLabels,
          false,
        ),
      ).toStrictEqual(Option.some(3))
    })

    it('starts from index 0 when no active item', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'e',
          Option.none(),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(0))
    })

    it('finds the next match when wrapping on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'du',
          Option.some(0),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(1))
    })

    it('includes the active item on refinement', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'del',
          Option.some(4),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('skips the active item on fresh search', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'd',
          Option.some(1),
          noneDisabled,
          identity,
          false,
        ),
      ).toStrictEqual(Option.some(4))
    })

    it('finds next match on refinement when active item no longer matches', () => {
      expect(
        resolveTypeaheadMatch(
          items,
          'du',
          Option.some(4),
          noneDisabled,
          identity,
          true,
        ),
      ).toStrictEqual(Option.some(1))
    })
  })

  describe('groupContiguous', () => {
    const identity = (item: string) => item

    it('returns empty for empty input', () => {
      expect(groupContiguous([], identity)).toStrictEqual([])
    })

    it('groups a single item', () => {
      expect(groupContiguous(['a'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
      ])
    })

    it('groups contiguous items with the same key', () => {
      expect(groupContiguous(['a', 'a', 'a'], identity)).toStrictEqual([
        { key: 'a', items: ['a', 'a', 'a'] },
      ])
    })

    it('separates items with different keys', () => {
      expect(groupContiguous(['a', 'b'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
        { key: 'b', items: ['b'] },
      ])
    })

    it('keeps non-contiguous runs as separate segments', () => {
      expect(groupContiguous(['a', 'b', 'a'], identity)).toStrictEqual([
        { key: 'a', items: ['a'] },
        { key: 'b', items: ['b'] },
        { key: 'a', items: ['a'] },
      ])
    })

    it('uses the key function to determine grouping', () => {
      const items = ['Edit', 'Duplicate', 'Archive', 'Move', 'Delete']
      const toGroup = (item: string) =>
        item === 'Delete' ? 'Danger' : 'Actions'

      expect(groupContiguous(items, toGroup)).toStrictEqual([
        { key: 'Actions', items: ['Edit', 'Duplicate', 'Archive', 'Move'] },
        { key: 'Danger', items: ['Delete'] },
      ])
    })

    it('passes index to the key function', () => {
      const items = ['a', 'b', 'c', 'd']
      const byHalf = (_item: string, index: number) =>
        index < 2 ? 'first' : 'second'

      expect(groupContiguous(items, byHalf)).toStrictEqual([
        { key: 'first', items: ['a', 'b'] },
        { key: 'second', items: ['c', 'd'] },
      ])
    })
  })
})
