import { Effect, Context, Ref, Equal, Queue, Option } from 'effect'
import { Covariant } from 'effect/Types'
import { FoldReturn } from './fold'
import { Html } from './html'

export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatch: (message: unknown) => Effect.Effect<void>
  }
>() {}

export interface CommandT<Message> {
  readonly effect: Effect.Effect<Message>
  readonly _Message: Covariant<Message>
}

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
const phantomCovariant = <T>(): Covariant<T> => undefined as any

export const makeCommand = <Message>(effect: Effect.Effect<Message>): CommandT<Message> => ({
  effect,
  _Message: phantomCovariant<Message>(),
})

export interface RuntimeConfig<Model, Message> {
  readonly init: Model
  readonly update: FoldReturn<Model, Message>
  readonly view: (model: Model) => Html
  readonly container: HTMLElement
}

export const makeRuntime = <Model, Message>({
  init,
  update,
  view,
  container,
}: RuntimeConfig<Model, Message>): Effect.Effect<void> =>
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
    )
  })

export const makeApp = <Model, Message extends { _tag: string }>(
  config: RuntimeConfig<Model, Message>,
): Effect.Effect<void, never, never> => makeRuntime(config)
