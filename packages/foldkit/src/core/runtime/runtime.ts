import {
  Context,
  Effect,
  Either,
  Exit,
  Option,
  Predicate,
  PubSub,
  Queue,
  Record,
  Ref,
  Schema,
  Scope,
  Stream,
  pipe,
} from 'effect'
import { h } from 'snabbdom'

import { FoldReturn } from '../fold'
import { Html } from '../html'
import { Url, UrlRequest } from '../urlRequest'
import { VNode, patch } from '../vdom'
import { addNavigationEventListeners } from './addNavigationEventListeners'

export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatch: (message: unknown) => Effect.Effect<void>
  }
>() {}

export type Command<Message> = Effect.Effect<Message>

export type BrowserConfig<Message> = {
  readonly onUrlRequest: (request: UrlRequest) => Message
  readonly onUrlChange: (url: Url) => Message
}

export interface RuntimeConfig<Model, Message, StreamDepsMap extends Record<string, unknown>> {
  Model: Schema.Schema<Model, any, never>
  readonly init: (url?: Url) => [Model, Command<Message>[]]
  readonly update: FoldReturn<Model, Message>
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
  readonly browser?: BrowserConfig<Message>
}

export type ElementInit<Model, Message> = () => [Model, Command<Message>[]]
export type ApplicationInit<Model, Message> = (url: Url) => [Model, Command<Message>[]]

export interface ElementConfig<Model, Message, StreamDepsMap extends Record<string, unknown>> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly init: ElementInit<Model, Message>
  readonly update: FoldReturn<Model, Message>
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
}

export interface ApplicationConfig<Model, Message, StreamDepsMap extends Record<string, unknown>> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly init: ApplicationInit<Model, Message>
  readonly update: FoldReturn<Model, Message>
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
  readonly browser: BrowserConfig<Message>
}

export type CommandStreamConfig<Model, Message, StreamDeps> = {
  readonly deps: (model: Model) => StreamDeps
  readonly stream: (deps: StreamDeps) => Stream.Stream<Command<Message>>
}

export type CommandStreams<Model, Message, StreamDepsMap extends Record<string, unknown>> = {
  readonly [K in keyof StreamDepsMap]: CommandStreamConfig<Model, Message, StreamDepsMap[K]>
}

type MakeRuntimeReturn = (hmrModel?: unknown) => Effect.Effect<void>

