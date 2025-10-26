import { HttpMiddleware, HttpRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { RpcSerialization, RpcServer } from '@effect/rpc'
import * as Shared from '@typing-game/shared'
import { Context, Effect, HashMap, Layer, Number, Ref, Struct } from 'effect'
import { createServer } from 'node:http'

import { ROOM_ID_WORDS } from './constants.js'
import { generateUniqueRoomId } from './roomId.js'

export class RoomsStore extends Context.Tag('RoomsStore')<
  RoomsStore,
  Ref.Ref<HashMap.HashMap<string, Shared.Room>>
>() {}

const RoomsStoreLive = Layer.effect(RoomsStore, Ref.make(HashMap.empty<string, Shared.Room>()))

const RoomLive = Shared.RoomRpcs.toLayer(
  Effect.gen(function* () {
    const roomsRef = yield* RoomsStore

    return {
      createRoom: ({ username: _username }) =>
        Effect.gen(function* () {
          const id = yield* generateUniqueRoomId(ROOM_ID_WORDS)
          const newRoom: Shared.Room = {
            id,
            currentPlayers: 1,
            status: 'Waiting',
            createdAt: new Date(),
          }

          yield* Ref.update(roomsRef, (rooms) => HashMap.set(rooms, newRoom.id, newRoom))

          return newRoom
        }),

      joinRoom: ({ username: _username, roomId }) =>
        Effect.gen(function* () {
          const rooms = yield* Ref.get(roomsRef)
          const room = yield* HashMap.get(rooms, roomId).pipe(
            Effect.mapError(() => new Shared.RoomNotFoundError({ roomId })),
          )

          const updatedRoom = Struct.evolve(room, {
            currentPlayers: Number.increment,
          })

          yield* Ref.update(roomsRef, HashMap.set(roomId, updatedRoom))

          return updatedRoom
        }),

      getRoomById: ({ roomId }) =>
        Effect.gen(function* () {
          const rooms = yield* Ref.get(roomsRef)
          return yield* HashMap.get(rooms, roomId).pipe(
            Effect.mapError(() => new Shared.RoomNotFoundError({ roomId })),
          )
        }),
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
