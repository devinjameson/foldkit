import { BrowserRuntime } from '@effect/platform-browser/index'
import {
  Cause,
  Context,
  Effect,
  Either,
  Function,
  Option,
  Predicate,
  Queue,
  Record,
  Ref,
  Runtime,
  Schema,
  Stream,
  SubscriptionRef,
  pipe,
} from 'effect'
import { h } from 'snabbdom'

import { Html } from '../html'
import { Url, fromString as urlFromString } from '../url'
import { VNode, patch, toVNode } from '../vdom'
import {
  addBfcacheRestoreListener,
  addNavigationEventListeners,
} from './browserListeners'
import { defaultErrorView, noOpDispatch } from './errorUI'
import { UrlRequest } from './urlRequest'

/** Effect service tag that provides message dispatching to the view layer. */
export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatchAsync: (message: unknown) => Effect.Effect<void>
    readonly dispatchSync: (message: unknown) => void
  }
>() {}

/** An `Effect` that produces a message, used for side effects in the update function. */
export type Command<Message> = Effect.Effect<Message>

/** Configuration for browser URL integration with handlers for URL requests and URL changes. */
export type BrowserConfig<Message> = {
  readonly onUrlRequest: (request: UrlRequest) => Message
  readonly onUrlChange: (url: Url) => Message
}

/** Full runtime configuration including model schema, flags, init, update, view, and optional browser/stream config. */
export interface RuntimeConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
> {
  Model: Schema.Schema<Model, any, never>
  Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (
    flags: Flags,
    url?: Url,
  ) => [Model, ReadonlyArray<Command<Message>>]
  readonly update: (
    model: Model,
    message: Message,
  ) => [Model, ReadonlyArray<Command<Message>>]
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
  readonly browser?: BrowserConfig<Message>
  readonly errorView?: (error: Error) => Html
}

interface BaseElementConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly update: (
    model: Model,
    message: Message,
  ) => [Model, ReadonlyArray<Command<Message>>]
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
  readonly errorView?: (error: Error) => Html
}

/** Configuration for `makeElement` when the element receives initial data via flags. */
export interface ElementConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
> extends BaseElementConfig<Model, Message, StreamDepsMap> {
  readonly Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (flags: Flags) => [Model, ReadonlyArray<Command<Message>>]
}

/** Configuration for `makeElement` without flags. */
export interface ElementConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
> extends BaseElementConfig<Model, Message, StreamDepsMap> {
  readonly init: () => [Model, ReadonlyArray<Command<Message>>]
}

interface BaseApplicationConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly update: (
    model: Model,
    message: Message,
  ) => [Model, ReadonlyArray<Command<Message>>]
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
  readonly browser: BrowserConfig<Message>
  readonly errorView?: (error: Error) => Html
}

/** Configuration for `makeApplication` when the application receives initial data via flags. */
export interface ApplicationConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
> extends BaseApplicationConfig<Model, Message, StreamDepsMap> {
  readonly Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (
    flags: Flags,
    url: Url,
  ) => [Model, ReadonlyArray<Command<Message>>]
}

/** Configuration for `makeApplication` without flags. */
export interface ApplicationConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
> extends BaseApplicationConfig<Model, Message, StreamDepsMap> {
  readonly init: (url: Url) => [Model, ReadonlyArray<Command<Message>>]
}

/** The `init` function type for elements, with an optional `flags` parameter when `Flags` is not `void`. */
export type ElementInit<Model, Message, Flags = void> = Flags extends void
  ? () => [Model, ReadonlyArray<Command<Message>>]
  : (flags: Flags) => [Model, ReadonlyArray<Command<Message>>]

/** The `init` function type for applications, receives the current URL and optional flags. */
export type ApplicationInit<Model, Message, Flags = void> = Flags extends void
  ? (url: Url) => [Model, ReadonlyArray<Command<Message>>]
  : (flags: Flags, url: Url) => [Model, ReadonlyArray<Command<Message>>]

