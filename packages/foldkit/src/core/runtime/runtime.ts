import {
  Context,
  Effect,
  Either,
  Option,
  Predicate,
  PubSub,
  Queue,
  Record,
  Ref,
  Schema,
  Stream,
  pipe,
} from 'effect'
import { h } from 'snabbdom'

import { FoldReturn } from '../fold'
import { Html } from '../html'
import { Url, UrlRequest } from '../urlRequest'
import { VNode, patch, toVNode } from '../vdom'
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
        console.log(
          'View function identity hash:',
          view
            .toString()
            .slice(0, 200)
            .split('')
            .reduce((a, b) => {
              a = (a << 5) - a + b.charCodeAt(0)
              return a & a
            }, 0),
        )
        return view(model).pipe(
          Effect.tap((newVNode) =>
            Effect.sync(() => console.log('RENDER: View function returned VNode:', newVNode?.sel)),
          ),
          Effect.flatMap((newVNode) => {
            console.log('RENDER: Got VNode from view function, entering Effect.gen')
            return Effect.gen(function* () {
              console.log('RENDER: Inside Effect.gen, getting currentVNode')
              const currentVNode = yield* Ref.get(currentVNodeRef)

              console.log('RENDER: About to call Effect.sync for patching')
              const patchedVNode = yield* Effect.sync(() => {
                const vnode = Predicate.isNotNull(newVNode) ? newVNode : h('#text', {}, '')

                console.log(currentVNode)
                console.log('VNode content:', JSON.stringify(vnode, null, 2))
                console.log('About to call Option.match with currentVNode:', currentVNode)

                const result = Option.match(currentVNode, {
                  onNone: () => {
                    console.log(
                      'PATCH: Using onNone case - container innerHTML length:',
                      container.innerHTML.length,
                    )
                    try {
                      const containerVNode = toVNode(container)
                      console.log('Created containerVNode:', containerVNode)
                      const result = patch(containerVNode, vnode)
                      console.log('Patch completed, result:', result)
                      return result
                    } catch (error) {
                      console.error('Patch failed in onNone case:', error)
                      throw error
                    }
                  },
                  onSome: (prev) => {
                    console.log('PATCH: Using onSome case - patching previous VNode')
                    try {
                      const result = patch(prev, vnode)
                      console.log('Patch completed in onSome case, result:', result)
                      return result
                    } catch (error) {
                      console.error('Patch failed in onSome case:', error)
                      throw error
                    }
                  },
                })

                console.log('Option.match completed, result:', result)
                return result
              })

              console.log('RENDER: About to set currentVNodeRef')
              yield* Ref.set(currentVNodeRef, Option.some(patchedVNode))
              console.log('RENDER: Render complete')
            })
          }),
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

            // Preserve state for HMR
            preserveState(nextModel)
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

const preserveState = (model: unknown): void => {
  console.log('Preserved state for HMR:', model)

  // Send state to Vite server for persistence across full reloads
  if (import.meta.hot) {
    import.meta.hot.send('foldkit:preserve-state', { state: model })
  }
}

/*
 * Run a Foldkit application
 */
export const run = (foldkitRuntime: MakeRuntimeReturn): void => {
  if (import.meta.hot) {
    // Set up listener for state restoration
    import.meta.hot.on('foldkit:restore-state', (data) => {
      console.log('Received state from Vite server, starting runtime:', data.state)
      Effect.runFork(foldkitRuntime(data.state))
    })

    // Request preserved state from Vite server
    console.log('Requesting preserved state from Vite server')
    import.meta.hot.send('foldkit:request-state')
  } else {
    // No HMR, start normally
    console.log('Starting runtime without HMR')
    Effect.runFork(foldkitRuntime())
  }
}
