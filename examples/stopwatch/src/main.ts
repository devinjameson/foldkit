import { Duration, Effect, Option, Schema as S, Stream, String, flow, pipe } from 'effect'
import { Fold, Runtime } from 'foldkit'
import { Class, Html, OnClick, button, div } from 'foldkit/html'
import { ST, ts } from 'foldkit/schema'

const TICK_INTERVAL_MS = 10

// MODEL

const Model = S.Struct({
  elapsedMs: S.Number,
  isRunning: S.Boolean,
  startTime: S.Option(S.Number),
})
type Model = ST<typeof Model>

// UPDATE

const Start = ts('Start')
const Stop = ts('Stop')
const Reset = ts('Reset')
const Tick = ts('Tick', {
  currentTime: S.Number,
})

export const Message = S.Union(Start, Stop, Reset, Tick)

type Start = ST<typeof Start>
type Stop = ST<typeof Stop>
type Reset = ST<typeof Reset>
type Tick = ST<typeof Tick>

export type Message = ST<typeof Message>

const update = Fold.fold<Model, Message>({
  Start: (model) => [
    {
      ...model,
      isRunning: true,
      startTime: Option.some(Date.now() - model.elapsedMs),
    },
    [],
  ],

  Stop: (model) => [{ ...model, isRunning: false }, []],

  Reset: () => [
    {
      elapsedMs: 0,
      isRunning: false,
      startTime: Option.none(),
    },
    [],
  ],

  Tick: (model, { currentTime }) => [
    Option.match(model.startTime, {
      onNone: () => model,
      onSome: (startTime) => ({ ...model, elapsedMs: currentTime - startTime }),
    }),
    [],
  ],
})

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    elapsedMs: 0,
    isRunning: false,
    startTime: Option.none(),
  },
  [],
]

// COMMAND STREAM

type StreamDepsMap = {
  tick: boolean
}

const commandStreams: Runtime.CommandStreams<Model, Message, StreamDepsMap> = {
  tick: {
    deps: (model: Model) => model.isRunning,
    stream: (isRunning: boolean) =>
      Stream.when(
        Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
          Stream.map(() => Effect.sync(() => Tick.make({ currentTime: Date.now() }))),
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
                [OnClick(Reset.make()), Class(buttonStyle + ' bg-gray-500 hover:bg-gray-600')],
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
    ? button([OnClick(Stop.make()), Class(buttonStyle + ' bg-red-500 hover:bg-red-600')], ['Stop'])
    : button(
        [OnClick(Start.make()), Class(buttonStyle + ' bg-green-500 hover:bg-green-600')],
        ['Start'],
      )

// STYLE

const buttonStyle = 'px-6 py-4 flex-1 font-semibold text-white transition-colors'

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  commandStreams,
  container: document.getElementById('root')!,
})

Effect.runFork(element)
