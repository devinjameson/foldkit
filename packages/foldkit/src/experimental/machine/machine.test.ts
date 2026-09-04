import {
  Context,
  Duration,
  Effect,
  Match,
  Option,
  Schema,
  Stream,
} from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as Command from '../../command/public.js'
import * as ManagedResource from '../../managedResource/public.js'
import { defineMessageUnion, defineTaggedUnion } from '../../schema/index.js'
import { evo } from '../../struct/index.js'
import * as Subscription from '../../subscription/public.js'
import * as Update from '../../update/index.js'
import {
  type EdgeInput,
  type Machine,
  type StateTransitions,
  type TransitionTable,
  define,
  otherwise,
  to,
  when,
} from './machine.js'

// REMOTE DATA

const RemoteData = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Error: { error: Schema.String },
  Ok: { data: Schema.String },
})
type RemoteData = typeof RemoteData.Type

const RemoteDataMessage = defineMessageUnion({
  ClickedFetch: {},
  SucceededFetch: { data: Schema.String },
  FailedFetch: { error: Schema.String },
  ClickedRetry: {},
})
type RemoteDataMessage = typeof RemoteDataMessage.Type

const remoteDataMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: to('Loading', () => ({ model: RemoteData.Loading() })),
      },
    },
    Loading: {
      on: {
        SucceededFetch: to('Ok', ({ message }) => ({
          model: RemoteData.Ok({ data: message.data }),
        })),
        FailedFetch: to('Error', ({ message }) => ({
          model: RemoteData.Error({ error: message.error }),
        })),
      },
    },
    Error: {
      on: {
        ClickedRetry: to('Loading', () => ({ model: RemoteData.Loading() })),
      },
    },
    Ok: {
      on: {
        ClickedFetch: to('Loading', () => ({ model: RemoteData.Loading() })),
      },
    },
  },
})

// CONNECTION

const MAX_CONNECT_ATTEMPTS = 5
const BASE_BACKOFF_DELAY_MILLIS = 250

const backoffDelayMillis = (attemptCount: number): number =>
  BASE_BACKOFF_DELAY_MILLIS * 2 ** (attemptCount - 1)

const ConnectionState = defineTaggedUnion({
  Disconnected: {},
  Connecting: { attemptCount: Schema.Number },
  Connected: { sessionId: Schema.String },
  Reconnecting: { attemptCount: Schema.Number, delayMillis: Schema.Number },
  Failed: { attemptCount: Schema.Number, reason: Schema.String },
  Suspended: {},
})
type ConnectionState = typeof ConnectionState.Type

const ConnectionMessage = defineMessageUnion({
  ClickedConnect: {},
  ClickedDisconnect: {},
  SocketOpened: { sessionId: Schema.String },
  SocketErrored: { reason: Schema.String },
  SocketClosed: { reason: Schema.String },
  TimedOutBackoff: {},
  ReleasedSocket: {},
  CompletedLogTransition: {},
})
type ConnectionMessage = typeof ConnectionMessage.Type
type ConnectingState = typeof ConnectionState.Connecting.Type
type SocketErroredMessage = typeof ConnectionMessage.SocketErrored.Type

const connectingToMaybeBackoff = (
  state: ConnectingState,
): Option.Option<Readonly<{ delayMillis: number }>> =>
  state.attemptCount < MAX_CONNECT_ATTEMPTS
    ? Option.some({ delayMillis: backoffDelayMillis(state.attemptCount) })
    : Option.none()

const connectingToMaybeSocketErrorTags = (
  state: ConnectingState,
  message: SocketErroredMessage,
): Option.Option<
  Readonly<{ sourceTag: 'Connecting'; messageTag: 'SocketErrored' }>
> => Option.some({ sourceTag: state._tag, messageTag: message._tag })

const connectingToMaybeNextAttempt = (
  state: ConnectingState,
): Option.Option<Readonly<{ nextAttemptCount: number }>> =>
  state.attemptCount < MAX_CONNECT_ATTEMPTS
    ? Option.some({ nextAttemptCount: state.attemptCount + 1 })
    : Option.none()

const LogTransition = Command.define('LogTransition', {
  args: { description: Schema.String },
  messages: [ConnectionMessage.CompletedLogTransition],
  execute: () => Effect.succeed(ConnectionMessage.CompletedLogTransition()),
})

const connectionMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: ConnectionState.Disconnected(),
  states: {
    Disconnected: {
      on: {
        ClickedConnect: to('Connecting', () => ({
          model: ConnectionState.Connecting({ attemptCount: 1 }),
        })),
      },
    },
    Connecting: {
      on: {
        SocketOpened: to('Connected', ({ message }) => ({
          model: ConnectionState.Connected({
            sessionId: message.sessionId,
          }),
          commands: [
            LogTransition({
              description: `Opened session ${message.sessionId}`,
            }),
          ],
        })),
        SocketErrored: [
          when(
            connectingToMaybeBackoff,
            'Reconnecting',
            ({ state, guardValue }) => ({
              model: ConnectionState.Reconnecting({
                attemptCount: state.attemptCount,
                delayMillis: guardValue.delayMillis,
              }),
            }),
          ),
          otherwise(
            to('Failed', ({ state, message }) => ({
              model: ConnectionState.Failed({
                attemptCount: state.attemptCount,
                reason: message.reason,
              }),
            })),
          ),
        ],
      },
    },
    Connected: {
      on: {
        SocketClosed: to('Reconnecting', () => ({
          model: ConnectionState.Reconnecting({
            attemptCount: 1,
            delayMillis: backoffDelayMillis(1),
          }),
        })),
        ClickedDisconnect: to('Disconnected', () => ({
          model: ConnectionState.Disconnected(),
        })),
      },
    },
    Reconnecting: {
      on: {
        TimedOutBackoff: to('Connecting', ({ state }) => ({
          model: ConnectionState.Connecting({
            attemptCount: state.attemptCount + 1,
          }),
        })),
        ClickedDisconnect: to('Disconnected', () => ({
          model: ConnectionState.Disconnected(),
        })),
      },
    },
    Failed: {
      on: {
        ClickedConnect: to('Connecting', () => ({
          model: ConnectionState.Connecting({ attemptCount: 1 }),
        })),
      },
    },
    Suspended: {
      on: {
        ClickedConnect: to('Connecting', () => ({
          model: ConnectionState.Connecting({ attemptCount: 1 }),
        })),
      },
    },
  },
})

const extraRootsMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: ConnectionState.Disconnected(),
  states: {
    Disconnected: {
      on: {
        ClickedConnect: to('Connecting', () => ({
          model: ConnectionState.Connecting({ attemptCount: 1 }),
        })),
      },
    },
    Suspended: {
      on: {
        SocketErrored: to('Failed', ({ message }) => ({
          model: ConnectionState.Failed({
            attemptCount: MAX_CONNECT_ATTEMPTS,
            reason: message.reason,
          }),
        })),
      },
    },
  },
})

// INTEGRATION

const AppModel = Schema.Struct({
  connection: ConnectionState,
  isDebugPanelOpen: Schema.Boolean,
})
type AppModel = typeof AppModel.Type

