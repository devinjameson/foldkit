import { Effect, Context, Ref, Equal, Queue, Option } from 'effect'

export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatch: (message: unknown) => Effect.Effect<void>
  }
>() {}

export type Command<Message> = Effect.Effect<Message, never, never>

export interface RuntimeConfig<Model, Message> {
  readonly init: Model
  readonly update: (model: Model) => (message: Message) => [Model, Option.Option<Command<Message>>]
  readonly view: (model: Model) => Effect.Effect<HTMLElement, never, Dispatch>
  readonly container: HTMLElement
}

export const makeRuntime = <Model, Message>({
  init,
  update,
  view,
  container,
}: RuntimeConfig<Model, Message>): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const messageQueue = yield* Queue.unbounded<Message>()
    const enqueue = (message: Message) => Queue.offer(messageQueue, message)

    const modelRef = yield* Ref.make<Model>(init)

    const render = (model: Model): Effect.Effect<void> =>
      Effect.gen(function* () {
        const htmlElement = yield* view(model)
        container.innerHTML = ''
        container.appendChild(htmlElement)
      }).pipe(
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

        const [nextModel, command] = update(currentModel)(message)

        yield* Option.match(command, {
          onNone: () => Effect.void,
          onSome: (command) => Effect.fork(command.pipe(Effect.flatMap(enqueue))),
        })

        if (!Equal.equals(currentModel, nextModel)) {
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
