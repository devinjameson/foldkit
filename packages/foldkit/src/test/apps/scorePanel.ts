import { Match as M, Number, Schema as S } from 'effect'

import type { Html } from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import { defineView } from '../../submodel/public.js'

// MODEL

export const Model = S.Struct({ score: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const ClickedIncrement = m('ClickedIncrement')

export const Message = S.Union([ClickedIncrement])
export type Message = typeof Message.Type

// INIT

export const initialModel = Model.make({ score: 0 })

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      ClickedIncrement: () => [evo(model, { score: Number.increment }), []],
    }),
  )

// VIEW

export type ViewInputs = Readonly<{
  label: string
  toView: (content: Readonly<{ label: string; score: number }>) => Html
}>

export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h) =>
    h.div(
      [],
      [
        viewInputs.toView({ label: viewInputs.label, score: model.score }),
        h.button(
          [h.OnClick(ClickedIncrement()), h.Role('button')],
          ['Increment'],
        ),
      ],
    ),
)
