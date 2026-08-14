import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { Message, Model, ViewInputs } from './index.js'
import {
  CompletedFocusTab,
  FocusTab,
  FocusedTab,
  Selected,
  SelectedTab,
  create,
  findFirstEnabledIndex,
  init,
  keyToIndex,
  update,
  wrapIndex,
} from './index.js'

const noneDisabled = () => false

const disabledAt =
  (...indices: ReadonlyArray<number>) =>
  (index: number) =>
    indices.includes(index)

const TestTabs = create()

const tabValues: ReadonlyArray<string> = ['Overview', 'Install', 'Usage']

const sceneView =
  (
    overrides: Omit<Partial<ViewInputs>, 'tabs' | 'ariaLabel' | 'toView'> = {},
  ) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    TestTabs.view(
      model,
      {
        tabs: tabValues,
        selectedValue: 'Overview',
        ariaLabel: 'Sections',
        ...overrides,
        toView: ({ tablist, tabs }) =>
          h.div(
            [],
            [
              h.div(
                [...tablist],
                tabs.map(tab => h.button([...tab.tab], [tab.value])),
              ),
              ...tabs.map(tab => h.div([...tab.panel], [tab.value])),
            ],
          ),
      },
      h,
    )

const tablist = Scene.role('tablist')
const tab = (index: number) => Scene.selector(`#test-tab-${index}`)

const resolveFocusTab = Scene.Command.resolve(FocusTab, CompletedFocusTab())

