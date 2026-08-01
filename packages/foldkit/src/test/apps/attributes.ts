import { Match as M, Schema as S } from 'effect'

import type { Attribute, Html, HtmlBuilder } from '../../html/index.js'
import { m } from '../../message/index.js'

// MESSAGE

export const IgnoredInteraction = m('IgnoredInteraction')

export const Message = S.Union([IgnoredInteraction])
export type Message = typeof Message.Type

// MODEL

export type Model = Readonly<{ attribute: Attribute<Message> }>

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      IgnoredInteraction: () => [model, []],
    }),
  )

// VIEW

const TEST_ID = 'attribute-host'

export const testId = TEST_ID

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div([h.DataAttribute('testid', TEST_ID), model.attribute])
}
