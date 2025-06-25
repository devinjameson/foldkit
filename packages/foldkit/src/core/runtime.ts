import { Effect, Context, Ref, Equal, Queue, Option } from 'effect'
import { Covariant } from 'effect/Types'
import { FoldReturn } from './fold'
import { Html } from './html'

export type WithDefault<R> = R | Dispatch

export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatch: (message: unknown) => Effect.Effect<void>
  }
>() {}

export interface CommandT<Message, R> {
  readonly effect: Effect.Effect<Message, never, R>
  readonly _Message: Covariant<Message>
}

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
const phantomCovariant = <T>(): Covariant<T> => undefined as any

export const makeCommand = <Message, R>(
  effect: Effect.Effect<Message, never, R>,
): CommandT<Message, R> => ({
  effect,
  _Message: phantomCovariant<Message>(),
})

export interface RuntimeConfig<Model, Message, R> {
  readonly init: Model
  readonly update: FoldReturn<Model, Message, R>
  readonly view: (model: Model) => Html<R>
  readonly container: HTMLElement
}

export const makeRuntime = <Model, Message, R>({
  init,
  update,
  view,
  container,
}: RuntimeConfig<Model, Message, R>): Effect.Effect<void, never, Exclude<R, Dispatch>> =>
  Effect.gen(function* () {
    const messageQueue = yield* Queue.unbounded<Message>()
    const enqueue = (message: Message) => Queue.offer(messageQueue, message)

    const modelRef = yield* Ref.make<Model>(init)

    const render = (model: Model) =>
      view(model).pipe(
        Effect.tap((htmlElement) =>
          Effect.sync(() => {
            container.innerHTML = ''
            container.appendChild(htmlElement)
          }),
        ),
        Effect.provideService(Dispatch, {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          dispatch: (message: unknown) => enqueue(message as Message),
        }),
      )

    yield* render(init)

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    yield* Effect.forever(
      Effect.gen(function* () {
        const message = yield* Queue.take(messageQueue)

        const currentModel = yield* Ref.get(modelRef)

        const [nextModel, command] = update(currentModel, message)

        yield* Option.match(command, {
          onNone: () => Effect.void,
          onSome: (command) => Effect.forkDaemon(command.effect.pipe(Effect.flatMap(enqueue))),
        })

        if (!Equal.equals(currentModel, nextModel)) {
          yield* Ref.set(modelRef, nextModel)
          yield* render(nextModel)
        }
      }),
    ) as Effect.Effect<void, never, Exclude<R, Dispatch>>
  })

export const makeApp = <Model, Message extends { _tag: string }, R>(
  config: RuntimeConfig<Model, Message, R>,
): Effect.Effect<void, never, Exclude<R, Dispatch>> => makeRuntime(config)
