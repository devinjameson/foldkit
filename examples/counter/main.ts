import { Console, Data, Effect, Option } from 'effect'
import { button, Command, div, OnClick, runApp, text, match } from '@foldkit/core'

type Model = {
  count: number
}

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  IncrementLater: {}
}>

const { Decrement, Increment, IncrementLater } = Data.taggedEnum<Message>()

const incrementLater: Command<Message> = Effect.gen(function* () {
  yield* Console.log('Just a sec!')
  yield* Effect.sleep('1 second')
  return Increment()
})

const update = match<Model, Message>({
  Decrement: (model) => [{ count: model.count - 1 }, Option.none()],
  Increment: (model) => [{ count: model.count + 1 }, Option.none()],
  IncrementLater: (model) => [model, Option.some(incrementLater)],
})

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