type AppUpdateReturn = Update.Return<AppModel, ConnectionMessage>

const foldConnection = Update.foldChild({
  update: connectionMachine.transition,
  read: (model: AppModel) => Option.some(model.connection),
  write: (model, nextConnection) =>
    evo(model, { connection: () => nextConnection }),
  toParentMessage: (message: ConnectionMessage) => message,
})

const update = (model: AppModel, message: ConnectionMessage) =>
  ConnectionMessage.match<AppUpdateReturn>(message, {
    ClickedConnect: connectionMessage =>
      foldConnection(model, connectionMessage),
    ClickedDisconnect: connectionMessage =>
      foldConnection(model, connectionMessage),
    SocketOpened: connectionMessage => foldConnection(model, connectionMessage),
    SocketErrored: connectionMessage =>
      foldConnection(model, connectionMessage),
    SocketClosed: connectionMessage => foldConnection(model, connectionMessage),
    TimedOutBackoff: connectionMessage =>
      foldConnection(model, connectionMessage),
    ReleasedSocket: () => ({ model }),
    CompletedLogTransition: () => ({ model }),
  })

// The Machine owns transitions only. Lifecycle effects stay in ordinary
// primitives gated on the state tag. The socket is a ManagedResource that
// exists while the Machine is in Connecting or Connected; its lifecycle
// Messages feed the Machine: a successful open dispatches SocketOpened
// (Connecting to Connected) and a failed open dispatches SocketErrored,
// which drives the reconnect-or-fail guard.

const SOCKET_URL = 'wss://example.test/socket'

const Socket = ManagedResource.tag<WebSocket>()('Socket')

const managedResources = ManagedResource.make<AppModel, ConnectionMessage>()(
  entry => ({
    socket: entry(Schema.Option(Schema.Null), {
      resource: Socket,
      modelToMaybeRequirements: model =>
        Match.value(model.connection).pipe(
          Match.tag('Connecting', 'Connected', () => Option.some(null)),
          Match.orElse(() => Option.none()),
        ),
      acquire: () =>
        Effect.callback<WebSocket, string>(resume => {
          const socket = new WebSocket(SOCKET_URL)
          socket.addEventListener('open', () => resume(Effect.succeed(socket)))
          socket.addEventListener('error', () =>
            resume(Effect.fail('Socket failed to open')),
          )
        }),
      release: socket => Effect.sync(() => socket.close()),
      onAcquired: socket =>
        ConnectionMessage.SocketOpened({ sessionId: socket.url }),
      onReleased: () => ConnectionMessage.ReleasedSocket(),
      onAcquireError: error =>
        ConnectionMessage.SocketErrored({ reason: String(error) }),
    }),
  }),
)

// The backoff timer is a Subscription gated on the Reconnecting tag: the
// Stream sleeps for the state's delayMillis, emits TimedOutBackoff (driving
// Reconnecting back to Connecting), and tears down whenever the Machine
// leaves Reconnecting.

const subscriptions = Subscription.make<AppModel, ConnectionMessage>()(
  entry => ({
    backoffTimer: entry(
      { maybeDelayMillis: Schema.Option(Schema.Number) },
      {
        modelToDependencies: model => ({
          maybeDelayMillis: Match.value(model.connection).pipe(
            Match.tag('Reconnecting', ({ delayMillis }) =>
              Option.some(delayMillis),
            ),
            Match.orElse(() => Option.none()),
          ),
        }),
        dependenciesToStream: ({ maybeDelayMillis }) =>
          Option.match(maybeDelayMillis, {
            onNone: () => Stream.empty,
            onSome: delayMillis =>
              Stream.fromEffect(
                Effect.as(
                  Effect.sleep(Duration.millis(delayMillis)),
                  ConnectionMessage.TimedOutBackoff(),
                ),
              ),
          }),
      },
    ),
  }),
)

// TYPE-LEVEL GUARANTEES

const narrowingMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: ConnectionState.Disconnected(),
  states: {
    Connecting: {
      on: {
        SocketErrored: [
          when(
            connectingToMaybeSocketErrorTags,
            'Failed',
            ({ state, message, guardValue }) => {
              const sourceTag: 'Connecting' = guardValue.sourceTag
              const messageTag: 'SocketErrored' = guardValue.messageTag

              return {
                model: ConnectionState.Failed({
                  attemptCount: state.attemptCount,
                  reason: `${sourceTag} ${messageTag} ${message.reason}`,
                }),
              }
            },
          ),
        ],
      },
    },
  },
})

const guardValueMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: ConnectionState.Disconnected(),
  states: {
    Connecting: {
      on: {
        SocketErrored: [
          when(
            connectingToMaybeNextAttempt,
            'Reconnecting',
            ({ state, guardValue }) => ({
              model: ConnectionState.Reconnecting({
                attemptCount: guardValue.nextAttemptCount,
                delayMillis: backoffDelayMillis(state.attemptCount),
              }),
            }),
          ),
        ],
      },
    },
  },
})

const booleanGuardMachine = define({
  state: ConnectionState,
  message: ConnectionMessage,
})({
  initial: ConnectionState.Disconnected(),
  states: {
    Connecting: {
      on: {
        SocketErrored: [
          when(
            state => state.attemptCount < MAX_CONNECT_ATTEMPTS,
            'Reconnecting',
            ({ state }) => ({
              model: ConnectionState.Reconnecting({
                attemptCount: state.attemptCount,
                delayMillis: backoffDelayMillis(state.attemptCount),
              }),
            }),
          ),
          otherwise(
            to('Failed', ({ state, message }) => ({
              model: ConnectionState.Failed({
                attemptCount: state.attemptCount,
                reason: message.reason,
              }),
            })),
          ),
        ],
      },
    },
  },
})

const RemoteDataContext = Schema.Struct({
  shouldSucceed: Schema.Boolean,
  data: Schema.String,
  errorPrefix: Schema.String,
})
type RemoteDataContext = typeof RemoteDataContext.Type

const contextualRemoteDataMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
  context: RemoteDataContext,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: [
          when(
            (state, message, context) => {
              expectTypeOf(state).toEqualTypeOf<typeof RemoteData.Idle.Type>()
              expectTypeOf(message).toEqualTypeOf<
                typeof RemoteDataMessage.ClickedFetch.Type
              >()
              expectTypeOf(context).toEqualTypeOf<RemoteDataContext>()

              if (context.shouldSucceed) {
                return Option.some(
                  `${state._tag}:${message._tag}:${context.data}`,
                )
              } else {
                return Option.none()
              }
            },
            'Ok',
            ({ state, message, guardValue, context }) => {
              expectTypeOf(state).toEqualTypeOf<typeof RemoteData.Idle.Type>()
              expectTypeOf(message).toEqualTypeOf<
                typeof RemoteDataMessage.ClickedFetch.Type
              >()
              expectTypeOf(guardValue).toEqualTypeOf<string>()
              expectTypeOf(context).toEqualTypeOf<RemoteDataContext>()

              return {
                model: RemoteData.Ok({
                  data: `${guardValue}:${context.data}`,
                }),
              }
            },
          ),
          otherwise(
            to('Error', ({ context }) => ({
              model: RemoteData.Error({
                error: `${context.errorPrefix}: unavailable`,
              }),
            })),
          ),
        ],
      },
    },
    Error: {
      on: {
        ClickedRetry: to('Ok', input => ({
          model: RemoteData.Ok({
            data: `${globalThis.String(Object.hasOwn(input, 'context'))}:${input.context.data}`,
          }),
        })),
      },
    },
  },
})

const contextFreeInputShapeMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: to('Ok', input => {
          if (false) {
            // @ts-expect-error context-free Edge inputs have no context field
            expectTypeOf(input.context).toBeNever()
          }

          return {
            model: RemoteData.Ok({
              data: globalThis.String(Object.hasOwn(input, 'context')),
            }),
          }
        }),
      },
    },
  },
})

const contextFreeGuardArityMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: [
          when(
            (...guardArguments) => guardArguments.length === 2,
            'Loading',
            () => ({ model: RemoteData.Loading() }),
          ),
        ],
      },
    },
  },
})

const voidContextMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
  context: Schema.Void,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: to('Loading', ({ context }) => {
          expectTypeOf(context).toEqualTypeOf<void>()

          return { model: RemoteData.Loading() }
        }),
      },
    },
  },
})

const anyContextMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
  context: Schema.Any,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: to('Loading', ({ context }) => {
          expectTypeOf(context).toBeAny()

          return { model: RemoteData.Loading() }
        }),
      },
    },
  },
})

const neverContextMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
  context: Schema.Never,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: to('Loading', ({ context }) => {
          expectTypeOf(context).toBeNever()

          return { model: RemoteData.Loading() }
        }),
      },
    },
  },
})

const wrongVariantMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        // @ts-expect-error the handler's model must be the RemoteData.Loading variant named by the target tag
        ClickedFetch: to('Loading', () => ({ model: RemoteData.Idle() })),
      },
    },
  },
})

const wrongTargetTagMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        // @ts-expect-error 'Loadingg' is not a state tag
        ClickedFetch: to('Loadingg', () => ({ model: RemoteData.Loading() })),
      },
    },
  },
})

const unknownStateTagMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    // @ts-expect-error 'Idl' is not a state tag
    Idl: {
      on: {},
    },
  },
})

const unknownMessageTagMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        // @ts-expect-error 'ClickedFetchh' is not a Message tag
        ClickedFetchh: to('Loading', () => ({ model: RemoteData.Loading() })),
      },
    },
  },
})

const shadowedGuardMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    Idle: {
      on: {
        ClickedFetch: [
          otherwise(to('Loading', () => ({ model: RemoteData.Loading() }))),
          when(
            (_state, message) => Option.some(message),
            'Ok',
            () => ({ model: RemoteData.Ok({ data: 'unreachable' }) }),
          ),
        ],
      },
    },
  },
})

const shadowedUnderUnreachableSourceMachine = define({
  state: RemoteData,
  message: RemoteDataMessage,
})({
  initial: RemoteData.Idle(),
  states: {
    Error: {
      on: {
        ClickedRetry: [
          otherwise(to('Loading', () => ({ model: RemoteData.Loading() }))),
          when(
            (_state, message) => Option.some(message),
            'Ok',
            () => ({ model: RemoteData.Ok({ data: 'unreachable' }) }),
          ),
        ],
      },
    },
  },
})

const DelimiterCollisionState = defineTaggedUnion({
  'A|B': {},
  A: {},
  Target0: {},
  Target1: {},
})

const DelimiterCollisionMessage = defineMessageUnion({
  C: {},
  'B|C': {},
})

const delimiterCollisionMachine = define({
  state: DelimiterCollisionState,
  message: DelimiterCollisionMessage,
})({
  initial: DelimiterCollisionState.A(),
  states: {
    'A|B': {
      on: {
        C: [
          otherwise(
            to('Target0', () => ({
              model: DelimiterCollisionState.Target0(),
            })),
          ),
        ],
      },
    },
    A: {
      on: {
        'B|C': [
          when(
            () => false,
            'Target0',
            () => ({ model: DelimiterCollisionState.Target0() }),
          ),
          when(
            () => true,
            'Target1',
            () => ({ model: DelimiterCollisionState.Target1() }),
          ),
        ],
      },
    },
  },
})

const PlainIdle = Schema.Struct({ _tag: Schema.Literal('PlainIdle') })
const PlainActive = Schema.Struct({ _tag: Schema.Literal('PlainActive') })

const PlainState = Schema.Union([PlainIdle, PlainActive])
type PlainState = typeof PlainState.Type

const plainTagMachine = define({
  state: PlainState,
  message: RemoteDataMessage,
})({
  initial: { _tag: 'PlainIdle' },
  states: {
    PlainIdle: {
      on: {
        ClickedFetch: to('PlainActive', () => ({
          model: { _tag: 'PlainActive' },
        })),
      },
    },
  },
})

const NestedState = defineTaggedUnion({
  NestedIdle: {},
  NestedLoading: {},
  NestedError: { error: Schema.String },
  NestedOk: { data: Schema.String },
})
const NestedSettled = NestedState.subset(['NestedError', 'NestedOk'])
const NestedActive = Schema.Union([NestedState.NestedLoading, NestedSettled])
const NestedStateSchema = Schema.Union([NestedState.NestedIdle, NestedActive])
type NestedStateSchema = typeof NestedStateSchema.Type

const nestedUnionMachine = define({
  state: NestedStateSchema,
  message: RemoteDataMessage,
})({
  initial: NestedState.NestedIdle(),
  states: {
    NestedIdle: {
      on: {
        ClickedFetch: to('NestedLoading', () => ({
          model: NestedState.NestedLoading(),
        })),
      },
    },
    NestedLoading: {
      on: {
        SucceededFetch: to('NestedOk', ({ message }) => ({
          model: NestedState.NestedOk({ data: message.data }),
        })),
      },
    },
    NestedOk: {
      on: {
        ClickedRetry: to('NestedIdle', () => ({
          model: NestedState.NestedIdle(),
        })),
      },
    },
  },
})

const UntaggedMember = Schema.Struct({ _tag: Schema.String })
const UntaggedState = Schema.Union([PlainIdle, UntaggedMember])

// REQUIREMENTS

type UploadsShape = Readonly<{ presign: Effect.Effect<string> }>

class UploadsClient extends Context.Service<UploadsClient, UploadsShape>()(
  'UploadsClient',
) {}

type SaveShape = Readonly<{ save: Effect.Effect<string> }>

class SaveClient extends Context.Service<SaveClient, SaveShape>()(
  'SaveClient',
) {}

const PRESIGNED_URL = 'https://uploads.example.test/presigned'
const PERSISTED_ID = 'record-1'

const SubmitState = defineTaggedUnion({
  Idle: {},
  Presigning: {},
  Persisting: {},
  Submitted: {},
})
type SubmitState = typeof SubmitState.Type

