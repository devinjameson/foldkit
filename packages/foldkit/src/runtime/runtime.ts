import { BrowserRuntime } from '@effect/platform-browser/index'
import {
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
import { UrlRequest } from './urlRequest'

export class Dispatch extends Context.Tag('@foldkit/Dispatch')<
  Dispatch,
  {
    readonly dispatchAsync: (message: unknown) => Effect.Effect<void>
    readonly dispatchSync: (message: unknown) => void
  }
>() {}

export type Command<Message> = Effect.Effect<Message>

export type BrowserConfig<Message> = {
  readonly onUrlRequest: (request: UrlRequest) => Message
  readonly onUrlChange: (url: Url) => Message
}

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
}

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
}

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

export interface ApplicationConfigWithoutFlags<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
> extends BaseApplicationConfig<Model, Message, StreamDepsMap> {
  readonly init: (url: Url) => [Model, ReadonlyArray<Command<Message>>]
}

export type ElementInit<Model, Message, Flags = void> = Flags extends void
  ? () => [Model, ReadonlyArray<Command<Message>>]
  : (flags: Flags) => [Model, ReadonlyArray<Command<Message>>]

export type ApplicationInit<Model, Message, Flags = void> = Flags extends void
  ? (url: Url) => [Model, ReadonlyArray<Command<Message>>]
  : (flags: Flags, url: Url) => [Model, ReadonlyArray<Command<Message>>]

export type CommandStream<Model, Message, StreamDeps> = {
  readonly modelToDeps: (model: Model) => StreamDeps
  readonly depsToStream: (deps: StreamDeps) => Stream.Stream<Command<Message>>
}

type CommandStreamConfig<Model, Message, StreamDeps> = {
  readonly schema: Schema.Schema<StreamDeps>
} & CommandStream<Model, Message, StreamDeps>

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

type MakeRuntimeReturn = (hmrModel?: unknown) => Effect.Effect<void>

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

      const dispatchSync = (message: unknown): void => {
        const maybeRuntime = Ref.get(maybeRuntimeRef).pipe(Effect.runSync)

        Option.match(maybeRuntime, {
          onNone: Function.constVoid,
          onSome: (runtime) => {
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            Runtime.runSync(runtime)(processMessage(message as Message))
          },
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

      yield* Effect.forever(
        Effect.gen(function* () {
          const message = yield* Queue.take(messageQueue)
          yield* processMessage(message)
        }),
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

/*
 * Run a Foldkit application
 */
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
