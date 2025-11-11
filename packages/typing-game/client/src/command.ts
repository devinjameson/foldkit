import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Match as M, Option, Schema as S, Stream, pipe } from 'effect'
import { Runtime } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { ROOM_PLAYER_SESSION_KEY } from './constant'
import {
  BootCompleted,
  KeyPressed,
  NoOp,
  RoomCreated,
  RoomError,
  RoomJoined,
  RoomStreamError,
  RoomUpdated,
  SessionLoaded,
} from './message'
import { Message } from './message'
import { Model, RoomPlayerSession } from './model'
import { roomRouter } from './route'
import { RoomsClient } from './rpc'

export const bootSequence: Runtime.Command<BootCompleted> = Effect.sleep('2500 millis').pipe(
  Effect.as(BootCompleted.make()),
)

export const createRoom = (username: string): Runtime.Command<RoomCreated | RoomError> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.createRoom({ username })
    return RoomCreated.make({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll((error) => Effect.succeed(RoomError.make({ error: String(error) }))),
    Effect.provide(RoomsClient.Default),
  )

export const joinRoom = (
  username: string,
  roomId: string,
): Runtime.Command<RoomJoined | RoomError> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.joinRoom({ username, roomId })
    return RoomJoined.make({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll((error) => Effect.succeed(RoomError.make({ error: String(error) }))),
    Effect.provide(RoomsClient.Default),
  )

export const startGame = (roomId: string): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.startGame({ roomId })
    return NoOp.make()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp.make())),
    Effect.provide(RoomsClient.Default),
  )

export const navigateToRoom = (roomId: string): Runtime.Command<NoOp> =>
  pushUrl(roomRouter.build({ roomId })).pipe(Effect.as(NoOp.make()))

export const savePlayerToSessionStorage = (session: RoomPlayerSession): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const encodeSession = S.encode(S.parseJson(RoomPlayerSession))
    const sessionJson = yield* encodeSession(session)
    yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
    return NoOp.make()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp.make())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  )

export const loadSessionFromStorage = (roomId: string): Runtime.Command<SessionLoaded> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const maybeSessionJson = yield* store.get(ROOM_PLAYER_SESSION_KEY)

    const sessionJson = yield* maybeSessionJson
    const decodeSession = S.decode(S.parseJson(RoomPlayerSession))

    return yield* decodeSession(sessionJson).pipe(
      Effect.map((session) =>
        SessionLoaded.make({
          maybeSession: session.roomId === roomId ? Option.some(session) : Option.none(),
        }),
      ),
      Effect.catchAll(() => Effect.succeed(SessionLoaded.make({ maybeSession: Option.none() }))),
    )
  }).pipe(
    Effect.catchAll(() => Effect.succeed(SessionLoaded.make({ maybeSession: Option.none() }))),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  )

export const updatePlayerProgress = (
  playerId: string,
  gameId: string,
  userText: string,
  charsTyped: number,
): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.updatePlayerProgress({ playerId, gameId, userText, charsTyped })
    return NoOp.make()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp.make())),
    Effect.provide(RoomsClient.Default),
  )

const CommandStreamsDeps = S.Struct({
  roomSubscription: S.Option(S.Struct({ roomId: S.String, playerId: S.String })),
  keyboard: S.Struct({
    isOnSelectActionStep: S.Boolean,
    isInWaitingRoom: S.Boolean,
    roomId: S.Option(S.String),
  }),
})

export const commandStreams = Runtime.makeCommandStreams(CommandStreamsDeps)<Model, Message>({
  roomSubscription: {
    modelToDeps: (model: Model) =>
      M.value(model.route).pipe(
        M.tag('Room', ({ roomId }) =>
          Option.map(model.maybeSession, (session) => ({ roomId, playerId: session.player.id })),
        ),
        M.orElse(() => Option.none()),
      ),
    depsToStream: (maybeRoomSubscription: Option.Option<{ roomId: string; playerId: string }>) =>
      Option.match(maybeRoomSubscription, {
        onNone: () => Stream.empty,
        onSome: ({ roomId, playerId }) =>
          Effect.gen(function* () {
            const client = yield* RoomsClient
            return client.subscribeToRoom({ roomId, playerId }).pipe(
              Stream.map(({ room, maybePlayerProgress }) =>
                Effect.succeed(RoomUpdated.make({ room, maybePlayerProgress })),
              ),
              Stream.catchAll((error) =>
                Stream.make(Effect.succeed(RoomStreamError.make({ error: String(error) }))),
              ),
            )
          }).pipe(Stream.unwrap, Stream.provideLayer(RoomsClient.Default)),
      }),
  },

  keyboard: {
    modelToDeps: (model: Model) => ({
      isOnSelectActionStep: model.route._tag === 'Home' && model.homeStep._tag === 'SelectAction',
      isInWaitingRoom: Option.exists(model.maybeRoom, ({ status }) => status._tag === 'Waiting'),
      roomId: pipe(
        model.maybeRoom,
        Option.filter((room) => room.status._tag === 'Waiting'),
        Option.map((room) => room.id),
      ),
    }),
    depsToStream: (deps: { isOnSelectActionStep: boolean; isInWaitingRoom: boolean }) =>
      Stream.when(
        Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
          Stream.map((keyboardEvent) =>
            Effect.sync(() => {
              keyboardEvent.preventDefault()
              return KeyPressed.make({ key: keyboardEvent.key })
            }),
          ),
        ),
        () => deps.isOnSelectActionStep || deps.isInWaitingRoom,
      ),
  },
})