const SubmitMessage = defineMessageUnion({
  ClickedSubmit: {},
  SucceededPresign: { url: Schema.String },
  SucceededPersist: { id: Schema.String },
})
type SubmitMessage = typeof SubmitMessage.Type

const Presign = Command.define('Presign', {
  messages: [SubmitMessage.SucceededPresign],
  execute: Effect.gen(function* () {
    const client = yield* UploadsClient
    const url = yield* client.presign
    return SubmitMessage.SucceededPresign({ url })
  }),
})

const Persist = Command.define('Persist', {
  messages: [SubmitMessage.SucceededPersist],
  execute: Effect.gen(function* () {
    const client = yield* SaveClient
    const id = yield* client.save
    return SubmitMessage.SucceededPersist({ id })
  }),
})

const SubmitContext = Schema.Struct({ shouldSubmit: Schema.Boolean })
type SubmitContext = typeof SubmitContext.Type

const inferredRequirementsMachine = define({
  state: SubmitState,
  message: SubmitMessage,
})({
  initial: SubmitState.Idle(),
  states: {
    Idle: {
      on: {
        ClickedSubmit: to('Presigning', () => ({
          model: SubmitState.Presigning(),
          commands: [Presign()],
        })),
      },
    },
  },
})

const inferredContextualRequirementsMachine = define({
  state: SubmitState,
  message: SubmitMessage,
  context: SubmitContext,
})({
  initial: SubmitState.Idle(),
  states: {
    Idle: {
      on: {
        ClickedSubmit: [
          when(
            (_state, _message, context) => context.shouldSubmit,
            'Presigning',
            ({ context }) => {
              expectTypeOf(context).toEqualTypeOf<SubmitContext>()

              return {
                model: SubmitState.Presigning(),
                commands: [Presign()],
              }
            },
          ),
          otherwise(to('Idle', () => ({ model: SubmitState.Idle() }))),
        ],
      },
    },
  },
})

const inferredGuardRequirementsMachine = define({
  state: SubmitState,
  message: SubmitMessage,
})({
  initial: SubmitState.Idle(),
  states: {
    Idle: {
      on: {
        ClickedSubmit: [
          when(
            () => true,
            'Presigning',
            () => ({
              model: SubmitState.Presigning(),
              commands: [Presign()],
            }),
          ),
          otherwise(to('Idle', () => ({ model: SubmitState.Idle() }))),
        ],
      },
    },
  },
})

const inferredOtherwiseRequirementsMachine = define({
  state: SubmitState,
  message: SubmitMessage,
})({
  initial: SubmitState.Idle(),
  states: {
    Idle: {
      on: {
        ClickedSubmit: [
          when(
            () => false,
            'Submitted',
            () => ({ model: SubmitState.Submitted() }),
          ),
          otherwise(
            to('Presigning', () => ({
              model: SubmitState.Presigning(),
              commands: [Presign()],
            })),
          ),
        ],
      },
    },
  },
})

const explicitRequirementsMachine = define({
  state: SubmitState,
  message: SubmitMessage,
})<UploadsClient | SaveClient>({
  initial: SubmitState.Idle(),
  states: {
    Idle: {
      on: {
        ClickedSubmit: to('Presigning', () => ({
          model: SubmitState.Presigning(),
          commands: [Presign()],
        })),
      },
    },
    Presigning: {
      on: {
        SucceededPresign: [
          when(
            () => true,
            'Persisting',
            () => ({
              model: SubmitState.Persisting(),
              commands: [Persist()],
            }),
          ),
          otherwise(to('Idle', () => ({ model: SubmitState.Idle() }))),
        ],
      },
    },
    Persisting: {
      on: {
        SucceededPersist: to('Submitted', () => ({
          model: SubmitState.Submitted(),
        })),
      },
    },
  },
})

const explicitContextualRequirementsMachine = define({
  state: SubmitState,
  message: SubmitMessage,
  context: SubmitContext,
})<UploadsClient | SaveClient>({
  initial: SubmitState.Idle(),
  states: {
    Idle: {
      on: {
        ClickedSubmit: to('Presigning', () => ({
          model: SubmitState.Presigning(),
          commands: [Presign()],
        })),
      },
    },
    Presigning: {
      on: {
        SucceededPresign: to('Persisting', () => ({
          model: SubmitState.Persisting(),
          commands: [Persist()],
        })),
      },
    },
  },
})

// TESTS

describe('remote data machine', () => {
  it('starts at the initial state with the full tag set from the Schema', () => {
    expect(remoteDataMachine.initial).toStrictEqual(RemoteData.Idle())
    expect(remoteDataMachine.stateTags).toEqual([
      'Idle',
      'Loading',
      'Error',
      'Ok',
    ])
  })

  it('transitions along the obvious edges', () => {
    const fetchClick = remoteDataMachine.transition(
      RemoteData.Idle(),
      RemoteDataMessage.ClickedFetch(),
    )
    expectTypeOf(fetchClick).toEqualTypeOf<
      Update.Return<RemoteData, RemoteDataMessage>
    >()
    expect(fetchClick.model).toStrictEqual(RemoteData.Loading())

    const fetchSuccess = remoteDataMachine.transition(
      RemoteData.Loading(),
      RemoteDataMessage.SucceededFetch({ data: 'payload' }),
    )
    expect(fetchSuccess.model).toStrictEqual(RemoteData.Ok({ data: 'payload' }))

    const fetchFailure = remoteDataMachine.transition(
      RemoteData.Loading(),
      RemoteDataMessage.FailedFetch({ error: 'boom' }),
    )
    expect(fetchFailure.model).toStrictEqual(
      RemoteData.Error({ error: 'boom' }),
    )

    const fetchRetry = remoteDataMachine.transition(
      RemoteData.Error({ error: 'boom' }),
      RemoteDataMessage.ClickedRetry(),
    )
    expect(fetchRetry.model).toStrictEqual(RemoteData.Loading())
  })

  it('reports unmatched messages as Ignored without changing state', () => {
    const idle = RemoteData.Idle()
    const result = remoteDataMachine.step(
      idle,
      RemoteDataMessage.ClickedRetry(),
    )

    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Idle',
      messageTag: 'ClickedRetry',
      state: RemoteData.Idle(),
      reason: 'NotApplicable',
    })

    const ignoredRetry = remoteDataMachine.transition(
      idle,
      RemoteDataMessage.ClickedRetry(),
    )
    expect(ignoredRetry).toEqual({ model: idle })
    expect(Object.hasOwn(ignoredRetry, 'commands')).toBe(false)
  })

  it('exposes the edge set as data', () => {
    expect(remoteDataMachine.edges).toEqual([
      {
        from: 'Idle',
        messageTag: 'ClickedFetch',
        target: 'Loading',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Loading',
        messageTag: 'SucceededFetch',
        target: 'Ok',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Loading',
        messageTag: 'FailedFetch',
        target: 'Error',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Error',
        messageTag: 'ClickedRetry',
        target: 'Loading',
        guard: { _tag: 'Unguarded' },
      },
      {
        from: 'Ok',
        messageTag: 'ClickedFetch',
        target: 'Loading',
        guard: { _tag: 'Unguarded' },
      },
    ])
  })

  it('finds every state reachable from Idle', () => {
    const reachable = remoteDataMachine.reachableFrom('Idle')
    expect(reachable).toEqual(new Set(['Idle', 'Loading', 'Error', 'Ok']))
    expect(remoteDataMachine.unreachableStates()).toEqual([])
    expect(remoteDataMachine.deadTransitions()).toEqual([])
  })

  it('emits a Mermaid state diagram', () => {
    expect(remoteDataMachine.toMermaid()).toBe(
      [
        'stateDiagram-v2',
        '  Idle',
        '  Loading',
        '  Error',
        '  Ok',
        '  [*] --> Idle',
        '  Idle --> Loading: ClickedFetch',
        '  Loading --> Ok: SucceededFetch',
        '  Loading --> Error: FailedFetch',
        '  Error --> Loading: ClickedRetry',
        '  Ok --> Loading: ClickedFetch',
      ].join('\n'),
    )
  })
})

