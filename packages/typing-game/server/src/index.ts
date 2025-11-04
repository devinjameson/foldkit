import { HttpMiddleware, HttpRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { RpcSerialization, RpcServer } from '@effect/rpc'
import * as Shared from '@typing-game/shared'
import {
  Array,
  Chunk,
  Clock,
  Context,
  Data,
  Duration,
  Effect,
  HashMap,
  Layer,
  Option,
  Schedule,
  Stream,
  Struct,
  SubscriptionRef,
  pipe,
} from 'effect'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'

import { ROOM_ID_WORDS } from './constants.js'
import { generateGameText } from './gameText.js'
import * as Room from './room.js'
import * as Rooms from './rooms.js'

export class RoomByIdStore extends Context.Tag('RoomByIdStore')<
  RoomByIdStore,
  SubscriptionRef.SubscriptionRef<HashMap.HashMap<string, Shared.Room>>
>() {}

export class ProgressByGamePlayerStore extends Context.Tag('ProgressByGamePlayerStore')<
  ProgressByGamePlayerStore,
  SubscriptionRef.SubscriptionRef<HashMap.HashMap<Shared.GamePlayer, Shared.PlayerProgress>>
>() {}

const RoomByIdStoreLive = Layer.effect(
  RoomByIdStore,
  SubscriptionRef.make(HashMap.empty<string, Shared.Room>()),
)

const ProgressByGamePlayerStoreLive = Layer.effect(
  ProgressByGamePlayerStore,
  SubscriptionRef.make(HashMap.empty<Shared.GamePlayer, Shared.PlayerProgress>()),
)

const RoomLive = Shared.RoomRpcs.toLayer(
  Effect.gen(function* () {
    const roomByIdRef = yield* RoomByIdStore
    const progressByGamePlayerRef = yield* ProgressByGamePlayerStore

    return {
      createRoom: ({ username }) => createRoomHandler(roomByIdRef, username),
      joinRoom: ({ username, roomId }) => joinRoomHandler(roomByIdRef, username, roomId),
      getRoomById: ({ roomId }) => getRoomByIdHandler(roomByIdRef, roomId),
      subscribeToRoom: ({ roomId }) => subscribeToRoomHandler(roomByIdRef, roomId),
      startGame: ({ roomId }) => startGameHandler(roomByIdRef, roomId),
      updatePlayerProgress: ({ playerId, gameId, userText }) =>
        updatePlayerProgressHandler(progressByGamePlayerRef, playerId, gameId, userText),
      getPlayerProgress: ({ playerId, gameId }) =>
        getPlayerProgressHandler(progressByGamePlayerRef, playerId, gameId),
    }
  }),
)

const createRoomHandler = (
  roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
  username: string,
) =>
  Effect.gen(function* () {
    const roomId = yield* Room.generateUniqueId(ROOM_ID_WORDS)
    const playerId = yield* Effect.sync(() => randomUUID())

    const player: Shared.Player = {
      id: playerId,
      username,
    }

    const createdAt = yield* Clock.currentTimeMillis

    const newRoom: Shared.Room = {
      id: roomId,
      players: [player],
      status: Shared.Waiting.make(),
      maybeGame: Option.none(),
      createdAt,
    }

    yield* SubscriptionRef.update(roomByIdRef, (roomById) =>
      HashMap.set(roomById, newRoom.id, newRoom),
    )

    return { player, room: newRoom }
  })

const joinRoomHandler = (
  roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
  username: string,
  roomId: string,
) =>
  Effect.gen(function* () {
    const playerId = yield* Effect.sync(() => randomUUID())

    const player: Shared.Player = {
      id: playerId,
      username,
    }

    const room = yield* SubscriptionRef.modifyEffect(roomByIdRef, (roomById) =>
      Rooms.getById(roomById, roomId).pipe(
        Effect.map((room) => {
          const updatedRoom = Struct.evolve(room, {
            players: (players) => Array.append(players, player),
          })
          return [updatedRoom, HashMap.set(roomById, roomId, updatedRoom)] as const
        }),
      ),
    )

    return { player, room }
  })

const getRoomByIdHandler = (
  roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
  roomId: string,
) =>
  Effect.gen(function* () {
    const roomById = yield* SubscriptionRef.get(roomByIdRef)
    return yield* Rooms.getById(roomById, roomId)
  })

const subscribeToRoomHandler = (
  roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
  roomId: string,
) =>
  roomByIdRef.changes.pipe(
    Stream.mapEffect((roomById) =>
      HashMap.get(roomById, roomId).pipe(
        Effect.mapError(() => new Shared.RoomNotFoundError({ roomId })),
      ),
    ),
    Stream.throttle({
      cost: () => 1,
      duration: Duration.millis(100),
      units: 1,
    }),
  )

const startGameHandler = (
  roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
  roomId: string,
) =>
  Effect.gen(function* () {
    const gameId = yield* Effect.sync(() => randomUUID())
    const gameText = yield* generateGameText

    const game = Shared.Game.make({
      id: gameId,
      text: gameText,
    })

    yield* updateRoom(
      roomByIdRef,
      roomId,
    )((room) => Struct.evolve(room, { maybeGame: () => Option.some(game) }))

    return yield* gameSequence.pipe(
      Stream.mapEffect(updateRoomStatus(roomByIdRef, roomId), { concurrency: 'unbounded' }),
      Stream.runDrain,
      Effect.forkDaemon,
    )
  })

const updatePlayerProgressHandler = (
  progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<
    HashMap.HashMap<Shared.GamePlayer, Shared.PlayerProgress>
  >,
  playerId: string,
  gameId: string,
  userText: string,
) =>
  Effect.gen(function* () {
    const updatedAt = yield* Clock.currentTimeMillis

    const gamePlayer = Data.struct(Shared.GamePlayer.make({ gameId, playerId }))

    const progress = Shared.PlayerProgress.make({
      playerId,
      gameId,
      userText,
      updatedAt,
    })

    yield* SubscriptionRef.update(progressByGamePlayerRef, (progressByGamePlayer) =>
      HashMap.set(progressByGamePlayer, gamePlayer, progress),
    )
  })

const getPlayerProgressHandler = (
  progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<
    HashMap.HashMap<Shared.GamePlayer, Shared.PlayerProgress>
  >,
  playerId: string,
  gameId: string,
) =>
  Effect.gen(function* () {
    const progressByGamePlayer = yield* SubscriptionRef.get(progressByGamePlayerRef)
    const gamePlayer = Data.struct(Shared.GamePlayer.make({ gameId, playerId }))
    return HashMap.get(progressByGamePlayer, gamePlayer)
  })

const updateRoom =
  (roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>, roomId: string) =>
  (f: (room: Shared.Room) => Shared.Room) =>
    SubscriptionRef.updateEffect(roomByIdRef, (roomById) =>
      Effect.gen(function* () {
        const room = yield* Rooms.getById(roomById, roomId)
        const updatedRoom = f(room)
        return HashMap.set(roomById, roomId, updatedRoom)
      }),
    )

const updateRoomStatus =
  (roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>, roomId: string) =>
  (status: Shared.GameStatus) =>
    updateRoom(roomByIdRef, roomId)(Struct.evolve({ status: () => status }))

const getReadyStream = Stream.make(Shared.GetReady.make())

const COUNTDOWN_SECONDS = 3
const PLAYING_SECONDS = 300

const descendingRange = (top: number, bottom: number) =>
  pipe(Array.range(bottom, top), Array.reverse)

const descendingRangeStream = (top: number, bottom: number) =>
  Stream.fromIterable(descendingRange(top, bottom))

const countdownStream: Stream.Stream<Shared.Countdown> = pipe(
  descendingRangeStream(COUNTDOWN_SECONDS, 1),
  Stream.map((secondsLeft) => Shared.Countdown.make({ secondsLeft })),
)

const playingStream: Stream.Stream<Shared.Playing> = pipe(
  descendingRangeStream(PLAYING_SECONDS, 1),
  Stream.map((secondsLeft) => Shared.Playing.make({ secondsLeft })),
)

const finishedStream: Stream.Stream<Shared.Finished> = Stream.make(Shared.Finished.make())

const gameSequence = pipe(
  getReadyStream,
  Stream.concat(
    Stream.concatAll(
      Chunk.make<Array.NonEmptyReadonlyArray<Stream.Stream<Shared.GameStatus>>>(
        countdownStream,
        playingStream,
        finishedStream,
      ),
    ).pipe(Stream.schedule(Schedule.fixed(Duration.seconds(1)))),
  ),
)

const RpcLayer = RpcServer.layer(Shared.RoomRpcs).pipe(Layer.provide(RoomLive))

const HttpProtocol = RpcServer.layerProtocolHttp({
  path: '/rpc',
}).pipe(Layer.provide(RpcSerialization.layerNdjson))

const Main = HttpRouter.Default.serve(HttpMiddleware.cors()).pipe(
  Layer.provide(RpcLayer),
  Layer.provide(HttpProtocol),
  Layer.provide(RoomByIdStoreLive),
  Layer.provide(ProgressByGamePlayerStoreLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3001 })),
)

NodeRuntime.runMain(Layer.launch(Main))
