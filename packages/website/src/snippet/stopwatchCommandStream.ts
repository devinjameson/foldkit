import { Duration, Effect, Schema as S, Stream } from 'effect'
import { Runtime } from 'foldkit'
import { m } from 'foldkit/message'

// MESSAGE

const Ticked = m('Ticked')
const Message = S.Union(Ticked)
type Message = typeof Message.Type

// MODEL

const Model = S.Struct({
  isRunning: S.Boolean,
  elapsed: S.Number,
})

type Model = typeof Model.Type

// COMMAND STREAM

const CommandStreamsDeps = S.Struct({
  tick: S.Struct({
    isRunning: S.Boolean,
  }),
})

const commandStreams = Runtime.makeCommandStreams(CommandStreamsDeps)<
  Model,
  Message
>({
  tick: {
    modelToDeps: model => ({ isRunning: model.isRunning }),
    depsToStream: ({ isRunning }) =>
      Stream.when(
        Stream.tick(Duration.millis(100)).pipe(
          Stream.map(() => Effect.succeed(Ticked())),
        ),
        () => isRunning,
      ),
  },
})
