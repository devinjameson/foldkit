import { Data, Duration, Effect, flow, Option, pipe, Stream, String } from 'effect'
import {
  fold,
  updateConstructors,
  makeElement,
  makeCommand,
  CommandStreams,
  ElementInit,
} from '@foldkit'
import { Html, div, Class, button, OnClick } from '@foldkit/html'

const TICK_INTERVAL_MS = 10

// MODEL

type Model = Readonly<{
  elapsedMs: number
  isRunning: boolean
  startTime: Option.Option<number>
}>

// UPDATE

type Message = Data.TaggedEnum<{
  Start: {}
  Stop: {}
  Reset: {}
  Tick: { currentTime: number }
}>

const Message = Data.taggedEnum<Message>()

const { pure } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  Start: pure((model) => ({
    ...model,
    isRunning: true,
    startTime: Option.some(Date.now() - model.elapsedMs),
  })),
  Stop: pure((model) => ({ ...model, isRunning: false })),
  Reset: pure(() => ({
    elapsedMs: 0,
    isRunning: false,
    startTime: Option.none(),
  })),
  Tick: pure((model, { currentTime }) =>
    Option.match(model.startTime, {
      onNone: () => model,
      onSome: (startTime) => ({ ...model, elapsedMs: currentTime - startTime }),
    }),
  ),
})

// INIT

const init: ElementInit<Model, Message> = () => [
  {
    elapsedMs: 0,
    isRunning: false,
    startTime: Option.none(),
  },
  Option.none(),
]

// COMMAND STREAM

type StreamDepsMap = {
  tick: boolean
}

const commandStreams: CommandStreams<Model, Message, StreamDepsMap> = {
  tick: {
    deps: (model: Model) => model.isRunning,
    stream: (isRunning: boolean) =>
      Stream.when(
        Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
          Stream.map(() =>
            makeCommand(Effect.sync(() => Message.Tick({ currentTime: Date.now() }))),
          ),
        ),
        () => isRunning,
      ),
  },
}

// VIEW

const formatTime = (ms: number): string => {
  const minutes = pipe(Duration.millis(ms), Duration.toMinutes, floorAndPad)

  const seconds = pipe(Duration.millis(ms % 60000), Duration.toSeconds, floorAndPad)

  const centiseconds = pipe(
    Duration.millis(ms % 1000),
    Duration.toMillis,
    (v) => v / 10,
    floorAndPad,
  )

  return `${minutes}:${seconds}.${centiseconds}`
}

const floorAndPad = flow(Math.floor, (v) => v.toString(), String.padStart(2, '0'))

const view = (model: Model): Html =>
  div(
    [Class('min-h-screen bg-gray-200 flex items-center justify-center')],
    [
      div(
        [Class('bg-white text-center')],
        [
          div(
            [Class('text-6xl font-mono font-bold text-gray-800 p-8')],
            [formatTime(model.elapsedMs)],
          ),
          div(
            [Class('flex')],
            [
              button(
                [OnClick(Message.Reset()), Class(buttonStyle + ' bg-gray-500 hover:bg-gray-600')],
                ['Reset'],
              ),
              startStopButton(model.isRunning),
            ],
          ),
        ],
      ),
    ],
  )

const startStopButton = (isRunning: boolean): Html =>
  isRunning
    ? button(
        [OnClick(Message.Stop()), Class(buttonStyle + ' bg-red-500 hover:bg-red-600')],
        ['Stop'],
      )
    : button(
        [OnClick(Message.Start()), Class(buttonStyle + ' bg-green-500 hover:bg-green-600')],
        ['Start'],
      )

// STYLE

const buttonStyle = 'px-6 py-4 flex-1 font-semibold text-white transition-colors'

// RUN

const app = makeElement({
  init,
  update,
  view,
  commandStreams,
  container: document.body,
})

Effect.runFork(app)
