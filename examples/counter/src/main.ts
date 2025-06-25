import { Console, Data, Duration, Effect } from 'effect'
import {
  Class,
  Command,
  CommandT,
  Html,
  OnClick,
  Pure,
  PureCommand,
  button,
  div,
  fold,
  makeApp,
  makeCommand,
  text,
} from '@foldkit/core'
import { ExtractTag } from 'effect/Types'

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

type SetCount = { nextCount: number }
type LogAndSetCount = { nextCount: number; id: string }
type SaveSuccess = { savedCount: number }

const SaveCount = PureCommand<Model, ExtractTag<Message, 'SaveCount'>, Message, Requirements>(
  ({ count }) => [{ count }, saveToServer(count)],
)

const update = fold<Model, Message, Requirements>({
  Decrement: Pure(({ count }) => ({ count: count - 1 })),
  Increment: Pure(({ count }) => ({ count: count + 1 })),
  IncrementLater: Command(() => incrementLater('1 second')),
  SetCount: Pure((_, { nextCount }) => ({ count: nextCount })),
  LogAndSetCount: PureCommand((_, { nextCount, id }) => [
    { count: nextCount },
    logCount({ count: nextCount, id }),
  ]),
  SaveCount,
  SaveSuccess: PureCommand((_, { savedCount }) => [
    { count: savedCount },
    logSaveSuccess(savedCount),
  ]),
  None: Pure((model) => model),
})

// COMMAND

const incrementLater = (duration: Duration.DurationInput): CommandT<Message, Requirements> =>
  makeCommand(
    Effect.gen(function* () {
      yield* Console.log('Hold, please!')
      yield* Effect.sleep(duration)
      return Message.Increment()
    }),
  )

const logCount = ({ count, id }: { count: number; id: string }): CommandT<Message, Requirements> =>
  makeCommand(
    Effect.gen(function* () {
      yield* Console.log(`${id}-${count}`)
      return Message.None()
    }),
  )

const saveToServer = (count: number): CommandT<Message, Requirements> =>
  makeCommand(
    Effect.gen(function* () {
      yield* Console.log(`Saving count...`)
      yield* Effect.sleep('2 seconds')
      return Message.SaveSuccess({ savedCount: count })
    }),
  )

const logSaveSuccess = (savedCount: number): CommandT<Message, Requirements> =>
  makeCommand(
    Effect.gen(function* () {
      yield* Console.log(`Saved ${savedCount}`)
      return Message.None()
    }),
  )

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
          button([OnClick(Message.SetCount({ nextCount: 0 })), Class(buttonStyle)], ['Reset']),
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

type Requirements = never

const app = makeApp({
  init,
  update,
  view,
  container: document.body,
})

Effect.runFork(app)
