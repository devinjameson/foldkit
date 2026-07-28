import { Match as M, Schema as S } from 'effect'

import * as CustomElement from '../../customElement/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// CUSTOM ELEMENT

export const hexColorPicker = CustomElement.define({
  tag: 'hex-color-picker',
  properties: {
    color: S.String,
  },
  events: {
    'color-changed': S.Struct({ value: S.String }),
  },
})

// MODEL

export const Model = S.Struct({ color: S.String })
export type Model = typeof Model.Type

// MESSAGE

export const ChangedColor = m('ChangedColor', { value: S.String })

export const Message = S.Union([ChangedColor])
export type Message = typeof Message.Type

// INIT

export const initialModel = Model.make({ color: '#000000' })

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ChangedColor: ({ value }) => [evo(model, { color: () => value }), []],
    }),
  )

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const picker = hexColorPicker.withMessage(h)

  return h.div(
    [],
    [
      picker(
        [
          picker.Color(model.color),
          picker.OnColorChanged(detail =>
            ChangedColor({ value: detail.value }),
          ),
        ],
        [],
      ),
      h.span([h.Role('status')], [model.color]),
    ],
  )
}

export const viewWithoutHandler = (
  model: Model,
  h: HtmlBuilder<Message>,
): Html => {
  const picker = hexColorPicker.withMessage(h)

  return h.div(
    [],
    [
      picker([picker.Color(model.color)], []),
      h.span([h.Role('status')], [model.color]),
    ],
  )
}
