import { HttpMiddleware, HttpRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { RpcSerialization, RpcServer } from '@effect/rpc'
import * as Shared from '@typing-game/shared'
import {
  Array,
  Chunk,
  Clock,
  Context,
  Duration,
  Effect,
  HashMap,
  Layer,
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

export class RoomsStore extends Context.Tag('RoomsStore')<
  RoomsStore,
  SubscriptionRef.SubscriptionRef<HashMap.HashMap<string, Shared.Room>>
>() {}

const RoomsStoreLive = Layer.effect(
  RoomsStore,
  SubscriptionRef.make(HashMap.empty<string, Shared.Room>()),
)

const RoomLive = Shared.RoomRpcs.toLayer(
  Effect.gen(function* () {
    const roomsRef = yield* RoomsStore

    return {
      createRoom: ({ username }) => createRoomHandler(roomsRef, username),
      joinRoom: ({ username, roomId }) => joinRoomHandler(roomsRef, username, roomId),
      getRoomById: ({ roomId }) => getRoomByIdHandler(roomsRef, roomId),
      subscribeToRoom: ({ roomId }) => subscribeToRoomHandler(roomsRef, roomId),
      startGame: ({ roomId }) => startGameHandler(roomsRef, roomId),
    }
  }),
).pipe(Layer.provide(RoomsStoreLive))

const createRoomHandler = (
  roomsRef: SubscriptionRef.SubscriptionRef<Shared.Rooms>,
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
      createdAt,
    }

    yield* SubscriptionRef.update(roomsRef, (rooms) => HashMap.set(rooms, newRoom.id, newRoom))

    return { player, room: newRoom }
  })

const joinRoomHandler = (
  roomsRef: SubscriptionRef.SubscriptionRef<Shared.Rooms>,
  username: string,
  roomId: string,
) =>
  Effect.gen(function* () {
    const playerId = yield* Effect.sync(() => randomUUID())

    const player: Shared.Player = {
      id: playerId,
      username,
    }

    const room = yield* SubscriptionRef.modifyEffect(roomsRef, (rooms) =>
      Rooms.getById(rooms, roomId).pipe(
        Effect.map((room) => {
          const updatedRoom = Struct.evolve(room, {
            players: (players) => Array.append(players, player),
          })
          return [updatedRoom, HashMap.set(rooms, roomId, updatedRoom)] as const
        }),
      ),
    )

    return { player, room }
  })

const getRoomByIdHandler = (
  roomsRef: SubscriptionRef.SubscriptionRef<Shared.Rooms>,
  roomId: string,
) =>
  Effect.gen(function* () {
    const rooms = yield* SubscriptionRef.get(roomsRef)
    return yield* Rooms.getById(rooms, roomId)
  })

const subscribeToRoomHandler = (
  roomsRef: SubscriptionRef.SubscriptionRef<Shared.Rooms>,
  roomId: string,
) =>
  roomsRef.changes.pipe(
    Stream.mapEffect((rooms) =>
      HashMap.get(rooms, roomId).pipe(
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
  roomsRef: SubscriptionRef.SubscriptionRef<Shared.Rooms>,
  roomId: string,
) =>
  gameSequence.pipe(
    Stream.mapEffect(updateRoomStatus(roomsRef, roomId), { concurrency: 'unbounded' }),
    Stream.runDrain,
    Effect.forkDaemon,
  )

const updateRoomStatus =
  (roomsRef: SubscriptionRef.SubscriptionRef<Shared.Rooms>, roomId: string) =>
  (status: Shared.GameStatus) =>
    SubscriptionRef.updateEffect(roomsRef, (rooms) =>
      Effect.gen(function* () {
        const room = yield* Rooms.getById(rooms, roomId)
        const updatedRoom = Struct.evolve(room, { status: () => status })
        return HashMap.set(rooms, roomId, updatedRoom)
      }),
    )

const getReadyStream = generateGameText.pipe(
  Effect.map((text) => Shared.GetReady.make({ text })),
  Stream.fromEffect,
)

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
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3001 })),
)

NodeRuntime.runMain(Layer.launch(Main))
