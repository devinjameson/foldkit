import { Effect, Context, Ref, Equal, Queue, Option } from 'effect'

export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatch: (message: unknown) => Effect.Effect<void>
  }
>() {}

export type Cmd<Message> = Effect.Effect<Message, never, never>

export interface RuntimeConfig<Model, Message> {
  readonly init: Model
  readonly update: (model: Model) => (message: Message) => [Model, Option.Option<Cmd<Message>>]
  readonly view: (model: Model) => Effect.Effect<HTMLElement, never, Dispatch>
  readonly container: HTMLElement
}

export const makeRuntime = <Model, Message>(
  config: RuntimeConfig<Model, Message>,
): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const messageQueue = yield* Queue.unbounded<Message>()

    const modelRef = yield* Ref.make<Model>(config.init)

    const internalDispatch = (message: Message): Effect.Effect<void> =>
      Queue.offer(messageQueue, message)

    const render = (model: Model): Effect.Effect<void> =>
      Effect.gen(function* () {
        const view = yield* config.view(model)
        config.container.innerHTML = ''
        config.container.appendChild(view)
      }).pipe(
        Effect.provideService(Dispatch, {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          dispatch: (message: unknown) => internalDispatch(message as Message),
        }),
      )

    yield* render(config.init)

    yield* Effect.forever(
      Effect.gen(function* () {
        const message = yield* Queue.take(messageQueue)

        const currentModel = yield* Ref.get(modelRef)

        const [nextModel] = config.update(currentModel)(message)

        const shouldUpdate = !Equal.equals(currentModel, nextModel)

        if (shouldUpdate) {
          yield* Ref.set(modelRef, nextModel)

          yield* render(nextModel)
        }
      }),
    )
  })

export const runApp = <Model, Message>(config: RuntimeConfig<Model, Message>): void => {
  const runtime = makeRuntime(config)
  Effect.runSync(runtime)
}