describe('connection machine', () => {
  it('walks the happy path and emits the edge command', () => {
    const connectClick = connectionMachine.transition(
      ConnectionState.Disconnected(),
      ConnectionMessage.ClickedConnect(),
    )
    expect(connectClick.model).toStrictEqual(
      ConnectionState.Connecting({ attemptCount: 1 }),
    )

    const result = connectionMachine.step(
      ConnectionState.Connecting({ attemptCount: 1 }),
      ConnectionMessage.SocketOpened({ sessionId: 'abc' }),
    )
    expect(result._tag).toBe('Transitioned')

    if (result._tag === 'Transitioned') {
      expect(result.from).toBe('Connecting')
      expect(result.target).toBe('Connected')
      expect(result.state).toStrictEqual(
        ConnectionState.Connected({ sessionId: 'abc' }),
      )

      const commandNames = result.commands.map(command => command.name)
      expect(commandNames).toEqual(['LogTransition'])

      const commandResults = result.commands.map(command =>
        Effect.runSync(command.effect),
      )
      expect(commandResults).toEqual([
        ConnectionMessage.CompletedLogTransition(),
      ])
    }
  })

  it('reconnects with exponential backoff below the attempt limit', () => {
    const socketError = connectionMachine.transition(
      ConnectionState.Connecting({ attemptCount: 4 }),
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(socketError.model).toStrictEqual(
      ConnectionState.Reconnecting({ attemptCount: 4, delayMillis: 2000 }),
    )

    const backoffTimeout = connectionMachine.transition(
      ConnectionState.Reconnecting({ attemptCount: 4, delayMillis: 2000 }),
      ConnectionMessage.TimedOutBackoff(),
    )
    expect(backoffTimeout.model).toStrictEqual(
      ConnectionState.Connecting({ attemptCount: 5 }),
    )
  })

  it('fails at the attempt limit via the otherwise guard', () => {
    const attemptLimitFailure = connectionMachine.transition(
      ConnectionState.Connecting({ attemptCount: 5 }),
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(attemptLimitFailure.model).toStrictEqual(
      ConnectionState.Failed({ attemptCount: 5, reason: 'boom' }),
    )
  })

  it('ignores messages with no edge from the current state', () => {
    const result = connectionMachine.step(
      ConnectionState.Disconnected(),
      ConnectionMessage.TimedOutBackoff(),
    )
    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Disconnected',
      messageTag: 'TimedOutBackoff',
      state: ConnectionState.Disconnected(),
      reason: 'NotApplicable',
    })
  })

  it('reports Suspended as unreachable and its edge as dead', () => {
    const reachable = connectionMachine.reachableFrom('Disconnected')
    expect(reachable).toEqual(
      new Set([
        'Disconnected',
        'Connecting',
        'Connected',
        'Reconnecting',
        'Failed',
      ]),
    )

    expect(connectionMachine.unreachableStates()).toEqual(['Suspended'])

    expect(connectionMachine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'Suspended',
          messageTag: 'ClickedConnect',
          target: 'Connecting',
          guard: { _tag: 'Unguarded' },
        },
        reason: 'UnreachableSource',
      },
    ])
  })

  it('clears the Suspended findings when Suspended is an extra walk root', () => {
    expect(connectionMachine.unreachableStates(['Suspended'])).toEqual([])
    expect(connectionMachine.deadTransitions(['Suspended'])).toEqual([])
  })

  it('adds extra roots to the walk without dropping initial as a root', () => {
    expect(extraRootsMachine.reachableFrom('Disconnected')).toEqual(
      new Set(['Disconnected', 'Connecting']),
    )
    expect(extraRootsMachine.reachableFrom('Suspended')).toEqual(
      new Set(['Suspended', 'Failed']),
    )

    expect(extraRootsMachine.unreachableStates()).toEqual([
      'Connected',
      'Reconnecting',
      'Failed',
      'Suspended',
    ])
    expect(extraRootsMachine.unreachableStates(['Suspended'])).toEqual([
      'Connected',
      'Reconnecting',
    ])

    expect(extraRootsMachine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'Suspended',
          messageTag: 'SocketErrored',
          target: 'Failed',
          guard: { _tag: 'Unguarded' },
        },
        reason: 'UnreachableSource',
      },
    ])
    expect(extraRootsMachine.deadTransitions(['Suspended'])).toEqual([])
  })

  it('emits a Mermaid state diagram with guard labels', () => {
    expect(connectionMachine.toMermaid()).toBe(
      [
        'stateDiagram-v2',
        '  Disconnected',
        '  Connecting',
        '  Connected',
        '  Reconnecting',
        '  Failed',
        '  Suspended',
        '  [*] --> Disconnected',
        '  Disconnected --> Connecting: ClickedConnect',
        '  Connecting --> Connected: SocketOpened',
        '  Connecting --> Reconnecting: SocketErrored [when 1]',
        '  Connecting --> Failed: SocketErrored [otherwise]',
        '  Connected --> Reconnecting: SocketClosed',
        '  Connected --> Disconnected: ClickedDisconnect',
        '  Reconnecting --> Connecting: TimedOutBackoff',
        '  Reconnecting --> Disconnected: ClickedDisconnect',
        '  Failed --> Connecting: ClickedConnect',
        '  Suspended --> Connecting: ClickedConnect',
      ].join('\n'),
    )
  })
})

