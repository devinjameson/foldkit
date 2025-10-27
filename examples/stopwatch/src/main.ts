import {
  Clock,
  Duration,
  Effect,
  Match as M,
  Schema as S,
  Stream,
  String,
  flow,
  pipe,
} from 'effect'
import { Runtime } from 'foldkit'
import { Class, Html, OnClick, button, div } from 'foldkit/html'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const TICK_INTERVAL_MS = 10

// MODEL

const Model = S.Struct({
  elapsedMs: S.Number,
  isRunning: S.Boolean,
  startTime: S.Number,
})
type Model = typeof Model.Type

// UPDATE

const RequestStart = ts('RequestStart')
const GotStartTime = ts('GotStartTime', { startTime: S.Number })
const Stop = ts('Stop')
const Reset = ts('Reset')
const RequestTick = ts('RequestTick')
const GotTick = ts('GotTick', { elapsedMs: S.Number })

export const Message = S.Union(RequestStart, GotStartTime, Stop, Reset, RequestTick, GotTick)

type RequestStart = typeof RequestStart.Type
type GotStartTime = typeof GotStartTime.Type
type Stop = typeof Stop.Type
type Reset = typeof Reset.Type
type RequestTick = typeof RequestTick.Type
type GotTick = typeof GotTick.Type

export type Message = typeof Message.Type

const update = (model: Model, message: Message): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      RequestStart: () => [
        model,
        [
          Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis
            return GotStartTime.make({ startTime: now - model.elapsedMs })
          }),
        ],
      ],

      GotStartTime: ({ startTime }) => [
        evo(model, {
          isRunning: () => true,
          startTime: () => startTime,
        }),
        [],
      ],

      Stop: () => [
        evo(model, {
          isRunning: () => false,
        }),
        [],
      ],

      Reset: () => [
        evo(model, {
          elapsedMs: () => 0,
          isRunning: () => false,
          startTime: () => 0,
        }),
        [],
      ],

      RequestTick: () => [
        model,
        [
          Effect.gen(function* () {
            const now = yield* Clock.currentTimeMillis
            return GotTick.make({ elapsedMs: now - model.startTime })
          }),
        ],
      ],

      GotTick: ({ elapsedMs }) => [
        evo(model, {
          elapsedMs: () => elapsedMs,
        }),
        [],
      ],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    elapsedMs: 0,
    isRunning: false,
    startTime: 0,
  },
  [],
]

// COMMAND STREAM

const CommandStreamsDeps = S.Struct({
  tick: S.Struct({
    isRunning: S.Boolean,
  }),
})

const commandStreams = Runtime.makeCommandStreams(CommandStreamsDeps)<Model, Message>({
  tick: {
    modelToDeps: (model: Model) => ({ isRunning: model.isRunning }),
    depsToStream: ({ isRunning }) =>
      Stream.when(
        Stream.tick(Duration.millis(TICK_INTERVAL_MS)).pipe(
          Stream.map(() => Effect.succeed(RequestTick.make())),
        ),
        () => isRunning,
      ),
  },
})

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
        [OnClick(RequestStart.make()), Class(buttonStyle + ' bg-green-500 hover:bg-green-600')],
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

Runtime.run(element)
