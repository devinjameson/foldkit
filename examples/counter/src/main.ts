import { Console, Data, Duration, Effect } from 'effect'
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
  Class,
  Html,
} from '@foldkit/core'

// MODEL

type Model = {
  count: number
}

const init: Model = {
  count: 0,
}

// UPDATE

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  IncrementLater: {}
  SetCount: SetCount
  LogAndSetCount: LogAndSetCount
  SaveCount: {}
  SaveSuccess: SaveSuccess
  None: {}
}>
const Message = Data.taggedEnum<Message>()

type SetCount = { count: number }
type LogAndSetCount = { count: number; id: string }
type SaveSuccess = { savedCount: number }

const update = match<Model, Message>({
  Decrement: ({ count }) => pure({ count: count - 1 }),
  Increment: ({ count }) => pure({ count: count + 1 }),
  IncrementLater: effect(() => incrementLater('1 second')),
  SetCount: (_, { count }) => pure({ count }),
  LogAndSetCount: (_, { count, id }) => pureEffect({ count }, () => logCount({ count, id })),
  SaveCount: ({ count }) => pureEffect({ count }, () => saveToServer(count)),
  SaveSuccess: (_, { savedCount }) =>
    pureEffect({ count: savedCount }, () => logSaveSuccess(savedCount)),
  None: pure,
})

// COMMAND

const incrementLater = (duration: Duration.DurationInput): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log('Hold, please!')
    yield* Effect.sleep(duration)
    return Message.Increment()
  })

const logCount = ({ count, id }: { count: number; id: string }): Command<Message> =>
  Effect.gen(function* () {
    yield* Console.log(`${id}-${count}`)
    return Message.None()
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
    return Message.None()
  })

// VIEW

const view = (model: Model): Html =>
  div(
    [Class(pageStyle)],
    [
      div([Class(countStyle)], [text(String(model.count))]),
      div(
        [Class(buttonRowStyle)],
        [
          button([OnClick(Message.Decrement()), Class(buttonStyle)], ['-']),
          button([OnClick(Message.SetCount({ count: 0 })), Class(buttonStyle)], ['Reset']),
          button([OnClick(Message.SaveCount()), Class(buttonStyle)], ['Save']),
          button([OnClick(Message.IncrementLater()), Class(buttonStyle)], ['+ in 1s']),
          button([OnClick(Message.Increment()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

// STYLE

const pageStyle =
  'min-h-screen bg-gradient-to-br from-indigo-100 via-sky-100 to-emerald-100 flex flex-col items-center justify-center gap-6 p-6'

const countStyle = 'text-6xl font-bold text-gray-800'

const buttonRowStyle = 'flex flex-wrap justify-center gap-4'

const buttonStyle = 'bg-black text-white hover:bg-gray-900 px-4 py-2 rounded-lg shadow transition'

// RUN

runApp<Model, Message>({
  init,
  update,
  view,
  container: document.body,
})
