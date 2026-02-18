import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { ROOM_PLAYER_SESSION_KEY } from './constant'
import { NoOp } from './message'
import { Home, Room } from './page'
import { roomRouter } from './route'
import { RoomsClient } from './rpc'

export const createRoom = (
  username: string,
): Runtime.Command<Home.Message.RoomCreated | Home.Message.RoomError> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.createRoom({ username })
    return Home.Message.RoomCreated({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll((error) => Effect.succeed(Home.Message.RoomError({ error: String(error) }))),
    Effect.provide(RoomsClient.Default),
  )

export const joinRoom = (
  username: string,
  roomId: string,
): Runtime.Command<Home.Message.RoomJoined | Home.Message.RoomError> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.joinRoom({ username, roomId })
    return Home.Message.RoomJoined({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll((error) => Effect.succeed(Home.Message.RoomError({ error: String(error) }))),
    Effect.provide(RoomsClient.Default),
  )

export const getRoomById = (
  roomId: string,
): Runtime.Command<Room.Message.RoomFetched | Room.Message.RoomNotFound> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const room = yield* client.getRoomById({ roomId })
    return Room.Message.RoomFetched({ room })
  }).pipe(
    Effect.catchAll(() => Effect.succeed(Room.Message.RoomNotFound({ roomId }))),
    Effect.provide(RoomsClient.Default),
  )

export const startGame = (roomId: string, playerId: string): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.startGame({ roomId, playerId })
    return NoOp()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(RoomsClient.Default),
  )

export const navigateToRoom = (roomId: string): Runtime.Command<NoOp> =>
  pushUrl(roomRouter.build({ roomId })).pipe(Effect.as(NoOp()))

export const savePlayerToSessionStorage = (
  session: Room.Model.RoomPlayerSession,
): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const encodeSession = S.encode(S.parseJson(Room.Model.RoomPlayerSession))
    const sessionJson = yield* encodeSession(session)
    yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
    return NoOp()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  )

export const loadSessionFromStorage = (
  roomId: string,
): Runtime.Command<Room.Message.SessionLoaded> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const maybeSessionJson = yield* store.get(ROOM_PLAYER_SESSION_KEY)

    const sessionJson = yield* maybeSessionJson
    const decodeSession = S.decode(S.parseJson(Room.Model.RoomPlayerSession))

    return yield* decodeSession(sessionJson).pipe(
      Effect.map((session) =>
        Room.Message.SessionLoaded({
          maybeSession: Option.liftPredicate(session, (session) => session.roomId === roomId),
        }),
      ),
    )
  }).pipe(
    Effect.catchAll(() =>
      Effect.succeed(Room.Message.SessionLoaded({ maybeSession: Option.none() })),
    ),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  )

export const updatePlayerProgress = (
  playerId: string,
  gameId: string,
  userGameText: string,
  charsTyped: number,
): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.updatePlayerProgress({ playerId, gameId, userText: userGameText, charsTyped })
    return NoOp()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(RoomsClient.Default),
  )

export const copyRoomIdToClipboard = (
  roomId: string,
): Runtime.Command<Room.Message.CopyRoomIdSuccess | NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(roomId),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(Room.Message.CopyRoomIdSuccess()),
    Effect.catchAll(() => Effect.succeed(NoOp())),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

export const hideRoomIdCopiedIndicator =
  (): Runtime.Command<Room.Message.HideRoomIdCopiedIndicator> =>
    Effect.sleep(COPY_INDICATOR_DURATION).pipe(Effect.as(Room.Message.HideRoomIdCopiedIndicator()))

export const clearSession = (): Runtime.Command<NoOp> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(ROOM_PLAYER_SESSION_KEY)
    return NoOp()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  )
