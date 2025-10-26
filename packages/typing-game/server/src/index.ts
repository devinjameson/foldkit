import { HttpMiddleware, HttpRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { RpcSerialization, RpcServer } from '@effect/rpc'
import * as Shared from '@typing-game/shared'
import { Array, Context, Duration, Effect, HashMap, Layer, Stream, SubscriptionRef } from 'effect'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'

import { ROOM_ID_WORDS } from './constants.js'
import { generateUniqueRoomId } from './roomId.js'

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
          const id = yield* generateUniqueRoomId(ROOM_ID_WORDS)
          const playerId = yield* Effect.sync(() => randomUUID())
          const player: Shared.Player = {
            id: playerId,
            username,
            position: 0,
            wpm: 0,
            accuracy: 0,
            isReady: false,
          }
          const newRoom: Shared.Room = {
            id,
            players: [player],
            status: 'Waiting',
            createdAt: new Date(),
          }

          yield* SubscriptionRef.update(roomsRef, (rooms) =>
            HashMap.set(rooms, newRoom.id, newRoom),
          )

          return newRoom
        }),

      joinRoom: ({ username, roomId }) =>
        Effect.gen(function* () {
          const rooms = yield* SubscriptionRef.get(roomsRef)
          const room = yield* HashMap.get(rooms, roomId).pipe(
            Effect.mapError(() => new Shared.RoomNotFoundError({ roomId })),
          )

          const playerId = yield* Effect.sync(() => randomUUID())
          const newPlayer: Shared.Player = {
            id: playerId,
            username,
            position: 0,
            wpm: 0,
            accuracy: 0,
            isReady: false,
          }

          const updatedRoom: Shared.Room = {
            ...room,
            players: Array.append(room.players, newPlayer),
          }

          yield* SubscriptionRef.update(roomsRef, HashMap.set(roomId, updatedRoom))

          return updatedRoom
        }),

      getRoomById: ({ roomId }) =>
        Effect.gen(function* () {
          const rooms = yield* SubscriptionRef.get(roomsRef)
          return yield* HashMap.get(rooms, roomId).pipe(
            Effect.mapError(() => new Shared.RoomNotFoundError({ roomId })),
          )
        }),

      subscribeToRoom: ({ roomId }) =>
        Stream.concat(
          Stream.fromEffect(
            SubscriptionRef.get(roomsRef).pipe(
              Effect.flatMap((rooms) =>
                HashMap.get(rooms, roomId).pipe(
                  Effect.mapError(() => new Shared.RoomNotFoundError({ roomId })),
                ),
              ),
            ),
          ),
          roomsRef.changes.pipe(
            Stream.mapEffect((rooms) =>
              HashMap.get(rooms, roomId).pipe(
                Effect.mapError(() => new Shared.RoomNotFoundError({ roomId })),
              ),
            ),
          ),
        ).pipe(
          Stream.throttle({
            cost: () => 1,
            duration: Duration.millis(100),
            units: 1,
          }),
        ),
    }
  }),
).pipe(Layer.provide(RoomsStoreLive))

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
