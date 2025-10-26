import { BrowserRuntime } from '@effect/platform-browser/index'
import {
  Context,
  Effect,
  Either,
  Option,
  Predicate,
  Queue,
  Record,
  Ref,
  Schema,
  Stream,
  SubscriptionRef,
  pipe,
} from 'effect'
import { h } from 'snabbdom'

import { Html } from '../html'
import { Url, fromString as urlFromString } from '../url'
import { VNode, patch, toVNode } from '../vdom'
import { addNavigationEventListeners } from './addNavigationEventListeners'
import { UrlRequest } from './urlRequest'

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

export interface RuntimeConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
> {
  Model: Schema.Schema<Model, any, never>
  readonly init: (url?: Url) => [Model, ReadonlyArray<Command<Message>>]
  readonly update: (model: Model, message: Message) => [Model, ReadonlyArray<Command<Message>>]
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
  readonly browser?: BrowserConfig<Message>
}

export type ElementInit<Model, Message> = () => [Model, ReadonlyArray<Command<Message>>]
export type ApplicationInit<Model, Message> = (url: Url) => [Model, ReadonlyArray<Command<Message>>]

export interface ElementConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly init: ElementInit<Model, Message>
  readonly update: (model: Model, message: Message) => [Model, ReadonlyArray<Command<Message>>]
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
}

export interface ApplicationConfig<
  Model,
  Message,
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
> {
  readonly Model: Schema.Schema<Model, any, never>
  readonly init: ApplicationInit<Model, Message>
  readonly update: (model: Model, message: Message) => [Model, ReadonlyArray<Command<Message>>]
  readonly view: (model: Model) => Html
  readonly commandStreams?: CommandStreams<Model, Message, StreamDepsMap>
  readonly container: HTMLElement
  readonly browser: BrowserConfig<Message>
}

export type CommandStream<Model, Message, StreamDeps> = {
  readonly modelToDeps: (model: Model) => StreamDeps
  readonly depsToStream: (deps: StreamDeps) => Stream.Stream<Command<Message>>
}

type CommandStreamConfig<Model, Message, StreamDeps> = {
  readonly schema: Schema.Schema<StreamDeps>
} & CommandStream<Model, Message, StreamDeps>

export type CommandStreams<Model, Message, CommandStreamsDeps extends Schema.Struct<any>> = {
  readonly [K in keyof Schema.Schema.Type<CommandStreamsDeps>]: CommandStreamConfig<
    Model,
    Message,
    Schema.Schema.Type<CommandStreamsDeps>[K]
  >
}

export const makeCommandStreams =
  <CommandStreamsDeps extends Schema.Struct<any>>(CommandStreamsDeps: CommandStreamsDeps) =>
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

export const makeRuntime =
  <Model, Message, StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>>({
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

      const currentUrl: Option.Option<Url> = Option.fromNullable(browserConfig).pipe(
        Option.flatMap(() => urlFromString(window.location.href)),
      )

      const [initModel, initCommands] = Predicate.isNotUndefined(hmrModel)
        ? pipe(
            hmrModel,
            Schema.decodeUnknownEither(Model),
            Either.match({
              onLeft: () => init(Option.getOrUndefined(currentUrl)),
              onRight: (restoredModel) => [restoredModel, []],
            }),
          )
        : init(Option.getOrUndefined(currentUrl))

      const modelSubscriptionRef = yield* SubscriptionRef.make(initModel)

      yield* Effect.forEach(initCommands, (command) =>
        Effect.forkDaemon(command.pipe(Effect.flatMap(enqueueMessage))),
      )

      if (browserConfig) {
        addNavigationEventListeners(messageQueue, browserConfig)
      }

      const modelRef = yield* Ref.make<Model>(initModel)

      const maybeCurrentVNodeRef = yield* Ref.make<Option.Option<VNode>>(Option.none())

      if (commandStreams) {
        yield* pipe(
          commandStreams,
          Record.toEntries,
          Effect.forEach(
            ([_key, { schema, modelToDeps, depsToStream }]) =>
              Effect.forkDaemon(
                modelSubscriptionRef.changes.pipe(
                  Stream.map(modelToDeps),
                  Stream.changesWith(Schema.equivalence(schema)),
                  Stream.flatMap(depsToStream, { switch: true }),
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
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            dispatch: (message: unknown) => enqueueMessage(message as Message),
          }),
        )

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
            yield* SubscriptionRef.set(modelSubscriptionRef, nextModel)
            preserveModel(nextModel)
          }
        }),
      )
    })

const patchVNode = (
  maybeCurrentVNode: Option.Option<VNode>,
  nextVNodeNullish: VNode | null,
  container: HTMLElement,
): VNode => {
  const nextVNode = Predicate.isNotNull(nextVNodeNullish) ? nextVNodeNullish : h('#text', {}, '')

  return Option.match(maybeCurrentVNode, {
    onNone: () => patch(toVNode(container), nextVNode),
    onSome: (currentVNode) => patch(currentVNode, nextVNode),
  })
}

export const makeElement = <
  Model,
  Message extends { _tag: string },
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
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
  StreamDepsMap extends Schema.Struct<Schema.Struct.Fields>,
>(
  config: ApplicationConfig<Model, Message, StreamDepsMap>,
): MakeRuntimeReturn => {
  const currentUrl: Url = Option.getOrThrow(urlFromString(window.location.href))

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