describe('Tabs', () => {
  describe('init', () => {
    it('defaults to automatic activation with focus following the selection', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        maybeFocusedIndex: Option.none(),
        activationMode: 'Automatic',
      })
    })

    it('accepts a custom activationMode', () => {
      expect(init({ id: 'test', activationMode: 'Manual' })).toStrictEqual({
        id: 'test',
        maybeFocusedIndex: Option.none(),
        activationMode: 'Manual',
      })
    })
  })

  describe('update', () => {
    it('clears focus divergence on SelectedTab and emits Selected', () => {
      Story.story(
        update,
        Story.given(init({ id: 'test' })),
        Story.message(SelectedTab({ index: 3, value: 'tab-3' })),
        Story.expectOutMessage(Selected({ value: 'tab-3', index: 3 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.none())
        }),
      )
    })

    it('emits Selected with the committed value on a subsequent SelectedTab', () => {
      Story.story(
        update,
        Story.given({
          ...init({ id: 'test' }),
          maybeFocusedIndex: Option.some(1),
        }),
        Story.message(SelectedTab({ index: 0, value: 'tab-0' })),
        Story.expectOutMessage(Selected({ value: 'tab-0', index: 0 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.none())
        }),
      )
    })

    it('sets focus divergence on FocusedTab without an OutMessage', () => {
      Story.story(
        update,
        Story.given(init({ id: 'test', activationMode: 'Manual' })),
        Story.message(FocusedTab({ index: 2 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.some(2))
        }),
      )
    })

    it('SelectedTab in manual mode emits Selected and clears divergence', () => {
      Story.story(
        update,
        Story.given({
          ...init({ id: 'test', activationMode: 'Manual' }),
          maybeFocusedIndex: Option.some(2),
        }),
        Story.message(SelectedTab({ index: 2, value: 'tab-2' })),
        Story.expectOutMessage(Selected({ value: 'tab-2', index: 2 })),
        Story.Command.resolve(FocusTab, CompletedFocusTab()),
        Story.model(model => {
          expect(model.maybeFocusedIndex).toStrictEqual(Option.none())
        }),
      )
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

  describe('orientation', () => {
    it('announces aria-orientation horizontal by default', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(init({ id: 'test' })),
        Scene.expect(tablist).toHaveAttr('aria-orientation', 'horizontal'),
      )
    })

    it('announces aria-orientation vertical when Vertical', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Vertical' }) },
        Scene.given(init({ id: 'test' })),
        Scene.expect(tablist).toHaveAttr('aria-orientation', 'vertical'),
      )
    })

    it('omits aria-orientation when Responsive', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test' })),
        Scene.expect(tablist).toHaveAttr('role', 'tablist'),
        Scene.expect(tablist).toHaveAttr('aria-label', 'Sections'),
        Scene.expect(tablist).not.toHaveAttr('aria-orientation'),
      )
    })
  })

  describe('keyboard navigation', () => {
    it('navigates on both arrow axes when Responsive', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(0), 'ArrowRight'),
        Scene.expectOutMessage(Selected({ value: 'Install', index: 1 })),
        resolveFocusTab,
        Scene.keydown(tab(0), 'ArrowDown'),
        Scene.expectOutMessage(Selected({ value: 'Install', index: 1 })),
        resolveFocusTab,
      )
    })

    it('moves to the previous tab on either backward arrow when Responsive', () => {
      Scene.scene(
        {
          update,
          view: sceneView({
            orientation: 'Responsive',
            selectedValue: 'Install',
          }),
        },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(1), 'ArrowLeft'),
        Scene.expectOutMessage(Selected({ value: 'Overview', index: 0 })),
        resolveFocusTab,
        Scene.keydown(tab(1), 'ArrowUp'),
        Scene.expectOutMessage(Selected({ value: 'Overview', index: 0 })),
        resolveFocusTab,
      )
    })

    it('wraps around on both arrow axes when Responsive', () => {
      Scene.scene(
        {
          update,
          view: sceneView({
            orientation: 'Responsive',
            selectedValue: 'Usage',
          }),
        },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(2), 'ArrowDown'),
        Scene.expectOutMessage(Selected({ value: 'Overview', index: 0 })),
        resolveFocusTab,
      )

      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(0), 'ArrowUp'),
        Scene.expectOutMessage(Selected({ value: 'Usage', index: 2 })),
        resolveFocusTab,
      )
    })

    it('skips disabled tabs on the vertical axis when Responsive', () => {
      Scene.scene(
        {
          update,
          view: sceneView({
            orientation: 'Responsive',
            isTabDisabled: value => value === 'Install',
          }),
        },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(0), 'ArrowDown'),
        Scene.expectOutMessage(Selected({ value: 'Usage', index: 2 })),
        resolveFocusTab,
      )
    })

    it('keeps Home and End jumping to the ends when Responsive', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(0), 'End'),
        Scene.expectOutMessage(Selected({ value: 'Usage', index: 2 })),
        resolveFocusTab,
        Scene.keydown(tab(0), 'Home'),
        Scene.expectOutMessage(Selected({ value: 'Overview', index: 0 })),
        resolveFocusTab,
      )
    })

    it('keeps PageUp and PageDown jumping to the ends when Responsive', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(0), 'PageDown'),
        Scene.expectOutMessage(Selected({ value: 'Usage', index: 2 })),
        resolveFocusTab,
        Scene.keydown(tab(0), 'PageUp'),
        Scene.expectOutMessage(Selected({ value: 'Overview', index: 0 })),
        resolveFocusTab,
      )
    })

    it('ignores a key that navigates neither axis when Responsive', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(0), 'Tab'),
        Scene.expectIgnored(),
      )
    })

    it('moves focus without selecting in Manual mode when Responsive', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test', activationMode: 'Manual' })),
        Scene.keydown(tab(0), 'ArrowDown'),
        resolveFocusTab,
        Scene.expect(tab(1)).toHaveAttr('tabIndex', '0'),
        Scene.expect(tab(1)).toHaveAttr('aria-selected', 'false'),
        Scene.expect(tab(0)).toHaveAttr('aria-selected', 'true'),
      )
    })

    it('moves focus backward on ArrowUp in Manual mode when Responsive', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test', activationMode: 'Manual' })),
        Scene.keydown(tab(0), 'ArrowUp'),
        resolveFocusTab,
        Scene.expect(tab(2)).toHaveAttr('tabIndex', '0'),
        Scene.expect(tab(2)).toHaveAttr('aria-selected', 'false'),
        Scene.expect(tab(0)).toHaveAttr('aria-selected', 'true'),
      )
    })

    it('selects the focused tab on Enter and Space when Responsive', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test', activationMode: 'Manual' })),
        Scene.keydown(tab(0), 'ArrowDown'),
        resolveFocusTab,
        Scene.keydown(tab(1), 'Enter'),
        Scene.expectOutMessage(Selected({ value: 'Install', index: 1 })),
        resolveFocusTab,
      )

      Scene.scene(
        { update, view: sceneView({ orientation: 'Responsive' }) },
        Scene.given(init({ id: 'test', activationMode: 'Manual' })),
        Scene.keydown(tab(0), 'ArrowDown'),
        resolveFocusTab,
        Scene.keydown(tab(1), ' '),
        Scene.expectOutMessage(Selected({ value: 'Install', index: 1 })),
        resolveFocusTab,
      )
    })

    it('ignores the vertical arrows when Horizontal', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(0), 'ArrowDown'),
        Scene.expectIgnored(),
        Scene.keydown(tab(0), 'ArrowUp'),
        Scene.expectIgnored(),
        Scene.keydown(tab(0), 'ArrowRight'),
        Scene.expectOutMessage(Selected({ value: 'Install', index: 1 })),
        resolveFocusTab,
      )
    })

    it('ignores the horizontal arrows when Vertical', () => {
      Scene.scene(
        { update, view: sceneView({ orientation: 'Vertical' }) },
        Scene.given(init({ id: 'test' })),
        Scene.keydown(tab(0), 'ArrowRight'),
        Scene.expectIgnored(),
        Scene.keydown(tab(0), 'ArrowLeft'),
        Scene.expectIgnored(),
        Scene.keydown(tab(0), 'ArrowDown'),
        Scene.expectOutMessage(Selected({ value: 'Install', index: 1 })),
        resolveFocusTab,
      )
    })
  })
})
