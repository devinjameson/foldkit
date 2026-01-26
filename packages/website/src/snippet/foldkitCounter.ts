import { Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'

const Model = S.Number
type Model = typeof Model.Type

const Increment = ts('Increment')
const Message = S.Union(Increment)
type Message = typeof Message.Type

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      [Model, ReadonlyArray<Runtime.Command<Message>>]
    >(),
    M.tagsExhaustive({
      Increment: () => [model + 1, []],
    }),
  )

const { div, button, p, OnClick } = html<Message>()

const view = (model: Model): Html =>
  div(
    [],
    [
      p([], [`Count: ${model}`]),
      button([OnClick(Increment.make())], ['Increment']),
    ],
  )
