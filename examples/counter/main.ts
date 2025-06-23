import { Data, Match, Option } from 'effect'
import { button, Cmd, div, OnClick, runApp, text } from '@foldkit/core'

type Model = {
  count: number
}

type Message = Data.TaggedEnum<{
  Increment: {}
  Decrement: {}
}>

const Message = Data.taggedEnum<Message>()

const update = (model: Model) =>
  Match.type<Message>().pipe(
    Match.withReturnType<[Model, Option.Option<Cmd<Message>>]>(),
    Match.tagsExhaustive({
      Increment: () => [{ count: model.count + 1 }, Option.none()],
      Decrement: () => [{ count: model.count - 1 }, Option.none()],
    }),
  )

const view = (model: Model) =>
  div(
    [],
    [
      text(String(model.count)),
      button([OnClick(Message.Decrement())], ['-']),
      button([OnClick(Message.Increment())], ['+']),
    ],
  )

runApp<Model, Message>({
  init: { count: 0 },
  update,
  view,
  container: document.body,
})
