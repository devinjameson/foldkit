import { HttpRouter } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Rpc, RpcGroup, RpcSerialization, RpcServer } from '@effect/rpc'
import { Effect, Layer, Schema } from 'effect'
import { createServer } from 'node:http'

class HealthRpcs extends RpcGroup.make(
  Rpc.make('health', {
    success: Schema.String,
  }),
) {}

const HealthLive = HealthRpcs.toLayer(
  Effect.succeed({
    health: () => Effect.succeed('OK'),
  }),
)

const RpcLayer = RpcServer.layer(HealthRpcs).pipe(Layer.provide(HealthLive))

const HttpProtocol = RpcServer.layerProtocolHttp({
  path: '/rpc',
}).pipe(Layer.provide(RpcSerialization.layerNdjson))

const Main = HttpRouter.Default.serve().pipe(
  Layer.provide(RpcLayer),
  Layer.provide(HttpProtocol),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3001 })),
)

NodeRuntime.runMain(Layer.launch(Main))
