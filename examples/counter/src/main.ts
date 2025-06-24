import { Console, Data, Effect } from 'effect'
import {
  button,
  Command,
  div,
  OnClick,
  runApp,
  text,
  match,
  pure,
  effect,
  pureEffect,
} from '@foldkit/core'
import { DurationInput } from 'effect/Duration'

// --- MODEL

type Model = {
  count: number
}

const init: Model = {
  count: 0,
}

// --- UPDATE

type SetCountPayload = { count: number }
type SetCountWithLogPayload = { count: number; id: string }
type SaveSuccessPayload = { savedCount: number }

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  IncrementLater: {}
  SetCount: SetCountPayload
  SetCountWithLog: SetCountWithLogPayload
  SaveCount: {}
  SaveSuccess: SaveSuccessPayload
  Noop: {}
}>
const Message = Data.taggedEnum<Message>()

const incrementLater = (duration: DurationInput): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log('Hold, please!')
    yield* Effect.sleep(duration)
    return Message.Increment()
  })

const logCount = ({ count, id }: { count: number; id: string }): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`${id}-${count}`)
    return Message.Noop()
  })

const saveToServer = (count: number): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`Saving count...`)
    yield* Effect.sleep('2 seconds')
    return Message.SaveSuccess({ savedCount: count })
  })

const logSaveSuccess = (savedCount: number): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`Saved ${savedCount}`)
    return Message.Noop()
  })

const update = match<Model, Message>({
  Decrement: ({ count }) => pure({ count: count - 1 }),
  Increment: ({ count }) => pure({ count: count + 1 }),
  IncrementLater: effect(incrementLater('1 second')),

  SetCount: (_, { count }) => pure({ count }),
  SetCountWithLog: (_, { count, id }) => pureEffect({ count }, logCount({ count, id })),

  SaveCount: ({ count }) => pureEffect({ count }, saveToServer(count)),
  SaveSuccess: (_, { savedCount }) => pureEffect({ count: savedCount }, logSaveSuccess(savedCount)),

  Noop: pure,
})

// --- VIEW

const view = (model: Model) =>
  div(
    [],
    [
      text(String(model.count)),
      button([OnClick(Message.Decrement())], ['-']),
      button([OnClick(Message.Increment())], ['+']),
      button([OnClick(Message.IncrementLater())], ['+ in 1s']),
      button([OnClick(Message.SetCount({ count: 0 }))], ['Reset']),
      button([OnClick(Message.SaveCount())], ['Save']),
    ],
  )

// --- RUN

runApp<Model, Message>({
  init,
  update,
  view,
  container: document.body,
})
