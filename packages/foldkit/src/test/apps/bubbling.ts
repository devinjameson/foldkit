import { Number, Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = S.Struct({
  clicks: S.Number,
  doubleClicks: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedContainer: {},
  DoubleClickedContainer: {},
})
type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  clicks: 0,
  doubleClicks: 0,
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedContainer: () => ({
      model: evo(model, { clicks: Number.increment }),
    }),
    DoubleClickedContainer: () => ({
      model: evo(model, { doubleClicks: Number.increment }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.div(
        [h.Role('option'), h.OnClick(Message.ClickedContainer())],
        [h.span([], [`clicks=${model.clicks}`])],
      ),
      h.div(
        [h.Role('listitem'), h.OnDoubleClick(Message.DoubleClickedContainer())],
        [h.span([], [`dbl=${model.doubleClicks}`])],
      ),
    ],
  )
}