export const makeRuntime =
  <Model, Message, StreamDepsMap extends Record<string, unknown>>({
    Model,
    init,
    update,
    view,
    commandStreams,
    container,
    browser: browserConfig,
  }: RuntimeConfig<Model, Message, StreamDepsMap>): MakeRuntimeReturn =>
  (hmrModel?: unknown) =>
    Effect.gen(function* () {
      const modelEquivalence = Schema.equivalence(Model)

      const messageQueue = yield* Queue.unbounded<Message>()
      const enqueueMessage = (message: Message) => Queue.offer(messageQueue, message)

      const modelPubSub = yield* PubSub.unbounded<Model>()
      const publishModel = (model: Model) => PubSub.publish(modelPubSub, model)

      const modelStream = Stream.fromPubSub(modelPubSub)

      const currentUrl: Option.Option<Url> = Option.fromNullable(browserConfig).pipe(
        Option.map(() => ({
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        })),
      )

      const [initModel, initCommands] = Predicate.isNotUndefined(hmrModel)
        ? pipe(
            hmrModel,
            Schema.decodeUnknownEither(Model),
            Either.match({
              onLeft: (error) => {
                console.warn('Failed to decode HMR model, using default init:', error)
                return init(Option.getOrUndefined(currentUrl))
              },
              onRight: (restoredModel) => {
                console.log('Restored model from HMR:', restoredModel)
                return [restoredModel, []]
              },
            }),
          )
        : init(Option.getOrUndefined(currentUrl))

      yield* Effect.forEach(initCommands, (command) =>
        Effect.forkDaemon(command.pipe(Effect.flatMap(enqueueMessage))),
      )

      if (browserConfig) {
        addNavigationEventListeners(messageQueue, browserConfig)
      }

      const modelRef = yield* Ref.make<Model>(initModel)

      const currentVNodeRef = yield* Ref.make<Option.Option<VNode>>(Option.none())

      if (commandStreams) {
        yield* pipe(
          commandStreams,
          Record.toEntries,
          Effect.forEach(
            ([_key, { deps, stream }]) =>
              Effect.forkDaemon(
                modelStream.pipe(
                  Stream.map(deps),
                  Stream.changes,
                  Stream.flatMap(stream, { switch: true }),
                  Stream.runForEach(Effect.flatMap(enqueueMessage)),
                ),
              ),
            {
              concurrency: 'unbounded',
              discard: true,
            },
          ),
        )
      }

      const render = (model: Model) => {
        console.log('Rendering with view function:', view.toString().slice(0, 100))
        return view(model).pipe(
          Effect.flatMap((newVNode) =>
            Effect.gen(function* () {
              const currentVNode = yield* Ref.get(currentVNodeRef)

              const patchedVNode = yield* Effect.sync(() => {
                const vnode = Predicate.isNotNull(newVNode) ? newVNode : h('#text', {}, '')

                console.log(currentVNode)
                console.log(vnode)

                return Option.match(currentVNode, {
                  onNone: () => patch(container, vnode),
                  onSome: (prev) => patch(prev, vnode),
                })
              })

              yield* Ref.set(currentVNodeRef, Option.some(patchedVNode))
            }),
          ),
          Effect.provideService(Dispatch, {
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            dispatch: (message: unknown) => enqueueMessage(message as Message),
          }),
        )
      }

      yield* render(initModel)

      yield* Effect.forever(
        Effect.gen(function* () {
          const message = yield* Queue.take(messageQueue)

          const currentModel = yield* Ref.get(modelRef)

          const [nextModel, commands] = update(currentModel, message)

          yield* Effect.forEach(commands, (command) =>
            Effect.forkDaemon(command.pipe(Effect.flatMap(enqueueMessage))),
          )

          if (!modelEquivalence(currentModel, nextModel)) {
            yield* Ref.set(modelRef, nextModel)
            yield* render(nextModel)
            yield* publishModel(nextModel)

            if (typeof import.meta !== 'undefined' && import.meta.hot) {
              import.meta.hot.send('foldkit:model', nextModel)
            }
          }
        }),
      )
    })

export const makeElement = <
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Record<string, unknown>,
>(
  config: ElementConfig<Model, Message, StreamDepsMap>,
): MakeRuntimeReturn =>
  makeRuntime({
    Model: config.Model,
    init: () => config.init(),
    update: config.update,
    view: config.view,
    ...(config.commandStreams && { commandStreams: config.commandStreams }),
    container: config.container,
  })

export const makeApplication = <
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Record<string, unknown>,
>(
  config: ApplicationConfig<Model, Message, StreamDepsMap>,
): MakeRuntimeReturn => {
  const currentUrl: Url = {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  }

  return makeRuntime({
    Model: config.Model,
    init: (url) => config.init(url || currentUrl),
    update: config.update,
    view: config.view,
    ...(config.commandStreams && { commandStreams: config.commandStreams }),
    container: config.container,
    browser: config.browser,
  })
}

const createHmrEventStream = (): Stream.Stream<{ model: unknown }> =>
  Stream.async<{ model: unknown }>((emit) => {
    if (typeof import.meta !== 'undefined' && import.meta.hot) {
      import.meta.hot.on('foldkit:reload', ({ model }) => {
        console.log('HMR event received in stream with model:', model)
        emit.single({ model })
      })

      return Effect.void
    }

    return Effect.void
  })

const withViteHmr = (foldkitRuntime: MakeRuntimeReturn) =>
  Effect.gen(function* () {
    const initialScope = yield* Scope.make()
    const currentScopeRef = yield* Ref.make(initialScope)

    yield* Scope.extend(foldkitRuntime(undefined), initialScope)

    yield* createHmrEventStream().pipe(
      Stream.runForEach(({ model }) =>
        Effect.gen(function* () {
          const currentScope = yield* Ref.get(currentScopeRef)

          yield* Scope.close(currentScope, Exit.void)

          console.log('Starting new runtime with model:', model)
          const newScope = yield* Scope.make()
          yield* Ref.set(currentScopeRef, newScope)
          yield* Scope.extend(foldkitRuntime(model), newScope)
          console.log('New scope started and stored')
        }),
      ),
    )
  })

/**
 * Run a Foldkit application
 */
export const run = (foldkitRuntime: MakeRuntimeReturn): void => {
  pipe(foldkitRuntime, withViteHmr, Effect.runFork)
}
