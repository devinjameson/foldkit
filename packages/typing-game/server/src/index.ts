import { HttpMiddleware, HttpRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { RpcSerialization, RpcServer } from '@effect/rpc'
import * as Shared from '@typing-game/shared'
import { Effect, Layer, Logger } from 'effect'
import { createServer } from 'node:http'

import {
  createRoom,
  getRoomById,
  joinRoom,
  startGame,
  subscribeToRoom,
  updatePlayerProgress,
} from './handler/index.js'
import {
  ProgressByGamePlayerStore,
  ProgressByGamePlayerStoreLive,
  RoomByIdStore,
  RoomByIdStoreLive,
} from './store.js'

const RoomLive = Shared.RoomRpcs.toLayer(
  Effect.gen(function* () {
    const roomByIdRef = yield* RoomByIdStore
    const progressByGamePlayerRef = yield* ProgressByGamePlayerStore

    return {
      createRoom: createRoom(roomByIdRef),
      joinRoom: joinRoom(roomByIdRef),
      getRoomById: getRoomById(roomByIdRef),
      subscribeToRoom: subscribeToRoom(roomByIdRef, progressByGamePlayerRef),
      startGame: startGame(roomByIdRef, progressByGamePlayerRef),
      updatePlayerProgress: updatePlayerProgress(progressByGamePlayerRef),
    }
  }),
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