/** A reactive stream configuration that maps model changes to a stream of commands. */
export type CommandStream<Model, Message, StreamDeps> = {
  readonly modelToDeps: (model: Model) => StreamDeps
  readonly depsToStream: (deps: StreamDeps) => Stream.Stream<Command<Message>>
}

type CommandStreamConfig<Model, Message, StreamDeps> = {
  readonly schema: Schema.Schema<StreamDeps>
} & CommandStream<Model, Message, StreamDeps>

/** A record of named command stream configurations, keyed by dependency field name. */
export type CommandStreams<
  Model,
  Message,
  CommandStreamsDeps extends Schema.Struct<any>,
> = {
  readonly [K in keyof Schema.Schema.Type<CommandStreamsDeps>]: CommandStreamConfig<
    Model,
    Message,
    Schema.Schema.Type<CommandStreamsDeps>[K]
  >
}

/** Creates type-safe command stream configurations from a dependency schema. */
export const makeCommandStreams =
  <CommandStreamsDeps extends Schema.Struct<any>>(
    CommandStreamsDeps: CommandStreamsDeps,
  ) =>
  <Model, Message>(configs: {
    [K in keyof Schema.Schema.Type<CommandStreamsDeps>]: {
      modelToDeps: (model: Model) => Schema.Schema.Type<CommandStreamsDeps>[K]
      depsToStream: (
        deps: Schema.Schema.Type<CommandStreamsDeps>[K],
      ) => Stream.Stream<Command<Message>>
    }
  }) =>
    Record.map(configs, ({ modelToDeps, depsToStream }, key) => ({
      schema: CommandStreamsDeps.fields[key],
      modelToDeps,
      depsToStream,
    }))

/** A configured Foldkit runtime returned by `makeElement` or `makeApplication`, passed to `run` to start the application. */
export type MakeRuntimeReturn = (hmrModel?: unknown) => Effect.Effect<void>