describe('guard lists', () => {
  it('fires a boolean guard on true and falls through to otherwise on false', () => {
    const belowLimitSocketError = booleanGuardMachine.transition(
      ConnectionState.Connecting({ attemptCount: 2 }),
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(belowLimitSocketError.model).toStrictEqual(
      ConnectionState.Reconnecting({ attemptCount: 2, delayMillis: 500 }),
    )

    const atLimitSocketError = booleanGuardMachine.transition(
      ConnectionState.Connecting({ attemptCount: MAX_CONNECT_ATTEMPTS }),
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(atLimitSocketError.model).toStrictEqual(
      ConnectionState.Failed({
        attemptCount: MAX_CONNECT_ATTEMPTS,
        reason: 'boom',
      }),
    )
  })

  it('ignores the message when every guard declines and no otherwise exists', () => {
    const atLimit = ConnectionState.Connecting({
      attemptCount: MAX_CONNECT_ATTEMPTS,
    })

    const result = guardValueMachine.step(
      atLimit,
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Connecting',
      messageTag: 'SocketErrored',
      state: atLimit,
      reason: 'GuardsFellThrough',
    })

    const declinedSocketError = guardValueMachine.transition(
      atLimit,
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(declinedSocketError).toEqual({ model: atLimit })
  })
})

describe('context', () => {
  const succeeds: RemoteDataContext = {
    shouldSucceed: true,
    data: 'payload',
    errorPrefix: 'fetch',
  }

  const fails: RemoteDataContext = {
    shouldSucceed: false,
    data: 'payload',
    errorPrefix: 'fetch',
  }

  it('passes context through guards and into the selected Edge handler', () => {
    const result = contextualRemoteDataMachine.step(
      RemoteData.Idle(),
      RemoteDataMessage.ClickedFetch(),
      succeeds,
    )

    expect(result._tag).toBe('Transitioned')
    expect(result.state).toStrictEqual(
      RemoteData.Ok({ data: 'Idle:ClickedFetch:payload:payload' }),
    )
  })

  it('passes context through an otherwise fallback', () => {
    const result = contextualRemoteDataMachine.transition(
      RemoteData.Idle(),
      RemoteDataMessage.ClickedFetch(),
      fails,
    )

    expect(result.model).toStrictEqual(
      RemoteData.Error({ error: 'fetch: unavailable' }),
    )
  })

  it('adds context to unguarded Edge inputs only when declared', () => {
    const contextualResult = contextualRemoteDataMachine.transition(
      RemoteData.Error({ error: 'offline' }),
      RemoteDataMessage.ClickedRetry(),
      succeeds,
    )
    expect(contextualResult.model).toStrictEqual(
      RemoteData.Ok({ data: 'true:payload' }),
    )

    const contextFreeResult = contextFreeInputShapeMachine.transition(
      RemoteData.Idle(),
      RemoteDataMessage.ClickedFetch(),
    )
    expect(contextFreeResult.model).toStrictEqual(
      RemoteData.Ok({ data: 'false' }),
    )
  })

  it('keeps context-free guard invocation at two arguments', () => {
    const result = contextFreeGuardArityMachine.transition(
      RemoteData.Idle(),
      RemoteDataMessage.ClickedFetch(),
    )

    expect(result.model).toStrictEqual(RemoteData.Loading())
  })

  it('preserves the runtime arity of context-free Machine functions', () => {
    expect(remoteDataMachine.transition).toHaveLength(2)
    expect(remoteDataMachine.step).toHaveLength(2)
  })

  it('still requires context when the Message is ignored', () => {
    const result = contextualRemoteDataMachine.step(
      RemoteData.Ok({ data: 'settled' }),
      RemoteDataMessage.ClickedRetry(),
      succeeds,
    )

    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Ok',
      messageTag: 'ClickedRetry',
      state: RemoteData.Ok({ data: 'settled' }),
      reason: 'NotApplicable',
    })
  })

  it('makes context arity part of the Machine type', () => {
    if (false) {
      // @ts-expect-error contextual transition requires its third argument
      contextualRemoteDataMachine.transition(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
      )

      // @ts-expect-error contextual step requires its third argument
      contextualRemoteDataMachine.step(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
      )

      contextualRemoteDataMachine.transition(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
        // @ts-expect-error contextual transition requires RemoteDataContext
        { shouldSucceed: true },
      )

      remoteDataMachine.transition(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
        // @ts-expect-error context-free transition accepts exactly two arguments
        succeeds,
      )

      // @ts-expect-error a declared void context still requires a third argument
      voidContextMachine.transition(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
      )

      // @ts-expect-error a declared any context still requires a third argument
      anyContextMachine.transition(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
      )
      anyContextMachine.transition(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
        { arbitrary: true },
      )

      // @ts-expect-error a declared never context still requires a third argument
      neverContextMachine.transition(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
      )
      neverContextMachine.transition(
        RemoteData.Idle(),
        RemoteDataMessage.ClickedFetch(),
        // @ts-expect-error no value satisfies a never context
        undefined,
      )

      define({ state: RemoteData, message: RemoteDataMessage })({
        initial: RemoteData.Idle(),
        states: {
          Idle: {
            on: {
              ClickedFetch: [
                when(
                  // @ts-expect-error context-free guards accept exactly two arguments
                  (_state, _message, _context) => true,
                  'Loading',
                  () => ({ model: RemoteData.Loading() }),
                ),
              ],
            },
          },
        },
      })
    }

    const voidContextResult = voidContextMachine.transition(
      RemoteData.Idle(),
      RemoteDataMessage.ClickedFetch(),
      undefined,
    )
    expect(voidContextResult.model).toStrictEqual(RemoteData.Loading())

    expect(true).toBe(true)
  })

  it('preserves existing public generic positions', () => {
    type IdleState = typeof RemoteData.Idle.Type
    type ClickedFetchMessage = typeof RemoteDataMessage.ClickedFetch.Type
    type ExpectedInput = Readonly<{
      state: IdleState
      message: ClickedFetchMessage
      guardValue: string
    }>

    expectTypeOf<
      EdgeInput<IdleState, ClickedFetchMessage, string>
    >().toEqualTypeOf<ExpectedInput>()

    const machine: Machine<RemoteData, RemoteDataMessage, never> =
      remoteDataMachine
    expect(machine.initial).toStrictEqual(RemoteData.Idle())

    const table: TransitionTable<RemoteData, RemoteDataMessage, never> = {
      Idle: {
        on: {
          ClickedFetch: to('Loading', () => ({
            model: RemoteData.Loading(),
          })),
        },
      },
    }
    expect(Object.keys(table)).toEqual(['Idle'])
  })
})

describe('ignored reasons', () => {
  it('reports a message that appears in no state entry as OutOfAlphabet', () => {
    const result = connectionMachine.step(
      ConnectionState.Disconnected(),
      ConnectionMessage.CompletedLogTransition(),
    )
    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Disconnected',
      messageTag: 'CompletedLogTransition',
      state: ConnectionState.Disconnected(),
      reason: 'OutOfAlphabet',
    })
  })

  it('reports a state with no table entry as NotApplicable when the message is in the alphabet', () => {
    const result = narrowingMachine.step(
      ConnectionState.Disconnected(),
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Disconnected',
      messageTag: 'SocketErrored',
      state: ConnectionState.Disconnected(),
      reason: 'NotApplicable',
    })
  })

  it('includes a declared empty guard list in the message alphabet', () => {
    const emptyGuardListMachine = define({
      state: ConnectionState,
      message: ConnectionMessage,
    })({
      initial: ConnectionState.Disconnected(),
      states: {
        Connecting: {
          on: { SocketErrored: [] },
        },
      },
    })

    const notApplicable = emptyGuardListMachine.step(
      ConnectionState.Disconnected(),
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(notApplicable).toEqual({
      _tag: 'Ignored',
      stateTag: 'Disconnected',
      messageTag: 'SocketErrored',
      state: ConnectionState.Disconnected(),
      reason: 'NotApplicable',
    })

    const guardsFellThrough = emptyGuardListMachine.step(
      ConnectionState.Connecting({ attemptCount: 1 }),
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(guardsFellThrough).toEqual({
      _tag: 'Ignored',
      stateTag: 'Connecting',
      messageTag: 'SocketErrored',
      state: ConnectionState.Connecting({ attemptCount: 1 }),
      reason: 'GuardsFellThrough',
    })
  })
})

