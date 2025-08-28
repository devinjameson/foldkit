import {
  Effect,
  Context,
  Ref,
  Equal,
  Queue,
  Option,
  Stream,
  Record,
  pipe,
  PubSub,
  Predicate,
} from 'effect'

import { FoldReturn } from './fold'
import { Html } from './html'
import { VNode, patch } from './vdom'
import { h } from 'snabbdom'

export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatch: (message: unknown) => Effect.Effect<void>
  }
>() {}

export interface Command<Message> {
  readonly effect: Effect.Effect<Message>
}

export const makeCommand = <Message>(effect: Effect.Effect<Message>): Command<Message> => ({
  effect,
})

export interface RuntimeConfig<Model, Message, StreamDepsMap extends Record<string, unknown>> {
  readonly init: () => [Model, Option.Option<Command<Message>>]
  readonly update: FoldReturn<Model, Message>
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
}

export type CommandStreamConfig<Model, Message, StreamDeps> = {
  readonly deps: (model: Model) => StreamDeps
  readonly stream: (deps: StreamDeps) => Stream.Stream<Command<Message>>
}

export type CommandStreams<Model, Message, StreamDepsMap extends Record<string, unknown>> = {
  readonly [K in keyof StreamDepsMap]: CommandStreamConfig<Model, Message, StreamDepsMap[K]>
}

export const makeRuntime = <Model, Message, StreamDepsMap extends Record<string, unknown>>({
  init,
  update,
  view,
  commandStreams,
  container,
}: RuntimeConfig<Model, Message, StreamDepsMap>): Effect.Effect<void> =>
  Effect.gen(function* () {
    const messageQueue = yield* Queue.unbounded<Message>()
    const enqueueMessage = (message: Message) => Queue.offer(messageQueue, message)

    const modelPubSub = yield* PubSub.unbounded<Model>()
    const publishModel = (model: Model) => PubSub.publish(modelPubSub, model)

    const modelStream = Stream.fromPubSub(modelPubSub)

    const [initModel, initCommand] = init()

    yield* Option.match(initCommand, {
      onNone: () => Effect.void,
      onSome: (command) => Effect.forkDaemon(command.effect.pipe(Effect.flatMap(enqueueMessage))),
    })

    const modelRef = yield* Ref.make<Model>(initModel)

    const previousVNodeRef = yield* Ref.make<Option.Option<VNode>>(Option.none())

    if (commandStreams) {
      yield* pipe(
        Record.toEntries(commandStreams),
        Effect.forEach(([_key, { deps, stream }]) =>
          Effect.forkDaemon(
            modelStream.pipe(
              Stream.map(deps),
              Stream.changes,
              Stream.flatMap(stream, { switch: true }),
              Stream.runForEach(({ effect }) => effect.pipe(Effect.flatMap(enqueueMessage))),
            ),
          ),
        ),
      )
    }

    const render = (model: Model) =>
      view(model).pipe(
        Effect.flatMap((newVNode) =>
          Effect.gen(function* () {
            const previousVNode = yield* Ref.get(previousVNodeRef)

            const patchedVNode = yield* Effect.sync(() => {
              const vnode = Predicate.isNotNull(newVNode) ? newVNode : h('#text', {}, '')
              return Option.match(previousVNode, {
                onNone: () => patch(container, vnode),
                onSome: (prev) => patch(prev, vnode),
              })
            })

            yield* Ref.set(previousVNodeRef, Option.some(patchedVNode))
          }),
        ),
        Effect.provideService(Dispatch, {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          dispatch: (message: unknown) => enqueueMessage(message as Message),
        }),
      )

    yield* render(initModel)

    yield* Effect.forever(
      Effect.gen(function* () {
        const message = yield* Queue.take(messageQueue)

        const currentModel = yield* Ref.get(modelRef)

        const [nextModel, command] = update(currentModel, message)

        yield* Option.match(command, {
          onNone: () => Effect.void,
          onSome: (command) =>
            Effect.forkDaemon(command.effect.pipe(Effect.flatMap(enqueueMessage))),
        })

        if (!Equal.equals(currentModel, nextModel)) {
          yield* Ref.set(modelRef, nextModel)
          yield* render(nextModel)
          yield* publishModel(nextModel)
        }
      }),
    )
  })

export const makeApp = <
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Record<string, unknown>,
>(
  config: RuntimeConfig<Model, Message, StreamDepsMap>,
): Effect.Effect<void, never, never> => makeRuntime(config)
