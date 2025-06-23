import { Data, Effect, Match, Option } from 'effect'
import { button, Command, div, OnClick, runApp, text } from '@foldkit/core'

type Model = {
  count: number
}

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  IncrementLater: {}
}>

const { Decrement, Increment, IncrementLater } = Data.taggedEnum<Message>()

const update = (model: Model) =>
  Match.type<Message>().pipe(
    Match.withReturnType<[Model, Option.Option<Command<Message>>]>(),
    Match.tagsExhaustive({
      Decrement: () => [{ count: model.count - 1 }, Option.none()],
      Increment: () => [{ count: model.count + 1 }, Option.none()],
      IncrementLater: () => [model, Option.some(incrementLater)],
    }),
  )

const incrementLater: Command<Message> = Effect.sleep('1 second').pipe(Effect.map(Increment))

const view = (model: Model) =>
  div(
    [],
    [
      text(String(model.count)),
      button([OnClick(Decrement())], ['-']),
      button([OnClick(Increment())], ['+']),
      button([OnClick(IncrementLater())], ['+ in 1s']),
    ],
  )

runApp<Model, Message>({
  init: { count: 0 },
  update,
  view,
  container: document.body,
})