const makeRuntime =
  <
    Model,
    Message,
    StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
    Flags,
  >({
    Model,
    Flags: _Flags,
    flags: flags_,
    init,
    update,
    view,
    commandStreams,
    container,
    browser: browserConfig,
    errorView,
  }: RuntimeConfig<Model, Message, StreamDepsMap, Flags>): MakeRuntimeReturn =>
  (hmrModel?: unknown): Effect.Effect<void> =>
    Effect.gen(function* () {
      const flags = yield* flags_

      const modelEquivalence = Schema.equivalence(Model)

      const messageQueue = yield* Queue.unbounded<Message>()
      const enqueueMessage = (message: Message) =>
        Queue.offer(messageQueue, message)

      const currentUrl: Option.Option<Url> = Option.fromNullable(
        browserConfig,
      ).pipe(Option.flatMap(() => urlFromString(window.location.href)))

      const [initModel, initCommands] = Predicate.isNotUndefined(hmrModel)
        ? pipe(
            hmrModel,
            Schema.decodeUnknownEither(Model),
            Either.match({
              onLeft: () => init(flags, Option.getOrUndefined(currentUrl)),
              onRight: (restoredModel) => [restoredModel, []],
            }),
          )
        : init(flags, Option.getOrUndefined(currentUrl))

      const modelSubscriptionRef = yield* SubscriptionRef.make(initModel)

      yield* Effect.forEach(initCommands, (command) =>
        Effect.forkDaemon(command.pipe(Effect.flatMap(enqueueMessage))),
      )

      if (browserConfig) {
        addNavigationEventListeners(messageQueue, browserConfig)
      }

      const modelRef = yield* Ref.make<Model>(initModel)

      const maybeCurrentVNodeRef = yield* Ref.make<Option.Option<VNode>>(
        Option.none(),
      )

      const maybeRuntimeRef = yield* Ref.make<
        Option.Option<Runtime.Runtime<never>>
      >(Option.none())

      const processMessage = (message: Message): Effect.Effect<void> =>
        Effect.gen(function* () {
          const currentModel = yield* Ref.get(modelRef)

          const [nextModel, commands] = update(currentModel, message)

          yield* Ref.set(modelRef, nextModel)
          yield* render(nextModel)

          if (!modelEquivalence(currentModel, nextModel)) {
            yield* SubscriptionRef.set(modelSubscriptionRef, nextModel)
            preserveModel(nextModel)
          }

          yield* Effect.forEach(commands, (command) =>
            Effect.forkDaemon(command.pipe(Effect.flatMap(enqueueMessage))),
          )
        })

      const runProcessMessage =
        (messageEffect: Effect.Effect<void>) =>
        (runtime: Runtime.Runtime<never>): void => {
          try {
            Runtime.runSync(runtime)(messageEffect)
          } catch (error) {
            const squashed = Runtime.isFiberFailure(error)
              ? Cause.squash(error[Runtime.FiberFailureCauseId])
              : error

            const appError =
              squashed instanceof Error ? squashed : new Error(String(squashed))
            renderErrorView(
              appError,
              errorView,
              container,
              maybeCurrentVNodeRef,
            )
          }
        }

      const dispatchSync = (message: unknown): void => {
        const maybeRuntime = Effect.runSync(Ref.get(maybeRuntimeRef))

        Option.match(maybeRuntime, {
          onNone: Function.constVoid,
          onSome: runProcessMessage(
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            processMessage(message as Message),
          ),
        })
      }

      const dispatchAsync = (message: unknown): Effect.Effect<void> =>
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        enqueueMessage(message as Message)

      const render = (model: Model) =>
        view(model).pipe(
          Effect.flatMap((nextVNodeNullish) =>
            Effect.gen(function* () {
              const maybeCurrentVNode = yield* Ref.get(maybeCurrentVNodeRef)
              const patchedVNode = yield* Effect.sync(() =>
                patchVNode(maybeCurrentVNode, nextVNodeNullish, container),
              )
              yield* Ref.set(maybeCurrentVNodeRef, Option.some(patchedVNode))
            }),
          ),
          Effect.provideService(Dispatch, {
            dispatchAsync,
            dispatchSync,
          }),
        )

      const runtime = yield* Effect.runtime()
      yield* Ref.set(maybeRuntimeRef, Option.some(runtime))

      yield* render(initModel)

      addBfcacheRestoreListener()

      if (commandStreams) {
        yield* pipe(
          commandStreams,
          Record.toEntries,
          Effect.forEach(
            ([_key, { schema, modelToDeps, depsToStream }]) => {
              const modelStream = Stream.concat(
                Stream.make(initModel),
                modelSubscriptionRef.changes,
              )

              return Effect.forkDaemon(
                modelStream.pipe(
                  Stream.map(modelToDeps),
                  Stream.changesWith(Schema.equivalence(schema)),
                  Stream.flatMap(depsToStream, { switch: true }),
                  Stream.runForEach(Effect.flatMap(enqueueMessage)),
                ),
              )
            },
            {
              concurrency: 'unbounded',
              discard: true,
            },
          ),
        )
      }

      yield* pipe(
        Effect.forever(
          Effect.gen(function* () {
            const message = yield* Queue.take(messageQueue)
            yield* processMessage(message)
          }),
        ),
        Effect.catchAllCause((cause) =>
          Effect.sync(() => {
            const squashed = Cause.squash(cause)
            const appError =
              squashed instanceof Error ? squashed : new Error(String(squashed))
            renderErrorView(
              appError,
              errorView,
              container,
              maybeCurrentVNodeRef,
            )
          }),
        ),
      )
    })

const patchVNode = (
  maybeCurrentVNode: Option.Option<VNode>,
  nextVNodeNullish: VNode | null,
  container: HTMLElement,
): VNode => {
  const nextVNode = Predicate.isNotNull(nextVNodeNullish)
    ? nextVNodeNullish
    : h('#text', {}, '')

  return Option.match(maybeCurrentVNode, {
    onNone: () => patch(toVNode(container), nextVNode),
    onSome: (currentVNode) => patch(currentVNode, nextVNode),
  })
}

