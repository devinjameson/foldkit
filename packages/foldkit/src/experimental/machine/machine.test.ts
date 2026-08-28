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
import { define, otherwise, to, when } from './machine.js'

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
        ClickedFetch: to('Loading', () => RemoteData.Loading()),
      },
    },
    Loading: {
      on: {
        SucceededFetch: to('Ok', ({ message }) =>
          RemoteData.Ok({ data: message.data }),
        ),
        FailedFetch: to('Error', ({ message }) =>
          RemoteData.Error({ error: message.error }),
        ),
      },
    },
    Error: {
      on: {
        ClickedRetry: to('Loading', () => RemoteData.Loading()),
      },
    },
    Ok: {
      on: {
        ClickedFetch: to('Loading', () => RemoteData.Loading()),
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
        ClickedConnect: to('Connecting', () =>
          ConnectionState.Connecting({ attemptCount: 1 }),
        ),
      },
    },
    Connecting: {
      on: {
        SocketOpened: to(
          'Connected',
          ({ message }) =>
            ConnectionState.Connected({ sessionId: message.sessionId }),
          ({ message }) => [
            LogTransition({
              description: `Opened session ${message.sessionId}`,
            }),
          ],
        ),
        SocketErrored: [
          when(
            connectingToMaybeBackoff,
            'Reconnecting',
            ({ state, guardValue }) =>
              ConnectionState.Reconnecting({
                attemptCount: state.attemptCount,
                delayMillis: guardValue.delayMillis,
              }),
          ),
          otherwise(
            to('Failed', ({ state, message }) =>
              ConnectionState.Failed({
                attemptCount: state.attemptCount,
                reason: message.reason,
              }),
            ),
          ),
        ],
      },
    },
    Connected: {
      on: {
        SocketClosed: to('Reconnecting', () =>
          ConnectionState.Reconnecting({
            attemptCount: 1,
            delayMillis: backoffDelayMillis(1),
          }),
        ),
        ClickedDisconnect: to('Disconnected', () =>
          ConnectionState.Disconnected(),
        ),
      },
    },
    Reconnecting: {
      on: {
        TimedOutBackoff: to('Connecting', ({ state }) =>
          ConnectionState.Connecting({ attemptCount: state.attemptCount + 1 }),
        ),
        ClickedDisconnect: to('Disconnected', () =>
          ConnectionState.Disconnected(),
        ),
      },
    },
    Failed: {
      on: {
        ClickedConnect: to('Connecting', () =>
          ConnectionState.Connecting({ attemptCount: 1 }),
        ),
      },
    },
    Suspended: {
      on: {
        ClickedConnect: to('Connecting', () =>
          ConnectionState.Connecting({ attemptCount: 1 }),
        ),
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

              return ConnectionState.Failed({
                attemptCount: state.attemptCount,
                reason: `${sourceTag} ${messageTag} ${message.reason}`,
              })
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
            ({ state, guardValue }) =>
              ConnectionState.Reconnecting({
                attemptCount: guardValue.nextAttemptCount,
                delayMillis: backoffDelayMillis(state.attemptCount),
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
            ({ state }) =>
              ConnectionState.Reconnecting({
                attemptCount: state.attemptCount,
                delayMillis: backoffDelayMillis(state.attemptCount),
              }),
          ),
          otherwise(
            to('Failed', ({ state, message }) =>
              ConnectionState.Failed({
                attemptCount: state.attemptCount,
                reason: message.reason,
              }),
            ),
          ),
        ],
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
        // @ts-expect-error the build function must return the RemoteData.Loading variant named by the target tag
        ClickedFetch: to('Loading', () => RemoteData.Idle()),
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
        ClickedFetch: to('Loadingg', () => RemoteData.Loading()),
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
        ClickedFetchh: to('Loading', () => RemoteData.Loading()),
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
          otherwise(to('Loading', () => RemoteData.Loading())),
          when(
            (_state, message) => Option.some(message),
            'Ok',
            () => RemoteData.Ok({ data: 'unreachable' }),
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
        ClickedFetch: to('PlainActive', () => ({ _tag: 'PlainActive' })),
      },
    },
  },
})

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

const inferredRequirementsMachine = define({
  state: SubmitState,
  message: SubmitMessage,
})({
  initial: SubmitState.Idle(),
  states: {
    Idle: {
      on: {
        ClickedSubmit: to(
          'Presigning',
          () => SubmitState.Presigning(),
          () => [Presign()],
        ),
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
            () => SubmitState.Presigning(),
            () => [Presign()],
          ),
          otherwise(to('Idle', () => SubmitState.Idle())),
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
            () => SubmitState.Submitted(),
          ),
          otherwise(
            to(
              'Presigning',
              () => SubmitState.Presigning(),
              () => [Presign()],
            ),
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
        ClickedSubmit: to(
          'Presigning',
          () => SubmitState.Presigning(),
          () => [Presign()],
        ),
      },
    },
    Presigning: {
      on: {
        SucceededPresign: [
          when(
            () => true,
            'Persisting',
            () => SubmitState.Persisting(),
            () => [Persist()],
          ),
          otherwise(to('Idle', () => SubmitState.Idle())),
        ],
      },
    },
    Persisting: {
      on: {
        SucceededPersist: to('Submitted', () => SubmitState.Submitted()),
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
    })

    const declinedSocketError = guardValueMachine.transition(
      atLimit,
      ConnectionMessage.SocketErrored({ reason: 'boom' }),
    )
    expect(declinedSocketError).toEqual({ model: atLimit })
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
})

describe('type-level guarantees', () => {
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
})
