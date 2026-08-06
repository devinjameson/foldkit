import { Option, flow } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import { create, init, update } from './multi.js'
import type { Model, ViewInputs } from './multi.js'
import {
  ActivatedItem,
  AnchorCombobox,
  ClearedSelection,
  Closed,
  CompletedAnchorCombobox,
  CompletedFocusInput,
  CompletedInertOthers,
  CompletedLockScroll,
  CompletedPortalComboboxBackdrop,
  CompletedRestoreInert,
  CompletedScrollIntoView,
  CompletedUnlockScroll,
  FocusInput,
  InertOthers,
  LockScroll,
  type Message,
  Opened,
  PortalComboboxBackdrop,
  RestoreInert,
  ScrollIntoView,
  Selected,
  SelectedItem,
  UnlockScroll,
  inputId,
} from './shared.js'

const TestCombobox = create<string>()
const view = TestCombobox.view

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorCombobox,
  CompletedAnchorCombobox(),
)
const acknowledgeBackdrop = Scene.Mount.resolve(
  PortalComboboxBackdrop,
  CompletedPortalComboboxBackdrop(),
)

const givenClosed = Story.given(init({ id: 'test' }))

const givenOpenMulti = flow(
  givenClosed,
  Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
)

describe('Combobox.Multi', () => {
  describe('init', () => {
    it('defaults to closed with no active item and an empty input', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        isModal: false,
        nullable: false,
        immediate: false,
        selectInputOnFocus: false,
        animation: Animation.init({ id: 'test-items' }),
        maybeActiveItemIndex: Option.none(),
        activationTrigger: 'Keyboard',
        inputValue: '',
        maybeLastPointerPosition: Option.none(),
      })
    })
  })

  describe('update', () => {
    describe('SelectedItem (multiple)', () => {
      it('emits Selected with the item value', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'apple' })),
        )
      })

      it('stays open after selection', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })

      it('emits Selected again when the same item is activated (parent toggles off)', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: true,
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'apple' })),
        )
      })

      it('emits Selected for each activated item', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.message(
            SelectedItem({
              item: 'banana',
              displayText: 'Banana',
              wasSelected: false,
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'banana' })),
        )
      })

      it('preserves active item after selection', () => {
        Story.story(
          update,
          givenOpenMulti,
          Story.message(
            ActivatedItem({
              index: 2,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.none(),
            }),
          ),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(
            SelectedItem({
              item: 'apple',
              displayText: 'Apple',
              wasSelected: false,
            }),
          ),
          Story.model(model => {
            expect(model.maybeActiveItemIndex).toStrictEqual(Option.some(2))
          }),
        )
      })
    })

    describe('Closed', () => {
      it('resets input to empty regardless of the resting input value', () => {
        Story.story(
          update,
          Story.given({
            ...init({ id: 'test' }),
            isOpen: true,
            inputValue: 'app',
          }),
          Story.message(Closed({ restingInputValue: 'Apple' })),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
            expect(model.inputValue).toBe('')
          }),
        )
      })

      it('emits ClearedSelection when nullable and input is empty', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', nullable: true })),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.message(Closed({ restingInputValue: '' })),
          Story.expectOutMessage(ClearedSelection()),
          Story.Command.resolve(FocusInput, CompletedFocusInput()),
          Story.model(model => {
            expect(model.isOpen).toBe(false)
          }),
        )
      })

      it('is a no-op when already closed', () => {
        const closedModel = { ...init({ id: 'test' }), inputValue: 'app' }

        Story.story(
          update,
          Story.given(closedModel),
          Story.message(Closed({ restingInputValue: 'Stale' })),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model).toStrictEqual(closedModel)
            expect(model.inputValue).toBe('app')
          }),
        )
      })
    })

    describe('handleImmediateActivation', () => {
      it('emits Selected on each immediate activation (parent toggles)', () => {
        Story.story(
          update,
          Story.given(init({ id: 'test', immediate: true })),
          Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
          Story.message(
            ActivatedItem({
              index: 0,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'apple',
              }),
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.message(
            ActivatedItem({
              index: 0,
              activationTrigger: 'Keyboard',
              maybeImmediateSelection: Option.some({
                item: 'apple',
              }),
            }),
          ),
          Story.expectOutMessage(Selected({ value: 'apple' })),
          Story.Command.resolve(ScrollIntoView, CompletedScrollIntoView()),
          Story.model(model => {
            expect(model.isOpen).toBe(true)
          }),
        )
      })
    })
  })

  describe('modal commands', () => {
    const givenOpenModal = flow(
      Story.given(init({ id: 'test', isModal: true })),
      Story.message(Opened({ maybeActiveItemIndex: Option.some(0) })),
      Story.Command.resolveAllExact(
        [LockScroll, CompletedLockScroll()],
        [InertOthers, CompletedInertOthers()],
      ),
    )

    it('unwinds modal commands when closed', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(Closed({ restingInputValue: '' })),
        Story.Command.resolveAllExact(
          [FocusInput, CompletedFocusInput()],
          [UnlockScroll, CompletedUnlockScroll()],
          [RestoreInert, CompletedRestoreInert()],
        ),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('stays open without unwinding modal commands after selection', () => {
      Story.story(
        update,
        givenOpenModal,
        Story.message(
          SelectedItem({
            item: 'apple',
            displayText: 'Apple',
            wasSelected: false,
          }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.expectOutMessage(Selected({ value: 'apple' })),
      )
    })
  })

  describe('view', () => {
    const closedModel = () => init({ id: 'test' })

    const openMultiModel = (): Model => {
      let model!: Model
      Story.story(
        update,
        givenOpenMulti,
        Story.model(extractedModel => {
          model = extractedModel
        }),
      )
      return model
    }

    const sceneView =
      (
        overrides: Omit<
          Partial<ViewInputs<string>>,
          'items' | 'itemToConfig' | 'itemToValue' | 'itemToDisplayText'
        > = {},
      ) =>
      (model: Model, h: HtmlBuilder<Message>) =>
        view(
          model,
          {
            items: ['Apple', 'Banana'],
            itemToConfig: () => ({
              content: null,
            }),
            itemToValue: item => item,
            itemToDisplayText: item => item,
            selectedValues: [],
            restingInputValue: '',
            ...overrides,
          },
          h,
        )

    describe('aria-multiselectable', () => {
      it('items container has aria-multiselectable', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(openMultiModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-items-container"]')).toHaveAttr(
              'aria-multiselectable',
              'true',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })
    })

    describe('multiple data-selected', () => {
      it('multiple items have data-selected', () => {
        Scene.scene(
          {
            update,
            view: sceneView({ selectedValues: ['Apple', 'Banana'] }),
          },
          Scene.given(openMultiModel()),
          Scene.tap(({ html }) => {
            expect(Scene.find(html, '[key="test-item-0"]')).toHaveAttr(
              'data-selected',
              '',
            )
            expect(Scene.find(html, '[key="test-item-1"]')).toHaveAttr(
              'data-selected',
              '',
            )
          }),
          acknowledgeAnchor,
          acknowledgeBackdrop,
        )
      })
    })

    describe('form integration', () => {
      it('renders multiple hidden inputs for multi-select', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              formName: 'fruit',
              selectedValues: ['Apple', 'Banana'],
            }),
          },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(2)
            expect(Option.some(inputs[0]!)).toHaveAttr('value', 'Apple')
            expect(Option.some(inputs[1]!)).toHaveAttr('value', 'Banana')
          }),
        )
      })

      it('renders empty hidden input when no items selected', () => {
        Scene.scene(
          { update, view: sceneView({ formName: 'fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const inputs = Scene.findAll(html, 'input[type="hidden"]')
            expect(inputs).toHaveLength(1)
            expect(Scene.find(html, 'input[type="hidden"]')).not.toHaveAttr(
              'value',
            )
          }),
        )
      })
    })

    describe('input labeling', () => {
      it('no aria-label or aria-labelledby on the input by default', () => {
        Scene.scene(
          { update, view: sceneView() },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).not.toHaveAttr('aria-label')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-label to the input when ariaLabel is provided', () => {
        Scene.scene(
          { update, view: sceneView({ ariaLabel: 'Fruit' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-label', 'Fruit')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('applies aria-labelledby to the input when ariaLabelledBy is provided', () => {
        Scene.scene(
          { update, view: sceneView({ ariaLabelledBy: 'fruit-label' }) },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-labelledby', 'fruit-label')
            expect(input).not.toHaveAttr('aria-label')
          }),
        )
      })

      it('prefers aria-label over aria-labelledby when both are provided', () => {
        Scene.scene(
          {
            update,
            view: sceneView({
              ariaLabel: 'Fruit',
              ariaLabelledBy: 'fruit-label',
            }),
          },
          Scene.given(closedModel()),
          Scene.tap(({ html }) => {
            const input = Scene.find(html, 'input[role="combobox"]')
            expect(input).toHaveAttr('aria-label', 'Fruit')
            expect(input).not.toHaveAttr('aria-labelledby')
          }),
        )
      })

      it('inputId derives the input id from the base id', () => {
        expect(inputId('test')).toBe('test-input')
      })
    })
  })
})
