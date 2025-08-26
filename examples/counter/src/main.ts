import { Console, Data, Duration, Effect, Function, Stream } from 'effect'
import {
  Class,
  command,
  Command,
  Html,
  OnClick,
  pure,
  pureCommand,
  button,
  div,
  fold,
  makeApp,
  makeCommand,
  input,
  Id,
  OnChange,
  Value,
  CommandStreams,
  Type,
  Min,
} from '@foldkit/core'

// MODEL

type Model = {
  count: number
  incrementIntervalSeconds: number
  decrementIntervalSeconds: number
}

const init: Model = {
  count: 0,
  incrementIntervalSeconds: 0,
  decrementIntervalSeconds: 0,
}

// UPDATE

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  IncrementLater: {}
  SetCount: SetCount
  LogAndSetCount: LogAndSetCount
  ChangeIncrementInterval: { incrementIntervalSeconds: number }
  ChangeDecrementInterval: { decrementIntervalSeconds: number }
  None: {}
}>
const Message = Data.taggedEnum<Message>()

type SetCount = { nextCount: number }
type LogAndSetCount = { nextCount: number; id: string }

const update = fold<Model, Message>({
  Decrement: pure((model) => ({ ...model, count: model.count - 1 })),
  Increment: pure((model) => ({ ...model, count: model.count + 1 })),
  IncrementLater: command(() => incrementLater('1 second')),
  SetCount: pure((model, { nextCount }) => ({ ...model, count: nextCount })),
  LogAndSetCount: pureCommand((model, { nextCount, id }) => [
    { ...model, count: nextCount },
    logCount({ count: nextCount, id }),
  ]),
  ChangeIncrementInterval: pure((model, { incrementIntervalSeconds }) => ({
    ...model,
    incrementIntervalSeconds,
  })),
  ChangeDecrementInterval: pure((model, { decrementIntervalSeconds }) => ({
    ...model,
    decrementIntervalSeconds,
  })),
  None: pure(Function.identity),
})

// COMMAND

const incrementLater = (duration: Duration.DurationInput): Command<Message> =>
  makeCommand(
    Effect.gen(function* () {
      yield* Console.log('Hold, please!')
      yield* Effect.sleep(duration)
      return Message.Increment()
    }),
  )

const logCount = ({ count, id }: { count: number; id: string }): Command<Message> =>
  makeCommand(
    Effect.gen(function* () {
      yield* Console.log(`${id}-${count}`)
      return Message.None()
    }),
  )

// COMMAND STREAM

const changeCountStream =
  (message: Message) =>
  (incrementIntervalSeconds: number): Stream.Stream<Command<Message>> =>
    Stream.when(
      Stream.tick(Duration.seconds(incrementIntervalSeconds)).pipe(
        Stream.drop(1),
        Stream.map(() => makeCommand(Effect.sync(() => message))),
      ),
      () => incrementIntervalSeconds > 0,
    )

type StreamDepsMap = {
  incrementTimer: number
  decrementTimer: number
}

const commandStreams: CommandStreams<Model, Message, StreamDepsMap> = {
  incrementTimer: {
    deps: (model: Model) => model.incrementIntervalSeconds,
    stream: changeCountStream(Message.Increment()),
  },
  decrementTimer: {
    deps: (model: Model) => model.decrementIntervalSeconds,
    stream: changeCountStream(Message.Decrement()),
  },
}

// VIEW

const handleChangeIncrementInterval = (value: string): Message =>
  Message.ChangeIncrementInterval({ incrementIntervalSeconds: parseInt(value) })

const handleChangeDecrementInterval = (value: string): Message =>
  Message.ChangeDecrementInterval({ decrementIntervalSeconds: parseInt(value) })

const view = (model: Model): Html =>
  div(
    [Class(pageStyle)],
    [
      div([Class(countStyle)], [model.count.toString()]),
      div(
        [Class(buttonRowStyle)],
        [
          button([OnClick(Message.Decrement()), Class(buttonStyle)], ['-']),
          button([OnClick(Message.SetCount({ nextCount: 0 })), Class(buttonStyle)], ['Reset']),
          button([OnClick(Message.IncrementLater()), Class(buttonStyle)], ['+ in 1s']),
          button([OnClick(Message.Increment()), Class(buttonStyle)], ['+']),
        ],
      ),
      div(
        [Class('flex flex-col gap-2')],
        [
          'Auto-increment every (seconds):',
          input([
            Id('increment-interval'),
            Value(model.incrementIntervalSeconds.toString()),
            OnChange(handleChangeIncrementInterval),
            Class('border p-2 rounded'),
            Type('number'),
            Min('0'),
          ]),
        ],
      ),
      div(
        [Class('flex flex-col gap-2')],
        [
          'Auto-decrement every (seconds):',
          input([
            Id('decrement-interval'),
            Value(model.decrementIntervalSeconds.toString()),
            OnChange(handleChangeDecrementInterval),
            Class('border p-2 rounded'),
            Type('number'),
            Min('0'),
          ]),
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

const app = makeApp({
  init,
  update,
  view,
  commandStreams,
  container: document.body,
})

Effect.runFork(app)
