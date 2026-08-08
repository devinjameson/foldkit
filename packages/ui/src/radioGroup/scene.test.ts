import { Match as M, Option, Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const RADIO_ID = 'test'
const options: ReadonlyArray<string> = ['Brush', 'Fill', 'Eraser']

const SelectedOption = m('SelectedOption', { value: S.String })

const Message = S.Union([SelectedOption])
type Message = typeof Message.Type

type Model = Readonly<{ selectedValue: Option.Option<string> }>

const init: Model = { selectedValue: Option.none() }

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      SelectedOption: ({ value }) => [
        evo(model, { selectedValue: () => Option.some(value) }),
        [],
      ],
    }),
  )

const testView =
  ({
    disabledValue,
    isDisabled = false,
    isReadOnly = false,
  }: {
    disabledValue?: string
    isDisabled?: boolean
    isReadOnly?: boolean
  } = {}) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: RADIO_ID,
        selectedValue: model.selectedValue,
        options,
        ariaLabel: 'Tool',
        onSelect: value => SelectedOption({ value }),
        isOptionDisabled: value => value === disabledValue,
        isDisabled,
        isReadOnly,
        toView: ({ group, options: optionInfos }) =>
          h.div(
            [...group],
            optionInfos.map(option =>
              h.div(
                [...option.option],
                [h.span([...option.label], [option.value])],
              ),
            ),
          ),
      },
      h,
    )

const group = Scene.role('radiogroup')
const option = (index: number) => Scene.selector(`#${RADIO_ID}-option-${index}`)

describe('RadioGroup controlled view', () => {
  it('gives the first option a roving tabindex when nothing is selected', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given(init),
      Scene.expect(option(0)).toHaveAttr('tabIndex', '0'),
      Scene.expect(option(1)).toHaveAttr('tabIndex', '-1'),
      Scene.expect(option(0)).toHaveAttr('aria-checked', 'false'),
    )
  })

  it('checks the clicked option and dispatches the parent Message', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given(init),
      Scene.click(option(1)),
      Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
      Scene.expect(option(1)).toHaveAttr('data-checked', ''),
      Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
      Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
    )
  })

  it('moves the selection with the arrow keys', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ selectedValue: Option.some('Brush') }),
      Scene.keydown(option(0), 'ArrowDown'),
      Scene.expect(option(1)).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('selects the focused option on Space', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given(init),
      Scene.keydown(option(0), ' '),
      Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('skips a disabled option when navigating', () => {
    Scene.scene(
      { update, view: testView({ disabledValue: 'Eraser' }) },
      Scene.given({ selectedValue: Option.some('Fill') }),
      Scene.expect(option(2)).toHaveAttr('aria-disabled', 'true'),
      Scene.keydown(option(1), 'ArrowDown'),
      Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
    )
  })

  it('keeps the tab stop on an enabled option when the selection is disabled', () => {
    Scene.scene(
      { update, view: testView({ disabledValue: 'Brush' }) },
      Scene.given({ selectedValue: Option.some('Brush') }),
      Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(option(0)).toHaveAttr('tabIndex', '-1'),
      Scene.expect(option(1)).toHaveAttr('tabIndex', '0'),
    )
  })

  it('sets type button so a button option does not submit a form', () => {
    Scene.scene(
      { update, view: testView() },
      Scene.given({ selectedValue: Option.none() }),
      Scene.expect(option(0)).toHaveAttr('type', 'button'),
      Scene.expect(option(1)).toHaveAttr('type', 'button'),
    )
  })

  it('keeps type button on a disabled option', () => {
    Scene.scene(
      { update, view: testView({ disabledValue: 'Brush' }) },
      Scene.given({ selectedValue: Option.none() }),
      Scene.expect(option(0)).toHaveAttr('type', 'button'),
    )
  })

  it('emits read-only attributes without disabled attributes', () => {
    Scene.scene(
      { update, view: testView({ isReadOnly: true }) },
      Scene.given({ selectedValue: Option.some('Brush') }),
      Scene.expect(group).toHaveAttr('aria-readonly', 'true'),
      Scene.expect(group).toHaveAttr('data-readonly', ''),
      Scene.expect(option(0)).toHaveAttr('data-readonly', ''),
      Scene.expect(option(0)).not.toHaveAttr('aria-disabled'),
      Scene.expect(option(0)).not.toHaveAttr('data-disabled'),
    )
  })

  it('keeps arrow navigation without changing the selection', () => {
    Scene.scene(
      { update, view: testView({ isReadOnly: true }) },
      Scene.given({ selectedValue: Option.some('Brush') }),
      Scene.expect(option(1)).toHaveHandler('keydown'),
      Scene.keydown(option(0), 'ArrowDown'),
      Scene.expect(option(0)).toHaveAttr('aria-checked', 'true'),
      Scene.expect(option(1)).toHaveAttr('aria-checked', 'false'),
    )
  })

  it('ignores Space when read-only', () => {
    Scene.scene(
      { update, view: testView({ isReadOnly: true }) },
      Scene.given(init),
      Scene.keydown(option(0), ' '),
      Scene.expect(option(0)).toHaveAttr('aria-checked', 'false'),
    )
  })

  it('drops the click handler when read-only', () => {
    Scene.scene(
      { update, view: testView({ isReadOnly: true }) },
      Scene.given(init),
      Scene.expect(option(0)).not.toHaveHandler('click'),
      Scene.expect(option(0)).toHaveAttr('tabIndex', '0'),
    )
  })

  it('emits both attribute sets when disabled and read-only are combined', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true, isReadOnly: true }) },
      Scene.given({ selectedValue: Option.some('Brush') }),
      Scene.expect(group).toHaveAttr('aria-readonly', 'true'),
      Scene.expect(group).toHaveAttr('data-readonly', ''),
      Scene.expect(option(0)).toHaveAttr('aria-disabled', 'true'),
      Scene.expect(option(0)).toHaveAttr('data-disabled', ''),
      Scene.expect(option(0)).toHaveAttr('data-readonly', ''),
      Scene.expect(option(0)).not.toHaveHandler('keydown'),
    )
  })
})
