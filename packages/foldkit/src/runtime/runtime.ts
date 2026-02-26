import { BrowserRuntime } from '@effect/platform-browser/index'
import {
  Cause,
  Context,
  Effect,
  Either,
  Function,
  Layer,
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

import type { Command } from '../command'
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

export type { Command } from '../command'

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
  Resources = never,
> {
  Model: Schema.Schema<Model, any, never>
  Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (
    flags: Flags,
    url?: Url,
  ) => [Model, ReadonlyArray<Command<Message, never, Resources>>]
  readonly update: (
    model: Model,
    message: Message,
  ) => [Model, ReadonlyArray<Command<Message, never, Resources>>]
  readonly view: (model: Model) => Html
  readonly subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources
  >
  readonly container: HTMLElement
  readonly browser?: BrowserConfig<Message>
  readonly errorView?: (error: Error) => Html
  /**
   * An Effect Layer providing long-lived resources that persist across command
   * invocations. Use this for browser resources with lifecycle (AudioContext,
   * RTCPeerConnection, CanvasRenderingContext2D) — not for stateless utilities
   * (HttpClient, JSON encoding) which should be provided per-command.
   *
   * The runtime memoizes the layer, ensuring a single shared instance for all
   * commands and subscriptions throughout the application's lifetime.
   */
  readonly resources?: Layer.Layer<Resources>
}

interface BaseElementConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly update: (
    model: Model,
    message: Message,
  ) => [Model, ReadonlyArray<Command<Message, never, Resources>>]
  readonly view: (model: Model) => Html
  readonly subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources
  >
  readonly container: HTMLElement
  readonly errorView?: (error: Error) => Html
  readonly resources?: Layer.Layer<Resources>
}

/** Configuration for `makeElement` when the element receives initial data via flags. */
export interface ElementConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
> extends BaseElementConfig<Model, Message, StreamDepsMap, Resources> {
  readonly Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (
    flags: Flags,
  ) => [Model, ReadonlyArray<Command<Message, never, Resources>>]
}

/** Configuration for `makeElement` without flags. */
export interface ElementConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
> extends BaseElementConfig<Model, Message, StreamDepsMap, Resources> {
  readonly init: () => [
    Model,
    ReadonlyArray<Command<Message, never, Resources>>,
  ]
}

interface BaseApplicationConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly update: (
    model: Model,
    message: Message,
  ) => [Model, ReadonlyArray<Command<Message, never, Resources>>]
  readonly view: (model: Model) => Html
  readonly subscriptions?: Subscriptions<
    Model,
    Message,
    StreamDepsMap,
    Resources
  >
  readonly container: HTMLElement
  readonly browser: BrowserConfig<Message>
  readonly errorView?: (error: Error) => Html
  readonly resources?: Layer.Layer<Resources>
}

/** Configuration for `makeApplication` when the application receives initial data via flags. */
export interface ApplicationConfigWithFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
> extends BaseApplicationConfig<Model, Message, StreamDepsMap, Resources> {
  readonly Flags: Schema.Schema<Flags, any, never>
  readonly flags: Effect.Effect<Flags>
  readonly init: (
    flags: Flags,
    url: Url,
  ) => [Model, ReadonlyArray<Command<Message, never, Resources>>]
}

/** Configuration for `makeApplication` without flags. */
export interface ApplicationConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
> extends BaseApplicationConfig<Model, Message, StreamDepsMap, Resources> {
  readonly init: (
    url: Url,
  ) => [Model, ReadonlyArray<Command<Message, never, Resources>>]
}

/** The `init` function type for elements, with an optional `flags` parameter when `Flags` is not `void`. */
export type ElementInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
> = Flags extends void
  ? () => [Model, ReadonlyArray<Command<Message, never, Resources>>]
  : (flags: Flags) => [Model, ReadonlyArray<Command<Message, never, Resources>>]

/** The `init` function type for applications, receives the current URL and optional flags. */
export type ApplicationInit<
  Model,
  Message,
  Flags = void,
  Resources = never,
> = Flags extends void
  ? (url: Url) => [Model, ReadonlyArray<Command<Message, never, Resources>>]
  : (
      flags: Flags,
      url: Url,
    ) => [Model, ReadonlyArray<Command<Message, never, Resources>>]

/** A reactive binding between model state and a long-running stream of commands. */
export type Subscription<Model, Message, StreamDeps, Resources = never> = {
  readonly modelToDeps: (model: Model) => StreamDeps
  readonly depsToStream: (
    deps: StreamDeps,
  ) => Stream.Stream<Command<Message, never, Resources>>
}

type SubscriptionConfig<Model, Message, StreamDeps, Resources = never> = {
  readonly schema: Schema.Schema<StreamDeps>
} & Subscription<Model, Message, StreamDeps, Resources>

/** A record of named subscription configurations, keyed by dependency field name. */
export type Subscriptions<
  Model,
  Message,
  SubscriptionDeps extends Schema.Struct<any>,
  Resources = never,
> = {
  readonly [K in keyof Schema.Schema.Type<SubscriptionDeps>]: SubscriptionConfig<
    Model,
    Message,
    Schema.Schema.Type<SubscriptionDeps>[K],
    Resources
  >
}

