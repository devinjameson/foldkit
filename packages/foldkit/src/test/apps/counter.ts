import { Array, Effect, Number, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const Model = S.Struct({
  count: S.Number,
  log: S.Array(S.Number),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedDecrement: {},
  ClickedFetch: {},
  ClickedFetchById: { id: S.Number },
  Ticked: {},
  PolledCount: {},
  StartedThreeFetches: {},
  StartedTwoFetchesById: {},
  StartedMixedFetches: {},
  SucceededFetchCount: { count: S.Number },
  FailedFetchCount: { error: S.String },
})

export type Message = typeof Message.Type

// COMMAND

export const FetchCount = Command.define('FetchCount', {
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  execute: Effect.sync(() => Message.SucceededFetchCount({ count: 0 })),
})

export const FetchCountById = Command.define('FetchCountById', {
  args: { id: S.Number },
  messages: [Message.SucceededFetchCount, Message.FailedFetchCount],
  execute: ({ id }) =>
    Effect.sync(() => Message.SucceededFetchCount({ count: id })),
})

// INIT

export const initialModel: Model = { count: 0, log: [] }

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<readonly [Model, ReadonlyArray<Command.Command<Message>>]>(
    message,
    {
      ClickedIncrement: () => [evo(model, { count: Number.increment }), []],
      ClickedDecrement: () => [evo(model, { count: Number.decrement }), []],
      ClickedFetch: () => [model, [FetchCount()]],
      ClickedFetchById: ({ id }) => [model, [FetchCountById({ id })]],
      Ticked: () => [evo(model, { count: Number.increment }), []],
      PolledCount: () => [model, [FetchCount()]],
      StartedThreeFetches: () => [
        model,
        [FetchCount(), FetchCount(), FetchCount()],
      ],
      StartedTwoFetchesById: () => [
        model,
        [FetchCountById({ id: 5 }), FetchCountById({ id: 5 })],
      ],
      StartedMixedFetches: () => [
        model,
        [
          FetchCount(),
          FetchCount(),
          FetchCountById({ id: 99 }),
          FetchCountById({ id: 99 }),
        ],
      ],
      SucceededFetchCount: ({ count }) => [
        evo(model, { count: () => count, log: Array.append(count) }),
        [],
      ],
      FailedFetchCount: () => [model, []],
    },
  )

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.span([h.Role('status')], [`count: ${model.count}`]),
      h.button(
        [h.OnClick(Message.StartedThreeFetches()), h.Role('button')],
        ['Start three fetches'],
      ),
      h.button(
        [h.OnClick(Message.StartedTwoFetchesById()), h.Role('button')],
        ['Start two fetches by id'],
      ),
    ],
  )
}