describe('state tag extraction', () => {
  it('reads tags from members whose _tag is a plain Literal', () => {
    expect(plainTagMachine.stateTags).toEqual(['PlainIdle', 'PlainActive'])

    const fetchClick = plainTagMachine.transition(
      { _tag: 'PlainIdle' },
      RemoteDataMessage.ClickedFetch(),
    )
    expect(fetchClick.model).toStrictEqual({ _tag: 'PlainActive' })
  })

  it('flattens nested state unions into depth-first tag order', () => {
    expect(nestedUnionMachine.initial).toStrictEqual(NestedState.NestedIdle())
    expect(nestedUnionMachine.stateTags).toEqual([
      'NestedIdle',
      'NestedLoading',
      'NestedError',
      'NestedOk',
    ])
  })

  it('transitions into and out of a nested union member', () => {
    const fetchClick = nestedUnionMachine.transition(
      NestedState.NestedIdle(),
      RemoteDataMessage.ClickedFetch(),
    )
    expect(fetchClick.model).toStrictEqual(NestedState.NestedLoading())

    const fetchSuccess = nestedUnionMachine.transition(
      NestedState.NestedLoading(),
      RemoteDataMessage.SucceededFetch({ data: 'payload' }),
    )
    expect(fetchSuccess.model).toStrictEqual(
      NestedState.NestedOk({ data: 'payload' }),
    )

    const fetchRetry = nestedUnionMachine.transition(
      NestedState.NestedOk({ data: 'payload' }),
      RemoteDataMessage.ClickedRetry(),
    )
    expect(fetchRetry.model).toStrictEqual(NestedState.NestedIdle())
  })

  it('throws when a member is neither a nested union nor a Struct with a literal _tag', () => {
    expect(() =>
      define({ state: UntaggedState, message: RemoteDataMessage })({
        initial: { _tag: 'PlainIdle' },
        states: {},
      }),
    ).toThrow(
      'Machine.define: every member of the state union Schema must be a Struct with a literal _tag field',
    )
  })
})

describe('type-level guarantees', () => {
  it('preserves narrowing in an extracted state entry', () => {
    const loadingTransitions: StateTransitions<
      RemoteData,
      RemoteDataMessage,
      'Loading'
    > = {
      on: {
        SucceededFetch: to('Ok', ({ state, message }) => {
          expectTypeOf(state).toEqualTypeOf<typeof RemoteData.Loading.Type>()
          expectTypeOf(message).toEqualTypeOf<
            typeof RemoteDataMessage.SucceededFetch.Type
          >()

          return { model: RemoteData.Ok({ data: message.data }) }
        }),
      },
    }

    const machine = define({
      state: RemoteData,
      message: RemoteDataMessage,
    })({
      initial: RemoteData.Loading(),
      states: { Loading: loadingTransitions },
    })

    const result = machine.transition(
      RemoteData.Loading(),
      RemoteDataMessage.SucceededFetch({ data: 'ready' }),
    )

    expect(result.model).toStrictEqual(RemoteData.Ok({ data: 'ready' }))
  })

  it('narrows state and message to the table position without annotations', () => {
    const socketError = narrowingMachine.transition(
      ConnectionState.Connecting({ attemptCount: 0 }),
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(socketError.model).toStrictEqual(
      ConnectionState.Failed({
        attemptCount: 0,
        reason: 'Connecting SocketErrored boom',
      }),
    )
  })

  it('passes the guard value into the matching edge', () => {
    const socketError = guardValueMachine.transition(
      ConnectionState.Connecting({ attemptCount: 2 }),
      ConnectionMessage.SocketErrored({ reason: 'offline' }),
    )

    expect(socketError.model).toStrictEqual(
      ConnectionState.Reconnecting({ attemptCount: 3, delayMillis: 500 }),
    )
  })

  it('still constructs machines whose tables were rejected at the type level', () => {
    expect(wrongVariantMachine.initial).toStrictEqual(RemoteData.Idle())
    expect(wrongTargetTagMachine.initial).toStrictEqual(RemoteData.Idle())
    expect(unknownStateTagMachine.initial).toStrictEqual(RemoteData.Idle())
    expect(unknownMessageTagMachine.initial).toStrictEqual(RemoteData.Idle())
  })

  it('reports guards listed after otherwise as dead', () => {
    expect(shadowedGuardMachine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'Idle',
          messageTag: 'ClickedFetch',
          target: 'Ok',
          guard: { _tag: 'When', position: 1 },
        },
        reason: 'ShadowedByOtherwise',
      },
    ])
  })

  it('does not walk through guards listed after otherwise', () => {
    expect(shadowedGuardMachine.reachableFrom('Idle')).toEqual(
      new Set(['Idle', 'Loading']),
    )
    expect(shadowedGuardMachine.unreachableStates()).toEqual(['Error', 'Ok'])
  })

  it('reports a shadowed edge under an unreachable source once', () => {
    expect(shadowedUnderUnreachableSourceMachine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'Error',
          messageTag: 'ClickedRetry',
          target: 'Loading',
          guard: { _tag: 'Otherwise', position: 0 },
        },
        reason: 'UnreachableSource',
      },
      {
        edge: {
          from: 'Error',
          messageTag: 'ClickedRetry',
          target: 'Ok',
          guard: { _tag: 'When', position: 1 },
        },
        reason: 'ShadowedByOtherwise',
      },
    ])
  })

  it('keeps source and message tags distinct when they contain delimiters', () => {
    const result = delimiterCollisionMachine.step(
      DelimiterCollisionState.A(),
      DelimiterCollisionMessage['B|C'](),
    )

    expect(result._tag).toBe('Transitioned')
    expect(result.state).toStrictEqual(DelimiterCollisionState.Target1())
    expect(delimiterCollisionMachine.reachableFrom('A')).toEqual(
      new Set(['A', 'Target0', 'Target1']),
    )
    expect(delimiterCollisionMachine.deadTransitions()).toEqual([
      {
        edge: {
          from: 'A|B',
          messageTag: 'C',
          target: 'Target0',
          guard: { _tag: 'Otherwise', position: 0 },
        },
        reason: 'UnreachableSource',
      },
    ])
  })
})

