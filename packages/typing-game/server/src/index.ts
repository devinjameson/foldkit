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
  Stream,
  Struct,
  SubscriptionRef,
  pipe,
} from 'effect'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'

import { ROOM_ID_WORDS } from './constants.js'
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
      createRoom: ({ username }) =>
        Effect.gen(function* () {
          const id = yield* Room.generateUniqueId(ROOM_ID_WORDS)
          const playerId = yield* Effect.sync(() => randomUUID())
          const player: Shared.Player = {
            id: playerId,
            username,
            position: 0,
            wpm: 0,
            accuracy: 0,
            isReady: false,
          }

          const createdAt = yield* Clock.currentTimeMillis

          const newRoom: Shared.Room = {
            id,
            players: [player],
            status: Shared.Waiting.make({}),
            createdAt,
          }

          yield* SubscriptionRef.update(roomsRef, (rooms) =>
            HashMap.set(rooms, newRoom.id, newRoom),
          )

          return newRoom
        }),

      joinRoom: ({ username, roomId }) =>
        Effect.gen(function* () {
          const playerId = yield* Effect.sync(() => randomUUID())
          const newPlayer: Shared.Player = {
            id: playerId,
            username,
            position: 0,
            wpm: 0,
            accuracy: 0,
            isReady: false,
          }

          return yield* SubscriptionRef.modifyEffect(roomsRef, (rooms) =>
            Rooms.getById(rooms, roomId).pipe(
              Effect.map((room) => {
                const updatedRoom = Struct.evolve(room, {
                  players: (players) => Array.append(players, newPlayer),
                })
                return [updatedRoom, HashMap.set(rooms, roomId, updatedRoom)] as const
              }),
            ),
          )
        }),

      getRoomById: ({ roomId }) =>
        Effect.gen(function* () {
          const rooms = yield* SubscriptionRef.get(roomsRef)
          return yield* Rooms.getById(rooms, roomId)
        }),

      subscribeToRoom: ({ roomId }) =>
        // TODO: Add playerId to payload and verify player is in room before allowing subscription
        // TODO: On stream interruption (browser close, network drop), remove player from room
        // Currently players stay in room forever after disconnect
        // TODO: On browser refresh, player loses their playerId but stays in room on server
        // Need to either persist playerId in localStorage or implement rejoin logic
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
        ),

      startGame: ({ roomId }) => {
        return gameSequence.pipe(
          Stream.mapEffect((status) =>
            // TODO: Understand this because this is cool how this is a fire and
            // forget for updating the room sref instead of waiting for it
            updateRoomStatus(roomsRef, roomId)(status).pipe(Effect.fork, Effect.asVoid),
          ),
          Stream.runDrain,
          Effect.forkDaemon,
          Effect.asVoid,
        )
      },
    }
  }),
).pipe(Layer.provide(RoomsStoreLive))

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

const COUNTDOWN_SECONDS = 3
const PLAYING_SECONDS = 30

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

const finishedStream: Stream.Stream<Shared.Finished> = Stream.make(Shared.Finished.make({}))

const gameSequence = pipe(
  Stream.tick(Duration.seconds(1)),
  Stream.zip(
    pipe(
      Chunk.make<Array.NonEmptyReadonlyArray<Stream.Stream<Shared.GameStatus>>>(
        countdownStream,
        playingStream,
        finishedStream,
      ),
      Stream.concatAll,
    ),
  ),
  Stream.map(([_, status]) => status),
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
