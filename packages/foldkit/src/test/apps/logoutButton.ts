import { Option, Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'

// MODEL

export const Model = S.Struct({ label: S.String })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedLogout: {},
  CompletedAction: {},
})

export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  RequestedLogout: {},
})

export type OutMessage = typeof OutMessage.Type

// INIT

export const initialModel: Model = { label: 'Log out' }

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<
    readonly [Model, ReadonlyArray<never>, Option.Option<OutMessage>]
  >(message, {
    ClickedLogout: () => [model, [], Option.some(OutMessage.RequestedLogout())],
    CompletedAction: () => [model, [], Option.none()],
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button(
        [h.OnClick(Message.ClickedLogout()), h.Role('button')],
        [model.label],
      ),
    ],
  )
}