describe('integration', () => {
  it('folds the machine directly into update', () => {
    const model: AppModel = {
      connection: ConnectionState.Disconnected(),
      isDebugPanelOpen: false,
    }

    const connectionUpdate = update(model, ConnectionMessage.ClickedConnect())
    expect(connectionUpdate.model.connection).toStrictEqual(
      ConnectionState.Connecting({ attemptCount: 1 }),
    )
    expect(connectionUpdate.model.isDebugPanelOpen).toBe(false)
    expect(connectionUpdate.commands ?? []).toEqual([])

    const releaseUpdate = update(model, ConnectionMessage.ReleasedSocket())
    expect(releaseUpdate.model).toBe(model)
    expect(releaseUpdate.commands ?? []).toEqual([])
  })

  it('wires the gating sketch records', () => {
    expect(Object.keys(managedResources)).toEqual(['socket'])
    expect(Object.keys(subscriptions)).toEqual(['backoffTimer'])
  })
})

describe('edge command requirements', () => {
  it('threads a requirement inferred from a single edge command into R', () => {
    const submitClick = inferredRequirementsMachine.transition(
      SubmitState.Idle(),
      SubmitMessage.ClickedSubmit(),
    )
    expect(submitClick.model).toStrictEqual(SubmitState.Presigning())

    expectTypeOf(submitClick.commands).toEqualTypeOf<
      | ReadonlyArray<Command.Command<SubmitMessage, never, UploadsClient>>
      | undefined
    >()
    expect(submitClick.commands ?? []).toHaveLength(1)

    const uploads: UploadsShape = { presign: Effect.succeed(PRESIGNED_URL) }
    const messages = (submitClick.commands ?? []).map(command =>
      Effect.runSync(
        Effect.provideService(command.effect, UploadsClient, uploads),
      ),
    )
    expect(messages).toEqual([
      SubmitMessage.SucceededPresign({ url: PRESIGNED_URL }),
    ])
  })

  it('threads a requirement inferred from a guard-list edge command', () => {
    const submitClick = inferredGuardRequirementsMachine.transition(
      SubmitState.Idle(),
      SubmitMessage.ClickedSubmit(),
    )
    expect(submitClick.model).toStrictEqual(SubmitState.Presigning())

    expectTypeOf(submitClick.commands).toEqualTypeOf<
      | ReadonlyArray<Command.Command<SubmitMessage, never, UploadsClient>>
      | undefined
    >()
    expect(submitClick.commands ?? []).toHaveLength(1)

    const uploads: UploadsShape = { presign: Effect.succeed(PRESIGNED_URL) }
    const messages = (submitClick.commands ?? []).map(command =>
      Effect.runSync(
        Effect.provideService(command.effect, UploadsClient, uploads),
      ),
    )
    expect(messages).toEqual([
      SubmitMessage.SucceededPresign({ url: PRESIGNED_URL }),
    ])
  })

  it('infers requirements independently from a declared context', () => {
    const submitClick = inferredContextualRequirementsMachine.transition(
      SubmitState.Idle(),
      SubmitMessage.ClickedSubmit(),
      { shouldSubmit: true },
    )

    expectTypeOf(submitClick.commands).toEqualTypeOf<
      | ReadonlyArray<Command.Command<SubmitMessage, never, UploadsClient>>
      | undefined
    >()
    expect(submitClick.commands ?? []).toHaveLength(1)
  })

  it('threads a requirement inferred from an otherwise fallback command', () => {
    const submitClick = inferredOtherwiseRequirementsMachine.transition(
      SubmitState.Idle(),
      SubmitMessage.ClickedSubmit(),
    )
    expect(submitClick.model).toStrictEqual(SubmitState.Presigning())

    expectTypeOf(submitClick.commands).toEqualTypeOf<
      | ReadonlyArray<Command.Command<SubmitMessage, never, UploadsClient>>
      | undefined
    >()
    expect(submitClick.commands ?? []).toHaveLength(1)

    const uploads: UploadsShape = { presign: Effect.succeed(PRESIGNED_URL) }
    const messages = (submitClick.commands ?? []).map(command =>
      Effect.runSync(
        Effect.provideService(command.effect, UploadsClient, uploads),
      ),
    )
    expect(messages).toEqual([
      SubmitMessage.SucceededPresign({ url: PRESIGNED_URL }),
    ])
  })

  it('leaves R as never when no edge command needs a service', () => {
    const fetchClick = remoteDataMachine.transition(
      RemoteData.Idle(),
      RemoteDataMessage.ClickedFetch(),
    )

    expectTypeOf(fetchClick.commands).toEqualTypeOf<
      | ReadonlyArray<Command.Command<RemoteDataMessage, never, never>>
      | undefined
    >()
    expect(fetchClick.commands ?? []).toEqual([])
  })

  it('does not collapse an edge command requirement to never', () => {
    const submitClick = inferredRequirementsMachine.transition(
      SubmitState.Idle(),
      SubmitMessage.ClickedSubmit(),
    )

    // @ts-expect-error the edge command requires UploadsClient, so R is not never
    const requiresNever: ReadonlyArray<
      Command.Command<SubmitMessage, never, never>
    > = submitClick.commands ?? []
    expect(requiresNever).toHaveLength(1)
  })

  it('accepts an explicit requirements union across edges', () => {
    const uploads: UploadsShape = { presign: Effect.succeed(PRESIGNED_URL) }
    const save: SaveShape = { save: Effect.succeed(PERSISTED_ID) }

    const submitClick = explicitRequirementsMachine.transition(
      SubmitState.Idle(),
      SubmitMessage.ClickedSubmit(),
    )
    expect(submitClick.model).toStrictEqual(SubmitState.Presigning())

    expectTypeOf(submitClick.commands).toEqualTypeOf<
      | ReadonlyArray<
          Command.Command<SubmitMessage, never, UploadsClient | SaveClient>
        >
      | undefined
    >()
    expect(submitClick.commands ?? []).toHaveLength(1)

    const presignMessages = (submitClick.commands ?? []).map(command =>
      Effect.runSync(
        command.effect.pipe(
          Effect.provideService(UploadsClient, uploads),
          Effect.provideService(SaveClient, save),
        ),
      ),
    )
    expect(presignMessages).toEqual([
      SubmitMessage.SucceededPresign({ url: PRESIGNED_URL }),
    ])

    const presignSuccess = explicitRequirementsMachine.transition(
      SubmitState.Presigning(),
      SubmitMessage.SucceededPresign({ url: PRESIGNED_URL }),
    )
    expect(presignSuccess.model).toStrictEqual(SubmitState.Persisting())

    const persistMessages = (presignSuccess.commands ?? []).map(command =>
      Effect.runSync(
        command.effect.pipe(
          Effect.provideService(UploadsClient, uploads),
          Effect.provideService(SaveClient, save),
        ),
      ),
    )
    expect(persistMessages).toEqual([
      SubmitMessage.SucceededPersist({ id: PERSISTED_ID }),
    ])
  })

  it('keeps R as the contextual definition stage generic', () => {
    const submitClick = explicitContextualRequirementsMachine.transition(
      SubmitState.Idle(),
      SubmitMessage.ClickedSubmit(),
      { shouldSubmit: true },
    )

    expectTypeOf(submitClick.commands).toEqualTypeOf<
      | ReadonlyArray<
          Command.Command<SubmitMessage, never, UploadsClient | SaveClient>
        >
      | undefined
    >()
    expect(submitClick.commands ?? []).toHaveLength(1)
  })
})
