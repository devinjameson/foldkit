import { Match as M, Number, Option, Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const Model = S.Struct({
  commits: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const Committed = m('Committed')

export const Message = S.Union([Committed])
export type Message = typeof Message.Type

// INIT

export const initialModel: Model = { commits: 0 }

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      Committed: () => [evo(model, { commits: Number.increment }), []],
    }),
  )

// VIEW

export const appId = 'selective-keys'

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [
      h.Id(appId),
      h.OnKeyDownPreventDefault(key =>
        key === 'Enter' ? Option.some(Committed()) : Option.none(),
      ),
    ],
    [h.span([h.Class('commits')], [`${model.commits}`])],
  )