const renderErrorView = (
  appError: Error,
  errorView: ((error: Error) => Html) | undefined,
  container: HTMLElement,
  maybeCurrentVNodeRef: Ref.Ref<Option.Option<VNode>>,
): void => {
  console.error('[foldkit] Application error:', appError)

  try {
    const errorHtml = errorView
      ? errorView(appError)
      : defaultErrorView(appError)

    const maybeCurrentVNode = Ref.get(maybeCurrentVNodeRef).pipe(Effect.runSync)

    const vnode = errorHtml.pipe(
      Effect.provideService(Dispatch, noOpDispatch),
      Effect.runSync,
    )

    patchVNode(maybeCurrentVNode, vnode, container)
  } catch (viewError) {
    console.error('[foldkit] Custom errorView failed:', viewError)

    const maybeCurrentVNode = Ref.get(maybeCurrentVNodeRef).pipe(Effect.runSync)

    const fallbackViewError =
      viewError instanceof Error ? viewError : new Error(String(viewError))

    const vnode = defaultErrorView(appError, fallbackViewError).pipe(
      Effect.provideService(Dispatch, noOpDispatch),
      Effect.runSync,
    )

    patchVNode(maybeCurrentVNode, vnode, container)
  }
}

/** Creates a Foldkit element (no URL routing) and returns a runtime that can be passed to `run`. */
export function makeElement<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
>(
  config: ElementConfigWithFlags<Model, Message, StreamDepsMap, Flags>,
): MakeRuntimeReturn

export function makeElement<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
>(
  config: ElementConfigWithoutFlags<Model, Message, StreamDepsMap>,
): MakeRuntimeReturn

export function makeElement<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
>(
  config:
    | ElementConfigWithFlags<Model, Message, StreamDepsMap, Flags>
    | ElementConfigWithoutFlags<Model, Message, StreamDepsMap>,
): MakeRuntimeReturn {
  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view: config.view,
    ...(config.commandStreams && { commandStreams: config.commandStreams }),
    container: config.container,
    ...(config.errorView && { errorView: config.errorView }),
  }

  if ('Flags' in config) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      flags: config.flags,
      init: (flags) => config.init(flags),
    })
  } else {
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      flags: Effect.succeed(undefined),
      init: () => config.init(),
    })
  }
}

/** Creates a Foldkit application with URL routing and returns a runtime that can be passed to `run`. */
export function makeApplication<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
>(
  config: ApplicationConfigWithFlags<Model, Message, StreamDepsMap, Flags>,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
>(
  config: ApplicationConfigWithoutFlags<Model, Message, StreamDepsMap>,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
>(
  config:
    | ApplicationConfigWithFlags<Model, Message, StreamDepsMap, Flags>
    | ApplicationConfigWithoutFlags<Model, Message, StreamDepsMap>,
): MakeRuntimeReturn {
  const currentUrl: Url = Option.getOrThrow(urlFromString(window.location.href))

  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view: config.view,
    ...(config.commandStreams && { commandStreams: config.commandStreams }),
    container: config.container,
    browser: config.browser,
    ...(config.errorView && { errorView: config.errorView }),
  }

  if ('Flags' in config) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      flags: config.flags,
      init: (flags, url) => config.init(flags, url ?? currentUrl),
    })
  } else {
    return makeRuntime({
      ...baseConfig,
      Flags: Schema.Void,
      flags: Effect.succeed(undefined),
      init: (_flags, url) => config.init(url ?? currentUrl),
    })
  }
}

const preserveModel = (model: unknown): void => {
  if (import.meta.hot) {
    import.meta.hot.send('foldkit:preserve-model', model)
  }
}

/** Starts a Foldkit runtime, with HMR support for development. */
export const run = (foldkitRuntime: MakeRuntimeReturn): void => {
  if (import.meta.hot) {
    import.meta.hot.on('foldkit:restore-model', (model) => {
      BrowserRuntime.runMain(foldkitRuntime(model))
    })

    import.meta.hot.send('foldkit:request-model')
  } else {
    BrowserRuntime.runMain(foldkitRuntime())
  }
}