/** Creates type-safe subscription configurations from a dependency schema. */
export const makeSubscriptions =
  <SubscriptionDeps extends Schema.Struct<any>>(
    SubscriptionDeps: SubscriptionDeps,
  ) =>
  <Model, Message, Resources = never>(configs: {
    [K in keyof Schema.Schema.Type<SubscriptionDeps>]: {
      modelToDeps: (model: Model) => Schema.Schema.Type<SubscriptionDeps>[K]
      depsToStream: (
        deps: Schema.Schema.Type<SubscriptionDeps>[K],
      ) => Stream.Stream<Command<Message, never, Resources>>
    }
  }) =>
    Record.map(configs, ({ modelToDeps, depsToStream }, key) => ({
      schema: SubscriptionDeps.fields[key],
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
    Resources,
  >({
    Model,
    Flags: _Flags,
    flags: flags_,
    init,
    update,
    view,
    subscriptions,
    container,
    browser: browserConfig,
    errorView,
    resources,
  }: RuntimeConfig<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources
  >): MakeRuntimeReturn =>
  (hmrModel?: unknown): Effect.Effect<void> =>
    Effect.scoped(
      Effect.gen(function* () {
        const maybeResourceLayer = resources
          ? Option.some(yield* Layer.memoize(resources))
          : Option.none()

        const provideCommandResources = (
          command: Effect.Effect<Message, never, Resources>,
        ): Effect.Effect<Message> =>
          Option.match(maybeResourceLayer, {
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            onNone: () => command as Effect.Effect<Message>,
            onSome: resourceLayer => Effect.provide(command, resourceLayer),
          })

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
                onRight: restoredModel => [restoredModel, []],
              }),
            )
          : init(flags, Option.getOrUndefined(currentUrl))

        const modelSubscriptionRef = yield* SubscriptionRef.make(initModel)

        yield* Effect.forEach(initCommands, command =>
          Effect.forkDaemon(
            command.pipe(
              provideCommandResources,
              Effect.flatMap(enqueueMessage),
            ),
          ),
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

            yield* Effect.forEach(commands, command =>
              Effect.forkDaemon(
                command.pipe(
                  provideCommandResources,
                  Effect.flatMap(enqueueMessage),
                ),
              ),
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
                squashed instanceof Error
                  ? squashed
                  : new Error(String(squashed))
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
            Effect.flatMap(nextVNodeNullish =>
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

        if (subscriptions) {
          yield* pipe(
            subscriptions,
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
                    Stream.runForEach(command =>
                      command.pipe(
                        provideCommandResources,
                        Effect.flatMap(enqueueMessage),
                      ),
                    ),
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
          Effect.catchAllCause(cause =>
            Effect.sync(() => {
              const squashed = Cause.squash(cause)
              const appError =
                squashed instanceof Error
                  ? squashed
                  : new Error(String(squashed))
              renderErrorView(
                appError,
                errorView,
                container,
                maybeCurrentVNodeRef,
              )
            }),
          ),
        )
      }),
    )

const patchVNode = (
  maybeCurrentVNode: Option.Option<VNode>,
  nextVNodeNullish: VNode | null,
  container: HTMLElement,
): VNode => {
  const nextVNode = Predicate.isNotNull(nextVNodeNullish)
    ? nextVNodeNullish
    : h('!')

  return Option.match(maybeCurrentVNode, {
    onNone: () => patch(toVNode(container), nextVNode),
    onSome: currentVNode => patch(currentVNode, nextVNode),
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
  Resources = never,
>(
  config: ElementConfigWithFlags<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources
  >,
): MakeRuntimeReturn

export function makeElement<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
>(
  config: ElementConfigWithoutFlags<Model, Message, StreamDepsMap, Resources>,
): MakeRuntimeReturn

export function makeElement<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
>(
  config:
    | ElementConfigWithFlags<Model, Message, StreamDepsMap, Flags, Resources>
    | ElementConfigWithoutFlags<Model, Message, StreamDepsMap, Resources>,
): MakeRuntimeReturn {
  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view: config.view,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container: config.container,
    ...(config.errorView && { errorView: config.errorView }),
    ...(config.resources && { resources: config.resources }),
  }

  if ('Flags' in config) {
    return makeRuntime({
      ...baseConfig,
      Flags: config.Flags,
      flags: config.flags,
      init: flags => config.init(flags),
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
  Resources = never,
>(
  config: ApplicationConfigWithFlags<
    Model,
    Message,
    StreamDepsMap,
    Flags,
    Resources
  >,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Resources = never,
>(
  config: ApplicationConfigWithoutFlags<
    Model,
    Message,
    StreamDepsMap,
    Resources
  >,
): MakeRuntimeReturn

export function makeApplication<
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
  Flags,
  Resources = never,
>(
  config:
    | ApplicationConfigWithFlags<
        Model,
        Message,
        StreamDepsMap,
        Flags,
        Resources
      >
    | ApplicationConfigWithoutFlags<Model, Message, StreamDepsMap, Resources>,
): MakeRuntimeReturn {
  const currentUrl: Url = Option.getOrThrow(urlFromString(window.location.href))

  const baseConfig = {
    Model: config.Model,
    update: config.update,
    view: config.view,
    ...(config.subscriptions && { subscriptions: config.subscriptions }),
    container: config.container,
    browser: config.browser,
    ...(config.errorView && { errorView: config.errorView }),
    ...(config.resources && { resources: config.resources }),
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
    import.meta.hot.on('foldkit:restore-model', model => {
      BrowserRuntime.runMain(foldkitRuntime(model))
    })

    import.meta.hot.send('foldkit:request-model')
  } else {
    BrowserRuntime.runMain(foldkitRuntime())
  }
}
